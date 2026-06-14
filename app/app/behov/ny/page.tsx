import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

const ICONS: Record<string, typeof Zap> = {
  strom: Zap,
  mobilabonnement: Smartphone,
  forsikring: ShieldCheck,
};

export default async function NewRequestPage() {
  await requireUser(["CONSUMER"]);
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Hva vil du ha tilbud på?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Velg kategori. Du fyller ut et kort skjema og forhåndsviser hva bedriftene får se før
          noe publiseres.
        </p>
      </div>
      <div className="grid gap-3">
        {categories.map((category) => {
          const Icon = ICONS[category.slug] ?? Zap;
          return (
            <Link key={category.id} href={`/app/behov/ny/${category.slug}`} className="group">
              <Card className="transition-shadow group-hover:shadow-md">
                <CardHeader className="flex-row items-center gap-4 space-y-0">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" aria-hidden />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base">{category.name}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                  <ArrowRight
                    className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
