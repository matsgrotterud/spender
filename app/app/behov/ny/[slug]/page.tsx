import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { RequestWizard } from "@/features/consumer/request-wizard";
import type { ConsumerFormSchema } from "@/features/categories/types";

export default async function NewRequestWizardPage({ params }: { params: { slug: string } }) {
  await requireUser(["CONSUMER"]);
  const category = await db.category.findUnique({ where: { slug: params.slug } });
  if (!category || !category.isActive) notFound();

  const formSchema = category.consumerFormSchemaJson as unknown as ConsumerFormSchema;

  return (
    <RequestWizard
      categorySlug={category.slug}
      categoryName={category.name}
      fields={formSchema.fields}
    />
  );
}
