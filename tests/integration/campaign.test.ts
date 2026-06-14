import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { findMatchingRequests, estimateCampaign, runCampaign } from "@/features/business/campaign-engine";
import { sendOffer } from "@/features/offers/send-offer";
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

let orgId: string;
let ownerId: string;
let categoryId: string;
let requestIds: string[] = [];

beforeAll(async () => {
  await ensureCategories();
  const category = await db.category.findUniqueOrThrow({ where: { slug: "strom" } });
  categoryId = category.id;

  const { owner, organization } = await createTestOrg(suffix, { credits: 500 });
  orgId = organization.id;
  ownerId = owner.id;

  // Three consumers with active strøm requests.
  requestIds = [];
  for (let i = 0; i < 3; i++) {
    const consumer = await createTestConsumer(`${suffix}-c${i}`);
    const request = await createTestRequest({
      consumerId: consumer.id,
      title: `Kampanjetest ${suffix} ${i}`,
    });
    requestIds.push(request.id);
  }

  // The org has already sent a manual offer to the first request – the
  // campaign must skip it (deduplication).
  await sendOffer({
    organizationId: orgId,
    actorUserId: ownerId,
    demandRequestId: requestIds[0]!,
    title: "Manuelt tilbud før kampanje",
    summary: "Sendt manuelt for å teste deduplisering i kampanjen.",
    payload: VALID_STROM_OFFER_PAYLOAD,
  });
});

afterAll(async () => {
  await cleanupTestData();
  await db.$disconnect();
});

describe("bulk campaign engine", () => {
  it("matching excludes requests the org already offered on", async () => {
    const matches = await findMatchingRequests({
      organizationId: orgId,
      categoryId,
      criteria: {},
    });
    const matchedIds = matches.map((m) => m.id);
    expect(matchedIds).not.toContain(requestIds[0]);
    expect(matchedIds).toContain(requestIds[1]);
    expect(matchedIds).toContain(requestIds[2]);
  });

  it("estimates recipients and credit cost before sending", async () => {
    const estimate = await estimateCampaign({ organizationId: orgId, categoryId, criteria: {} });
    expect(estimate.recipientCount).toBeGreaterThanOrEqual(2);
    expect(estimate.creditCostPerRecipient).toBeGreaterThan(0);
    expect(estimate.totalCreditCost).toBe(
      estimate.recipientCount * estimate.creditCostPerRecipient,
    );
  });

  it("runs the campaign, sends offers and never double-sends on re-run", async () => {
    const campaign = await db.bulkCampaign.create({
      data: {
        organizationId: orgId,
        categoryId,
        name: `Testkampanje ${suffix}`,
        status: "DRAFT",
        targetCriteriaJson: {},
        offerTemplateJson: {
          title: "Kampanjetilbud spot",
          summary: "Spotpris uten binding – kampanjetilbud til alle som matcher.",
          payload: VALID_STROM_OFFER_PAYLOAD,
        },
        estimatedRecipientCount: 2,
        estimatedCreditCost: 6,
        createdByUserId: ownerId,
      },
    });

    const run = await runCampaign(campaign.id, ownerId);
    expect(run.ok).toBe(true);
    expect(run.sent).toBeGreaterThanOrEqual(2);
    expect(run.failed).toBe(0);

    // Each recipient got exactly one offer; request 0 was never targeted.
    for (const requestId of [requestIds[1]!, requestIds[2]!]) {
      const offers = await db.offer.findMany({
        where: { organizationId: orgId, demandRequestId: requestId },
      });
      expect(offers).toHaveLength(1);
    }

    // Re-running is refused (completed) – nothing is sent twice.
    const rerun = await runCampaign(campaign.id, ownerId);
    expect(rerun.ok).toBe(false);
    expect(rerun.sent).toBe(0);

    const offersOnOurRequests = await db.offer.count({
      where: { organizationId: orgId, demandRequestId: { in: requestIds } },
    });
    expect(offersOnOurRequests).toBe(3); // 1 manual + 2 campaign, none duplicated
  });
});
