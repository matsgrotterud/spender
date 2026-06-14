import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CampaignWizard } from "@/features/business/campaign-wizard";
import type { OfferSchema } from "@/features/categories/types";

export default async function NewCampaignPage() {
  const { organization } = await requireOrgMembership();

  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const templates = await db.offerTemplate.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <CampaignWizard
      categories={categories.map((c) => ({
        slug: c.slug,
        name: c.name,
        offerFields: (c.businessOfferSchemaJson as unknown as OfferSchema).fields,
      }))}
      templates={templates.map((t) => ({
        id: t.id,
        name: t.name,
        categorySlug: t.categorySlug,
        payload: t.payloadJson as {
          title: string;
          summary: string;
          payload: Record<string, unknown>;
        },
      }))}
    />
  );
}
