/**
 * Integration test fixtures. Creates an isolated set of users/orgs/requests
 * per test file (unique suffix) and cleans up afterwards.
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/password";
import { encryptJson } from "@/lib/encryption";
import { createPublicSnapshot } from "@/lib/privacy/snapshot";
import { CATEGORY_DEFINITIONS } from "@/features/categories/definitions";

export const db = new PrismaClient();

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function ensureCategories() {
  for (const def of CATEGORY_DEFINITIONS) {
    await db.category.upsert({
      where: { slug: def.slug },
      update: {},
      create: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        consumerFormSchemaJson: def.consumerFormSchema as never,
        businessOfferSchemaJson: def.offerSchema as never,
        publicSnapshotRulesJson: def.snapshotRules as never,
        isActive: true,
      },
    });
  }
}

export async function createTestConsumer(suffix: string) {
  const user = await db.user.create({
    data: {
      email: `test-consumer-${suffix}@test.spender.local`,
      passwordHash: await hashPassword("Test1234!"),
      role: "CONSUMER",
      status: "ACTIVE",
      consumerProfile: { create: { displayAlias: `Forbruker #T${suffix.slice(-4)}` } },
      privateProfile: {
        create: {
          encryptedPayload: encryptJson({
            fullName: "Test Testesen",
            phone: "+47 999 99 999",
            emailPreferences: { transactional: false },
          }),
        },
      },
    },
  });
  return user;
}

export async function createTestOrg(
  suffix: string,
  options?: { status?: "VERIFIED" | "PENDING_REVIEW"; credits?: number },
) {
  const owner = await db.user.create({
    data: {
      email: `test-owner-${suffix}@test.spender.local`,
      passwordHash: await hashPassword("Test1234!"),
      role: "BUSINESS_OWNER",
      status: "ACTIVE",
    },
  });
  const organization = await db.organization.create({
    data: {
      name: `Testbedrift ${suffix}`,
      orgNumber: `9${Math.floor(Math.random() * 1e8).toString().padStart(8, "0")}`,
      status: options?.status ?? "VERIFIED",
      members: { create: { userId: owner.id, role: "OWNER" } },
    },
  });
  if (options?.credits) {
    await db.creditLedger.create({
      data: {
        organizationId: organization.id,
        amount: options.credits,
        type: "GRANT",
        reason: "Testkreditter",
      },
    });
  }
  return { owner, organization };
}

export async function createTestRequest(params: {
  consumerId: string;
  categorySlug?: string;
  payload?: Record<string, unknown>;
  title?: string;
}) {
  const slug = params.categorySlug ?? "strom";
  const def = CATEGORY_DEFINITIONS.find((d) => d.slug === slug)!;
  const category = await db.category.findUniqueOrThrow({ where: { slug } });

  const payload = params.payload ?? {
    postalCode: "0571",
    dwellingType: "apartment",
    householdSizeRange: "2",
    exactAnnualKwh: 12000,
    currentContractType: "spot",
    hasElbil: true,
    hasSolar: false,
    wantsGreenEnergy: false,
    preferredContractType: "spot",
    moveInOrSwitchDate: "30d",
    acceptsDigitalInvoice: true,
  };

  const snapshot = createPublicSnapshot(
    { consumerFormSchema: def.consumerFormSchema, snapshotRules: def.snapshotRules },
    payload,
  );

  return db.demandRequest.create({
    data: {
      consumerId: params.consumerId,
      categoryId: category.id,
      title: params.title ?? `Testforespørsel ${uniqueSuffix()}`,
      status: "ACTIVE",
      publicSnapshotJson: snapshot as never,
      encryptedPrivatePayload: encryptJson(payload),
      region: snapshot.region,
      priceZone: snapshot.priceZone,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  });
}

export const VALID_STROM_OFFER_PAYLOAD = {
  monthlyFeeNok: 29,
  markupOrePerKwh: 2.5,
  contractType: "spot",
  bindingMonths: 0,
  invoiceFeeNok: 0,
  appIncluded: true,
  greenEnergyOption: false,
  estimatedMonthlyCostNok: 1100,
  cancellationTerms: "Ingen bindingstid.",
};

/** Removes everything created by integration tests (by email domain marker). */
export async function cleanupTestData() {
  const testUsers = await db.user.findMany({
    where: { email: { endsWith: "@test.spender.local" } },
    select: { id: true },
  });
  const userIds = testUsers.map((u) => u.id);
  if (userIds.length === 0) return;

  const testOrgs = await db.organization.findMany({
    where: { members: { some: { userId: { in: userIds } } } },
    select: { id: true },
  });
  const orgIds = testOrgs.map((o) => o.id);

  const requests = await db.demandRequest.findMany({
    where: { consumerId: { in: userIds } },
    select: { id: true },
  });
  const requestIds = requests.map((r) => r.id);

  await db.$transaction([
    db.bulkCampaignRecipient.deleteMany({
      where: { OR: [{ campaign: { organizationId: { in: orgIds } } }, { demandRequestId: { in: requestIds } }] },
    }),
    db.bulkCampaign.deleteMany({ where: { organizationId: { in: orgIds } } }),
    db.offerComparisonScore.deleteMany({
      where: {
        offer: {
          OR: [{ organizationId: { in: orgIds } }, { demandRequestId: { in: requestIds } }],
        },
      },
    }),
    db.message.deleteMany({ where: { conversation: { demandRequestId: { in: requestIds } } } }),
    db.conversation.deleteMany({ where: { demandRequestId: { in: requestIds } } }),
    db.offer.deleteMany({
      where: { OR: [{ organizationId: { in: orgIds } }, { demandRequestId: { in: requestIds } }] },
    }),
    db.consentGrant.deleteMany({
      where: { OR: [{ userId: { in: userIds } }, { organizationId: { in: orgIds } }] },
    }),
    db.dataAccessLog.deleteMany({
      where: {
        OR: [
          { actorUserId: { in: userIds } },
          { targetUserId: { in: userIds } },
          { organizationId: { in: orgIds } },
        ],
      },
    }),
    db.auditLog.deleteMany({
      where: { OR: [{ actorUserId: { in: userIds } }, { organizationId: { in: orgIds } }] },
    }),
    db.demandRequestVersion.deleteMany({ where: { demandRequestId: { in: requestIds } } }),
    db.demandRequest.deleteMany({ where: { id: { in: requestIds } } }),
    db.creditLedger.deleteMany({ where: { organizationId: { in: orgIds } } }),
    db.subscription.deleteMany({ where: { organizationId: { in: orgIds } } }),
    db.notification.deleteMany({ where: { userId: { in: userIds } } }),
    db.analyticsEvent.deleteMany({ where: { userId: { in: userIds } } }),
    db.analyticsEvent.deleteMany({ where: { orgId: { in: orgIds } } }),
    db.businessVerification.deleteMany({ where: { organizationId: { in: orgIds } } }),
    db.organizationMember.deleteMany({ where: { organizationId: { in: orgIds } } }),
    db.organization.deleteMany({ where: { id: { in: orgIds } } }),
    db.consumerProfile.deleteMany({ where: { userId: { in: userIds } } }),
    db.userPrivateProfile.deleteMany({ where: { userId: { in: userIds } } }),
    db.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}
