import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { EmptyState } from "@/components/ui/empty-state";
import { TemplateList } from "@/features/business/template-list";

export default async function TemplatesPage() {
  const { organization } = await requireOrgMembership();

  const templates = await db.offerTemplate.findMany({
    where: { organizationId: organization.id },
    orderBy: { createdAt: "desc" },
  });

  const categories = await db.category.findMany({
    where: { isActive: true },
    select: { slug: true, name: true },
  });
  const categoryNames = Object.fromEntries(categories.map((c) => [c.slug, c.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tilbudsmaler</h1>
        <p className="text-sm text-muted-foreground">
          Maler gjenbrukes i tilbudsbyggeren og i kampanjer. Lagre en mal ved å huke av «Lagre som
          mal» når dere sender et tilbud.
        </p>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          title="Ingen maler ennå"
          description="Send et tilbud og huk av «Lagre som mal» for å gjenbruke innholdet senere."
        />
      ) : (
        <TemplateList
          templates={templates.map((t) => ({
            id: t.id,
            name: t.name,
            categoryName: categoryNames[t.categorySlug] ?? t.categorySlug,
            createdAt: t.createdAt.toISOString(),
            payload: t.payloadJson as { title?: string; summary?: string },
          }))}
        />
      )}
    </div>
  );
}
