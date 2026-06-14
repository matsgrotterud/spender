import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { sendOffer } from "@/features/offers/send-offer";
import { getCreditBalance } from "@/lib/pricing/credits";
import {
  db,
  ensureCategories,
  createTestConsumer,
  createTestOrg,
  createTestRequest,
  cleanupTestData,
  uniqueSuffix,
  VALID_STROM_OFFER_PAYLOAD,
} from "./helpers";

const suffix = uniqueSuffix();

let consumerId: string;
let orgId: string;
let ownerId: string;
let requestId: string;

beforeAll(async () => {
  await ensureCategories();
  const consumer = await createTestConsumer(suffix);
  consumerId = consumer.id;
  const { owner, organization } = await createTestOrg(suffix, { credits: 100 });
  orgId = organization.id;
  ownerId = owner.id;
  const request = await createTestRequest({ consumerId });
  requestId = request.id;
});

afterAll(async () => {
  await cleanupTestData();
  await db.$disconnect();
});

describe("offer flow", () => {
  it("a consumer's request exposes only the public snapshot to the marketplace", async () => {
    const request = await db.demandRequest.findUniqueOrThrow({ where: { id: requestId } });
    const snapshot = JSON.stringify(request.publicSnapshotJson);
    // Private inputs must not leak into the marketplace representation.
    expect(snapshot).not.toContain("0571");
    expect(snapshot).not.toContain("12000");
    // The private payload is encrypted, not readable as JSON.
    expect(() => JSON.parse(request.encryptedPrivatePayload)).toThrow();
  });

  it("a verified business can send an offer and the credit ledger decreases", async () => {
    const balanceBefore = await getCreditBalance(orgId);
    const result = await sendOffer({
      organizationId: orgId,
      actorUserId: ownerId,
      demandRequestId: requestId,
      title: "Spotpris testtilbud",
      summary: "Spotpris uten binding, ingen gebyrer – testtilbud.",
      payload: VALID_STROM_OFFER_PAYLOAD,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.creditsSpent).toBeGreaterThan(0);

    const balanceAfter = await getCreditBalance(orgId);
    expect(balanceAfter).toBe(balanceBefore - result.creditsSpent);

    // Offer is visible to the consumer with an explainable score.
    const offer = await db.offer.findUniqueOrThrow({
      where: { id: result.offerId },
      include: { comparisonScore: true },
    });
    expect(offer.status).toBe("SENT");
    expect(offer.demandRequestId).toBe(requestId);
    expect(offer.comparisonScore?.score).toBeGreaterThanOrEqual(0);
    expect(offer.comparisonScore?.score).toBeLessThanOrEqual(100);

    // The consumer received an in-app notification.
    const notification = await db.notification.findFirst({
      where: { userId: consumerId, type: "offer_received" },
    });
    expect(notification).toBeTruthy();
  });

  it("rejects a duplicate offer from the same organization (no double charge)", async () => {
    const balanceBefore = await getCreditBalance(orgId);
    const result = await sendOffer({
      organizationId: orgId,
      actorUserId: ownerId,
      demandRequestId: requestId,
      title: "Duplikat",
      summary: "Dette tilbudet skal avvises som duplikat.",
      payload: VALID_STROM_OFFER_PAYLOAD,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("DUPLICATE");
    expect(await getCreditBalance(orgId)).toBe(balanceBefore);
  });

  it("rejects offers from unverified organizations", async () => {
    const pending = await createTestOrg(`${suffix}-p`, { status: "PENDING_REVIEW", credits: 50 });
    const result = await sendOffer({
      organizationId: pending.organization.id,
      actorUserId: pending.owner.id,
      demandRequestId: requestId,
      title: "Skal avvises",
      summary: "Bedriften er ikke godkjent ennå.",
      payload: VALID_STROM_OFFER_PAYLOAD,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("ORG_NOT_VERIFIED");
  });

  it("rejects offers that fail the category offer schema", async () => {
    const other = await createTestOrg(`${suffix}-s`, { credits: 50 });
    const result = await sendOffer({
      organizationId: other.organization.id,
      actorUserId: other.owner.id,
      demandRequestId: requestId,
      title: "Ugyldig tilbud",
      summary: "Mangler påkrevde felter i payload.",
      payload: { monthlyFeeNok: 29 },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.fieldErrors).toBeTruthy();
  });

  it("blocks sends when the organization has too few credits", async () => {
    const broke = await createTestOrg(`${suffix}-b`, { credits: 0 });
    const result = await sendOffer({
      organizationId: broke.organization.id,
      actorUserId: broke.owner.id,
      demandRequestId: requestId,
      title: "Uten kreditter",
      summary: "Denne bedriften har ingen kreditter igjen.",
      payload: VALID_STROM_OFFER_PAYLOAD,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("INSUFFICIENT_CREDITS");
  });
});
