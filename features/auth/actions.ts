"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { encryptJson } from "@/lib/encryption";
import { generateDisplayAlias } from "@/lib/utils";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { track } from "@/lib/analytics";
import { logAudit } from "@/lib/audit";
import { getBusinessRegistryProvider } from "@/lib/adapters/business-registry";
import { headers } from "next/headers";

export interface ActionResult {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const passwordSchema = z
  .string()
  .min(8, "Passordet må være minst 8 tegn")
  .regex(/[A-ZÆØÅ]/, "Passordet må ha minst én stor bokstav")
  .regex(/[0-9]/, "Passordet må ha minst ett tall");

function clientIp(): string {
  const h = headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

// ---------------------------------------------------------------------------
// Consumer registration
// ---------------------------------------------------------------------------

const consumerSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse").max(200),
  password: passwordSchema,
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Du må godta vilkårene" }),
  }),
});

export async function registerConsumer(input: {
  email: string;
  password: string;
  acceptTerms: boolean;
}): Promise<ActionResult> {
  const rate = await checkRateLimit({
    key: `register:${clientIp()}`,
    ...RATE_LIMITS.registration,
  });
  if (!rate.allowed) {
    return { ok: false, error: "For mange registreringsforsøk. Prøv igjen senere." };
  }

  const parsed = consumerSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return { ok: false, fieldErrors: { email: "E-postadressen er allerede registrert" } };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "CONSUMER",
        consumerProfile: { create: { displayAlias: generateDisplayAlias() } },
        privateProfile: {
          create: {
            encryptedPayload: encryptJson({
              emailPreferences: { transactional: true, marketing: false },
            }),
          },
        },
      },
    });
    return created;
  });

  await track("consumer_registered", { userId: user.id });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Business registration
// ---------------------------------------------------------------------------

const businessSchema = z.object({
  email: z.string().email("Ugyldig e-postadresse").max(200),
  password: passwordSchema,
  organizationName: z.string().min(2, "Oppgi bedriftsnavn").max(200),
  orgNumber: z.string().regex(/^\d{9}$/, "Organisasjonsnummer må være 9 siffer"),
  website: z.string().url("Ugyldig nettadresse").max(300).optional().or(z.literal("")),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: "Du må godta vilkårene" }),
  }),
});

export async function registerBusiness(input: {
  email: string;
  password: string;
  organizationName: string;
  orgNumber: string;
  website?: string;
  acceptTerms: boolean;
}): Promise<ActionResult> {
  const rate = await checkRateLimit({
    key: `register:${clientIp()}`,
    ...RATE_LIMITS.registration,
  });
  if (!rate.allowed) {
    return { ok: false, error: "For mange registreringsforsøk. Prøv igjen senere." };
  }

  const parsed = businessSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      fieldErrors[String(issue.path[0])] = issue.message;
    }
    return { ok: false, fieldErrors };
  }

  const email = parsed.data.email.toLowerCase().trim();
  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    return { ok: false, fieldErrors: { email: "E-postadressen er allerede registrert" } };
  }
  const existingOrg = await db.organization.findUnique({
    where: { orgNumber: parsed.data.orgNumber },
  });
  if (existingOrg) {
    return {
      ok: false,
      fieldErrors: { orgNumber: "Organisasjonsnummeret er allerede registrert hos Spender" },
    };
  }

  // Verify against Brønnøysundregistrene (open data) – best effort.
  const registry = getBusinessRegistryProvider();
  const lookup = await registry.lookup(parsed.data.orgNumber);
  if (lookup.found && lookup.isBankrupt) {
    return { ok: false, fieldErrors: { orgNumber: "Organisasjonen er registrert som konkurs" } };
  }

  const passwordHash = await hashPassword(parsed.data.password);

  const { user, organization } = await db.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        role: "BUSINESS_OWNER",
        privateProfile: {
          create: {
            encryptedPayload: encryptJson({
              emailPreferences: { transactional: true, marketing: false },
            }),
          },
        },
      },
    });
    const org = await tx.organization.create({
      data: {
        name: lookup.found && lookup.name ? lookup.name : parsed.data.organizationName,
        orgNumber: parsed.data.orgNumber,
        website: parsed.data.website || null,
        status: "PENDING_REVIEW",
        members: { create: { userId: createdUser.id, role: "OWNER" } },
        verifications: {
          create: {
            provider: lookup.found ? "BRREG" : "MANUAL",
            status: lookup.found ? "PASSED" : "NEEDS_REVIEW",
            resultJson: JSON.parse(JSON.stringify(lookup)),
            verifiedAt: lookup.found ? new Date() : null,
          },
        },
      },
    });
    return { user: createdUser, organization: org };
  });

  await logAudit({
    actorUserId: user.id,
    organizationId: organization.id,
    action: "organization.registered",
    entityType: "Organization",
    entityId: organization.id,
    after: { name: organization.name, orgNumber: organization.orgNumber },
  });
  await track("business_registered", { userId: user.id, orgId: organization.id });

  return { ok: true };
}
