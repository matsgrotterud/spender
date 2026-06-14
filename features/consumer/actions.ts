"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUserOrThrow } from "@/lib/auth/session";
import { encryptJson, decryptJson } from "@/lib/encryption";
import { createPublicSnapshot } from "@/lib/privacy/snapshot";
import { defaultRequestExpiry } from "@/lib/privacy/retention";
import { validateDynamicForm } from "@/lib/validators/category-form";
import { logAudit, logDataAccess } from "@/lib/audit";
import { track } from "@/lib/analytics";
import type {
  ConsumerFormSchema,
  PublicSnapshot,
  SnapshotRule,
} from "@/features/categories/types";
import type { Prisma } from "@prisma/client";

export interface ConsumerActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
  requestId?: string;
  snapshot?: PublicSnapshot;
  privateKeys?: string[];
}

const titleSchema = z.string().trim().min(3, "Tittelen må være minst 3 tegn").max(120);

async function getActiveCategory(slug: string) {
  const category = await db.category.findUnique({ where: { slug } });
  if (!category || !category.isActive) return null;
  return category;
}

/**
 * Validates the form payload and returns the public snapshot preview –
 * the exact data businesses will see – without persisting anything.
 */
export async function previewDemandRequest(input: {
  categorySlug: string;
  payload: Record<string, unknown>;
}): Promise<ConsumerActionResult> {
  await requireUserOrThrow(["CONSUMER"]);
  const category = await getActiveCategory(input.categorySlug);
  if (!category) return { ok: false, error: "Kategorien finnes ikke" };

  const formSchema = category.consumerFormSchemaJson as unknown as ConsumerFormSchema;
  const validation = validateDynamicForm(formSchema.fields, input.payload);
  if (!validation.success) {
    return { ok: false, fieldErrors: validation.errors };
  }

  const snapshotRules = category.publicSnapshotRulesJson as unknown as SnapshotRule[];
  const snapshot = createPublicSnapshot(
    { consumerFormSchema: formSchema, snapshotRules },
    validation.data,
  );

  const snapshotKeys = new Set(snapshot.fields.map((f) => f.key));
  const privateKeys = formSchema.fields
    .filter((f) => {
      const value = validation.data[f.key];
      return value !== undefined && value !== "" && !snapshotKeys.has(f.key);
    })
    .map((f) => f.label);

  return { ok: true, snapshot, privateKeys };
}

/** Creates and publishes a demand request after the consumer confirmed the preview. */
export async function createDemandRequest(input: {
  categorySlug: string;
  title: string;
  payload: Record<string, unknown>;
}): Promise<ConsumerActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const category = await getActiveCategory(input.categorySlug);
  if (!category) return { ok: false, error: "Kategorien finnes ikke" };

  const titleParsed = titleSchema.safeParse(input.title);
  if (!titleParsed.success) {
    return { ok: false, fieldErrors: { title: titleParsed.error.issues[0]?.message ?? "Ugyldig tittel" } };
  }

  const formSchema = category.consumerFormSchemaJson as unknown as ConsumerFormSchema;
  const validation = validateDynamicForm(formSchema.fields, input.payload);
  if (!validation.success) {
    return { ok: false, fieldErrors: validation.errors };
  }

  const snapshotRules = category.publicSnapshotRulesJson as unknown as SnapshotRule[];
  const snapshot = createPublicSnapshot(
    { consumerFormSchema: formSchema, snapshotRules },
    validation.data,
  );

  const request = await db.$transaction(async (tx) => {
    const created = await tx.demandRequest.create({
      data: {
        consumerId: user.id,
        categoryId: category.id,
        title: titleParsed.data,
        status: "ACTIVE",
        publicSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        encryptedPrivatePayload: encryptJson(validation.data),
        region: snapshot.region,
        priceZone: snapshot.priceZone,
        expiresAt: defaultRequestExpiry(),
        consentProfileJson: { consentTextVersion: "2026-06-v1", publishedSnapshot: true },
      },
    });
    await tx.demandRequestVersion.create({
      data: {
        demandRequestId: created.id,
        versionNumber: 1,
        publicSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        encryptedPrivatePayload: created.encryptedPrivatePayload,
      },
    });
    await logAudit({
      actorUserId: user.id,
      action: "demand_request.published",
      entityType: "DemandRequest",
      entityId: created.id,
      after: { title: created.title, category: category.slug },
      tx,
    });
    return created;
  });

  await track("request_created", { userId: user.id, properties: { category: category.slug } });
  await track("request_published", { userId: user.id, properties: { category: category.slug } });

  revalidatePath("/app/behov");
  return { ok: true, requestId: request.id };
}

const statusActionSchema = z.object({
  requestId: z.string().min(1),
  action: z.enum(["pause", "resume", "close"]),
});

export async function updateRequestStatus(input: {
  requestId: string;
  action: "pause" | "resume" | "close";
}): Promise<ConsumerActionResult> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const parsed = statusActionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Ugyldig forespørsel" };

  const request = await db.demandRequest.findFirst({
    where: { id: parsed.data.requestId, consumerId: user.id, deletedAt: null },
  });
  if (!request) return { ok: false, error: "Fant ikke behovet" };

  const newStatus =
    parsed.data.action === "pause" ? "PAUSED" : parsed.data.action === "resume" ? "ACTIVE" : "CLOSED";

  if (parsed.data.action === "resume" && request.status !== "PAUSED") {
    return { ok: false, error: "Kan kun gjenoppta pausede behov" };
  }

  await db.demandRequest.update({
    where: { id: request.id },
    data: { status: newStatus },
  });
  await logAudit({
    actorUserId: user.id,
    action: `demand_request.${parsed.data.action}`,
    entityType: "DemandRequest",
    entityId: request.id,
    before: { status: request.status },
    after: { status: newStatus },
  });

  revalidatePath(`/app/behov/${request.id}`);
  revalidatePath("/app/behov");
  return { ok: true };
}

/** Returns the consumer's own private payload for a request (with access log). */
export async function getOwnPrivatePayload(requestId: string): Promise<Record<string, unknown> | null> {
  const user = await requireUserOrThrow(["CONSUMER"]);
  const request = await db.demandRequest.findFirst({
    where: { id: requestId, consumerId: user.id, deletedAt: null },
  });
  if (!request) return null;
  await logDataAccess({
    actorUserId: user.id,
    targetUserId: user.id,
    demandRequestId: request.id,
    action: "VIEW_OWN_PRIVATE_PAYLOAD",
    dataScope: "private_payload",
  });
  return decryptJson<Record<string, unknown>>(request.encryptedPrivatePayload);
}
