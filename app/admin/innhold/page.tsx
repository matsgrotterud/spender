import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { FaqManager } from "@/features/admin/faq-manager";
import { cn, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function AdminContentPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const [articles, faqItems] = await Promise.all([
    db.article.findMany({ orderBy: { updatedAt: "desc" } }),
    db.faqItem.findMany({ orderBy: [{ audience: "asc" }, { sortOrder: "asc" }] }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Innhold</h1>
        <p className="text-sm text-muted-foreground">
          SEO-artikler og FAQ for den offentlige siden.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Artikler</h2>
          <Link href="/admin/innhold/artikler/ny" className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="h-4 w-4" aria-hidden /> Ny artikkel
          </Link>
        </div>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tittel</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Oppdatert</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {articles.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                    Ingen artikler ennå.
                  </TableCell>
                </TableRow>
              )}
              {articles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <Link
                      href={`/admin/innhold/artikler/${article.id}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {article.title}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{article.slug}</TableCell>
                  <TableCell className="text-sm">{article.categorySlug ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(article.updatedAt)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={article.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">FAQ</h2>
        <FaqManager
          items={faqItems.map((item) => ({
            id: item.id,
            question: item.question,
            answer: item.answer,
            audience: item.audience as "consumer" | "business" | "general",
            sortOrder: item.sortOrder,
            isActive: item.isActive,
          }))}
        />
      </section>
    </div>
  );
}
