import { NextResponse } from "next/server";
import { z } from "zod";
import { authenticateApiRequest, apiError } from "@/lib/auth/api-key";
import { db } from "@/lib/db";
import { sendOffer } from "@/features/offers/send-offer";

const createOfferSchema = z.object({
  demand_request_id: z.string().min(1),
  title: z.string().trim().min(3).max(150),
  summary: z.string().trim().min(10).max(600),
  payload: z.record(z.unknown()),
  valid_until: z.string().datetime().optional(),
  idempotency_key: z.string().max(100).optional(),
});

/** Create and send an offer. Costs credits like a dashboard send. */
export async function POST(request: Request) {
  const auth = await authenticateApiRequest(request, "write");
  if (!auth.ok) return auth.response;
  const { organization } = auth.ctx;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError(400, "invalid_json", "Forespørselskroppen er ikke gyldig JSON");
  }

  const parsed = createOfferSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "validation_error",
          message: "Ugyldige felt",
          details: parsed.error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
      },
      { status: 422 },
    );
  }

  const owner = await db.organizationMember.findFirst({
    where: { organizationId: organization.id, role: "OWNER" },
    select: { userId: true },
  });
  if (!owner) return apiError(500, "no_owner", "Bedriften mangler eier");

  const result = await sendOffer({
    organizationId: organization.id,
    actorUserId: owner.userId,
    demandRequestId: parsed.data.demand_request_id,
    title: parsed.data.title,
    summary: parsed.data.summary,
    payload: parsed.data.payload,
    validUntil: parsed.data.valid_until ? new Date(parsed.data.valid_until) : null,
    idempotencyKey: parsed.data.idempotency_key,
  });

  if (!result.ok) {
    const statusByCode: Record<string, number> = {
      NOT_FOUND: 404,
      NOT_ACTIVE: 409,
      DUPLICATE: 409,
      INSUFFICIENT_CREDITS: 402,
      ORG_NOT_VERIFIED: 403,
    };
    return NextResponse.json(
      {
        error: {
          code: (result.code ?? "offer_failed").toLowerCase(),
          message: result.error,
          details: result.fieldErrors,
        },
      },
      { status: statusByCode[result.code ?? ""] ?? 400 },
    );
  }

  return NextResponse.json(
    { offer: { id: result.offerId, creditsSpent: result.creditsSpent } },
    { status: 201 },
  );
}
