import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { CategoryEditor } from "@/features/admin/category-editor";

export default async function EditCategoryPage({ params }: { params: { id: string } }) {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const category = await db.category.findUnique({ where: { id: params.id } });
  if (!category) notFound();

  return (
    <CategoryEditor
      category={{
        id: category.id,
        slug: category.slug,
        name: category.name,
        description: category.description,
        consumerFormSchemaJson: JSON.stringify(category.consumerFormSchemaJson, null, 2),
        businessOfferSchemaJson: JSON.stringify(category.businessOfferSchemaJson, null, 2),
        publicSnapshotRulesJson: JSON.stringify(category.publicSnapshotRulesJson, null, 2),
        isActive: category.isActive,
      }}
    />
  );
}
