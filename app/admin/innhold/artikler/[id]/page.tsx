import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { ArticleEditor } from "@/features/admin/article-editor";

export default async function EditArticlePage({ params }: { params: { id: string } }) {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const [article, categories] = await Promise.all([
    db.article.findUnique({ where: { id: params.id } }),
    db.category.findMany({ select: { slug: true, name: true } }),
  ]);
  if (!article) notFound();

  return (
    <ArticleEditor
      categories={categories}
      article={{
        id: article.id,
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        categorySlug: article.categorySlug,
        status: article.status,
        seoTitle: article.seoTitle,
        seoDescription: article.seoDescription,
      }}
    />
  );
}
