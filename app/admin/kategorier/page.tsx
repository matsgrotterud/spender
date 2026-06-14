import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function AdminCategoriesPage() {
  await requireUser(["ADMIN", "SUPER_ADMIN"]);

  const categories = await db.category.findMany({
    include: { _count: { select: { demandRequests: true, offers: true } } },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Kategorier</h1>
          <p className="text-sm text-muted-foreground">
            Skjemaer, tilbudsfelt og snapshot-regler styres her – uten kodeendringer.
          </p>
        </div>
        <Link href="/admin/kategorier/ny" className={cn(buttonVariants())}>
          <Plus className="h-4 w-4" aria-hidden /> Ny kategori
        </Link>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Navn</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Forespørsler</TableHead>
              <TableHead>Tilbud</TableHead>
              <TableHead>Opprettet</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <Link
                    href={`/admin/kategorier/${category.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {category.name}
                  </Link>
                </TableCell>
                <TableCell className="font-mono text-sm">{category.slug}</TableCell>
                <TableCell>{category._count.demandRequests}</TableCell>
                <TableCell>{category._count.offers}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(category.createdAt)}
                </TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? "success" : "muted"}>
                    {category.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
