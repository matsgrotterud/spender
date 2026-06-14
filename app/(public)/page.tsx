import Link from "next/link";
import type { Metadata } from "next";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { buildMetadata } from "@/features/seo/metadata";
import {
  JsonLd,
  organizationJsonLd,
  webSiteJsonLd,
  faqJsonLd,
} from "@/features/seo/json-ld";
import {
  Zap,
  Smartphone,
  ShieldCheck,
  Lock,
  Eye,
  Handshake,
  FileText,
  MessageSquare,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { db } from "@/lib/db";

export const metadata: Metadata = buildMetadata({
  title: "Spender – Få tilbud uten å bli nedringt",
  description:
    "Beskriv behovet ditt for strøm, mobilabonnement eller forsikring og motta tilbud fra verifiserte bedrifter – uten å dele navn eller telefonnummer.",
  path: "/",
});

const HOW_IT_WORKS = [
  {
    icon: FileText,
    title: "1. Beskriv behovet ditt",
    text: "Velg kategori og svar på noen få spørsmål. Du ser nøyaktig hva bedriftene får se før du publiserer.",
  },
  {
    icon: MessageSquare,
    title: "2. Motta tilbud i Spender",
    text: "Verifiserte bedrifter sender strukturerte tilbud direkte i tjenesten. Ingen ringer deg, ingen får e-posten din.",
  },
  {
    icon: CheckCircle2,
    title: "3. Sammenlign og velg",
    text: "Sammenlign pris, vilkår og bindingstid med forklarbar poengsum. Aksepter, avslå eller still spørsmål.",
  },
  {
    icon: Handshake,
    title: "4. Del kontakt – hvis du vil",
    text: "Først når du aksepterer kan du velge å dele kontaktinformasjon med den ene bedriften du har valgt.",
  },
];

export default async function LandingPage() {
  const faqItems = await db.faqItem.findMany({
    where: { isActive: true, audience: { in: ["consumer", "general"] } },
    orderBy: { sortOrder: "asc" },
    take: 6,
  });

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webSiteJsonLd()} />
      {faqItems.length > 0 && (
        <JsonLd data={faqJsonLd(faqItems.map((f) => ({ question: f.question, answer: f.answer })))} />
      )}

      {/* Hero */}
      <section className="border-b bg-gradient-to-b from-primary/5 to-background">
        <div className="container flex flex-col items-center py-20 text-center md:py-28">
          <span className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Personvernvennlig markedsplass for tilbud
          </span>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight md:text-6xl">
            Få tilbud uten å bli <span className="text-primary">nedringt</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Beskriv hva du trenger – strøm, mobilabonnement eller forsikring – og motta
            konkrete tilbud fra verifiserte bedrifter. Bedriftene ser aldri navnet eller
            telefonnummeret ditt før du selv velger å dele det.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/registrer" className={cn(buttonVariants({ size: "lg" }))}>
              Legg inn behov
            </Link>
            <Link
              href="/bedrift"
              className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
            >
              Finn kunder som faktisk ønsker tilbud
            </Link>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            Gratis for forbrukere. Du bestemmer hvem som får kontakte deg.
          </p>
        </div>
      </section>

      {/* Categories */}
      <section className="container py-16">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Hva vil du ha tilbud på?</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/strom" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <Zap className="h-8 w-8 text-warning" aria-hidden />
                <CardTitle className="mt-2">Strøm</CardTitle>
                <CardDescription>
                  Spotpris, fastpris eller variabel? Få tilbud basert på forbruket ditt – uten å
                  oppgi målernummer eller adresse.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/mobilabonnement" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <Smartphone className="h-8 w-8 text-primary" aria-hidden />
                <CardTitle className="mt-2">Mobilabonnement</CardTitle>
                <CardDescription>
                  Beskriv databehov og antall brukere. Telefonnummeret ditt forblir privat til du
                  selv deler det.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
          <Link href="/forsikring" className="group">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardHeader>
                <ShieldCheck className="h-8 w-8 text-success" aria-hidden />
                <CardTitle className="mt-2">Forsikring</CardTitle>
                <CardDescription>
                  Innbo, bil, reise eller bolig. Forsikringsselskap ser kun en anonymisert
                  oppsummering av behovet ditt.
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y bg-card">
        <div className="container py-16">
          <h2 className="text-center text-2xl font-bold md:text-3xl">Slik fungerer det</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-4">
            {HOW_IT_WORKS.map((step) => (
              <div key={step.title} className="flex flex-col items-center text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" aria-hidden />
                </div>
                <h3 className="mt-4 font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust / privacy */}
      <section className="container py-16">
        <div className="grid items-center gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">
              Personvern er ikke et tillegg. Det er hele poenget.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Tradisjonelle anbudstjenester selger kontaktinformasjonen din til mange bedrifter
              samtidig – og så ringer alle. Spender snur modellen: bedriftene konkurrerer om deg
              med konkrete tilbud, og du sitter med kontrollen.
            </p>
            <ul className="mt-6 space-y-4">
              <li className="flex gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Spender selger ikke kontaktinformasjonen din til bedrifter.</p>
                  <p className="text-sm text-muted-foreground">
                    Navn, e-post og telefonnummer lagres kryptert og deles aldri automatisk.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">
                    Bedrifter ser kun en anonymisert oppsummering før du eventuelt deler mer.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Du forhåndsviser nøyaktig hva som blir synlig før du publiserer behovet ditt.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">Du bestemmer hvem som får kontakte deg.</p>
                  <p className="text-sm text-muted-foreground">
                    Kontaktinfo deles kun med én valgt bedrift – med samtykke du kan trekke
                    tilbake når som helst.
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-medium">
                    Du kan trekke tilbake samtykke og be om eksport eller sletting av data.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Personvernsenteret gir deg full oversikt over hvem som har sett hva.
                  </p>
                </div>
              </li>
            </ul>
          </div>
          <Card className="bg-gradient-to-br from-primary/5 to-card">
            <CardHeader>
              <CardTitle>Hva en bedrift ser</CardTitle>
              <CardDescription>Eksempel på anonymisert behovsprofil for strøm</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                {[
                  ["Hvem", "Forbruker #A82Q"],
                  ["Region", "Oslo (NO1)"],
                  ["Boligtype", "Leilighet"],
                  ["Årsforbruk", "10 000–15 000 kWh"],
                  ["Nåværende avtale", "Spotpris"],
                  ["Elbil", "Ja"],
                  ["Ønsket avtale", "Spot eller fastpris"],
                  ["Bytte", "Innen 30 dager"],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
                    <dd className="font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Ingen navn. Ingen e-post. Intet telefonnummer. Ikke noe målernummer.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Business value prop */}
      <section className="border-y bg-card">
        <div className="container py-16">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Building2 className="h-8 w-8 text-primary" aria-hidden />
                <CardTitle className="mt-2">For bedrifter</CardTitle>
                <CardDescription>
                  Slutt å kjøpe «leads» som aldri svarer. På Spender møter du kunder som aktivt
                  har bedt om tilbud i din kategori.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <p>• Strukturerte behovsprofiler med alt du trenger for å prise</p>
                <p>• Send enkelttilbud eller målrettede kampanjer</p>
                <p>• Betal med kreditter – ingen betaling for kald trafikk</p>
                <p>• API og webhooks for integrasjon med dine systemer</p>
              </CardContent>
            </Card>
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">
                Kunder som faktisk ønsker tilbudet ditt
              </h2>
              <p className="mt-4 text-muted-foreground">
                Hver forespørsel på Spender er en reell kjøpsintensjon: forbrukeren har selv
                beskrevet behovet og bedt om tilbud. Du slipper å ringe kald liste – du svarer på
                en invitasjon.
              </p>
              <div className="mt-6">
                <Link href="/bedrift" className={cn(buttonVariants({ size: "lg" }))}>
                  Les mer og registrer bedrift
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="container py-16">
        <h2 className="text-center text-2xl font-bold md:text-3xl">Ofte stilte spørsmål</h2>
        <div className="mx-auto mt-8 max-w-3xl space-y-3">
          {faqItems.map((item) => (
            <details key={item.id} className="group rounded-lg border bg-card p-4">
              <summary className="cursor-pointer list-none font-medium marker:hidden">
                {item.question}
              </summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
        <div className="mt-6 text-center">
          <Link href="/faq" className={cn(buttonVariants({ variant: "outline" }))}>
            Se alle spørsmål og svar
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-primary text-primary-foreground">
        <div className="container flex flex-col items-center py-16 text-center">
          <h2 className="text-2xl font-bold md:text-3xl">Klar til å få bedre tilbud?</h2>
          <p className="mt-3 max-w-xl text-primary-foreground/80">
            Det tar under fem minutter å legge inn et behov. Helt gratis, og du kan slette alt
            når som helst.
          </p>
          <Link
            href="/registrer"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "mt-6")}
          >
            Legg inn behov nå
          </Link>
        </div>
      </section>
    </>
  );
}
