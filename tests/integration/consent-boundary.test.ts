import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getConsentedContact, hasActiveContactGrant, CONSENT_TEXT_VERSION } from "@/lib/privacy/consent";
import {
  db,
  ensureCategories,
  createTestConsumer,
  createTestOrg,
  createTestRequest,
  cleanupTestData,
  uniqueSuffix,
} from "./helpers";

const suffix = uniqueSuffix();

let consumerId: string;
let orgAId: string;
let orgAOwnerId: string;
let orgBId: string;
let orgBOwnerId: string;
let requestId: string;

beforeAll(async () => {
  await ensureCategories();
  const consumer = await createTestConsumer(suffix);
  consumerId = consumer.id;
  const orgA = await createTestOrg(`${suffix}-a`);
  orgAId = orgA.organization.id;
  orgAOwnerId = orgA.owner.id;
  const orgB = await createTestOrg(`${suffix}-b`);
  orgBId = orgB.organization.id;
  orgBOwnerId = orgB.owner.id;
  const request = await createTestRequest({ consumerId });
  requestId = request.id;
});

afterAll(async () => {
  await cleanupTestData();
  await db.$disconnect();
});

describe("recipient-specific consent boundary", () => {
  it("returns no contact data without an active grant", async () => {
    const contact = await getConsentedContact({
      organizationId: orgAId,
      demandRequestId: requestId,
      actorUserId: orgAOwnerId,
      via: "test",
    });
    expect(contact).toBeNull();
    expect(await hasActiveContactGrant(orgAId, requestId)).toBe(false);
  });

  it("reveals only the scoped fields to the granted organization and logs the access", async () => {
    await db.consentGrant.create({
      data: {
        userId: consumerId,
        demandRequestId: requestId,
        organizationId: orgAId,
        purpose: "contact_access",
        scopeJson: { fields: ["fullName", "phone"] },
        status: "ACTIVE",
        consentTextVersion: CONSENT_TEXT_VERSION,
      },
    });

    const contact = await getConsentedContact({
      organizationId: orgAId,
      demandRequestId: requestId,
      actorUserId: orgAOwnerId,
      via: "test",
    });

    expect(contact).not.toBeNull();
    expect(contact!.fields.fullName).toBe("Test Testesen");
    expect(contact!.fields.phone).toBe("+47 999 99 999");
    // email was NOT in scope – must not be revealed.
    expect(contact!.fields.email).toBeUndefined();

    const accessLog = await db.dataAccessLog.findFirst({
      where: {
        organizationId: orgAId,
        demandRequestId: requestId,
        action: "REVEAL_CONTACT",
      },
    });
    expect(accessLog).toBeTruthy();
    expect(accessLog!.targetUserId).toBe(consumerId);
  });

  it("an unrelated organization still cannot access the contact data", async () => {
    const contact = await getConsentedContact({
      organizationId: orgBId,
      demandRequestId: requestId,
      actorUserId: orgBOwnerId,
      via: "test",
    });
    expect(contact).toBeNull();
    expect(await hasActiveContactGrant(orgBId, requestId)).toBe(false);
  });

  it("withdrawing the consent closes access for the granted organization too", async () => {
    await db.consentGrant.updateMany({
      where: { userId: consumerId, organizationId: orgAId, status: "ACTIVE" },
      data: { status: "WITHDRAWN", withdrawnAt: new Date() },
    });

    const contact = await getConsentedContact({
      organizationId: orgAId,
      demandRequestId: requestId,
      actorUserId: orgAOwnerId,
      via: "test",
    });
    expect(contact).toBeNull();
  });
});
