import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ArticleEditor } from "@/features/admin/article-editor";

export default async function NewArticlePage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);
  const categories = await db.category.findMany({ select: { slug: true, name: true } });
  return <ArticleEditor categories={categories} />;
}
