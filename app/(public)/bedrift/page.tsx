import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/features/seo/json-ld";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatNok } from "@/lib/utils";
import { db } from "@/lib/db";
import { Target, Send, BarChart3, Plug, ShieldCheck, Users } from "lucide-react";

export const metadata: Metadata = buildMetadata({
  title: "Finn kunder som faktisk ønsker tilbud",
  description:
    "Spender for bedrifter: møt forbrukere som aktivt har bedt om tilbud på strøm, mobil og forsikring. Strukturerte behovsprofiler, kampanjer, API og webhooks.",
  path: "/bedrift",
});

const FEATURES = [
  {
    icon: Target,
    title: "Reell kjøpsintensjon",
    text: "Hver forespørsel er skrevet av en forbruker som aktivt ber om tilbud i din kategori. Ingen kalde lister.",
  },
  {
    icon: Send,
    title: "Tilbud og kampanjer",
    text: "Send enkelttilbud eller målrettede bulk-kampanjer mot strukturerte kriterier – med duplikatvern og fartsgrenser.",
  },
  {
    icon: BarChart3,
    title: "Innsikt",
    text: "Se visninger, aksept-rate og kampanjeresultater. Forstå hva som vinner kundene.",
  },
  {
    icon: Plug,
    title: "API og webhooks",
    text: "Integrer Spender med CRM-et ditt: hent forespørsler, send tilbud og motta hendelser i sanntid.",
  },
  {
    icon: ShieldCheck,
    title: "Verifiserte aktører",
    text: "Alle bedrifter verifiseres mot Brønnøysundregistrene og godkjennes manuelt. Seriøse aktører, seriøs konkurranse.",
  },
  {
    icon: Users,
    title: "Team og roller",
    text: "Inviter kolleger med rollestyring: eier, administrator, medlem og leser.",
  },
];

export default async function BedriftPage() {
  const plans = await db.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { monthlyPriceNok: "asc" },
  });

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "For bedrifter", path: "/bedrift" },
        ])}
      />

      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container py-16 md:py-24">
          <div className="max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-wide text-primary">
              Spender for bedrifter
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
              Finn kunder som faktisk ønsker tilbud
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Slutt å betale for kontaktinfo til folk som ikke vil bli kontaktet. På Spender
              svarer du på konkrete forespørsler fra forbrukere med reell kjøpsintensjon – og
              konkurrerer på tilbudets innhold, ikke på hvor raskt du ringer.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/bedrift/registrer" className={cn(buttonVariants({ size: "lg" }))}>
                Registrer bedrift
              </Link>
              <Link
                href="/api-docs"
                className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
              >
                Se API-dokumentasjon
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-2xl font-bold md:text-3xl">Slik vinner du kunder på Spender</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <feature.icon className="h-6 w-6 text-primary" aria-hidden />
                <CardTitle className="mt-2 text-base">{feature.title}</CardTitle>
                <CardDescription>{feature.text}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-y bg-card">
        <div className="container py-16">
          <h2 className="text-2xl font-bold md:text-3xl">Personvern er forretningsmodellen</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Du ser anonymiserte behovsprofiler – aldri navn eller telefonnummer. Når en forbruker
            aksepterer tilbudet ditt og deler kontaktinfo, er det en kunde som har valgt deg.
            Det konverterer bedre enn noen ringeliste.
          </p>
          <div className="mt-6 grid gap-4 text-sm md:grid-cols-3">
            <div className="rounded-lg border bg-background p-4">
              <p className="font-semibold">1. Se behov</p>
              <p className="mt-1 text-muted-foreground">
                Filtrer markedsplassen på kategori, region og behovsdetaljer.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="font-semibold">2. Send tilbud</p>
              <p className="mt-1 text-muted-foreground">
                Strukturert tilbud med pris, vilkår og bindingstid. Koster kreditter.
              </p>
            </div>
            <div className="rounded-lg border bg-background p-4">
              <p className="font-semibold">3. Vinn kunden</p>
              <p className="mt-1 text-muted-foreground">
                Forbrukeren aksepterer og deler kontaktinfo med deg – og bare deg.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="container py-16">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Priser</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-muted-foreground">
          Abonnement med inkluderte kreditter. Kreditter brukes når du sender tilbud, kjører
          kampanjer eller låser opp kontaktinfo etter samtykke.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {plans.map((plan) => {
            const features = (plan.featuresJson as { highlights?: string[] }).highlights ?? [];
            return (
              <Card key={plan.id} className={plan.slug === "growth" ? "border-primary shadow-md" : ""}>
                <CardHeader>
                  {plan.slug === "growth" && <Badge className="w-fit">Mest populær</Badge>}
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-2xl font-bold">
                    {plan.monthlyPriceNok > 0 ? (
                      <>
                        {formatNok(plan.monthlyPriceNok)}
                        <span className="text-sm font-normal text-muted-foreground">/mnd</span>
                      </>
                    ) : (
                      "Kontakt oss"
                    )}
                  </p>
                </CardHeader>
                <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                  {plan.includedCredits > 0 && <p>• {plan.includedCredits} kreditter/mnd</p>}
                  <p>• {plan.maxSeats} brukere</p>
                  {features.map((f) => (
                    <p key={f}>• {f}</p>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-8 text-center">
          <Link href="/bedrift/registrer" className={cn(buttonVariants({ size: "lg" }))}>
            Kom i gang
          </Link>
        </div>
      </section>
    </>
  );
}
