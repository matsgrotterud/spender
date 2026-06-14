import type { Metadata } from "next";
import { buildMetadata } from "@/features/seo/metadata";
import { CategoryLanding } from "@/components/site/category-landing";

export const metadata: Metadata = buildMetadata({
  title: "Få forsikringstilbud anonymt – innbo, bil, reise og bolig",
  description:
    "Beskriv hva som skal forsikres og motta tilbud fra forsikringsselskap – uten å oppgi navn, adresse eller registreringsnummer før du selv vil.",
  path: "/forsikring",
});

export default function ForsikringPage() {
  return (
    <CategoryLanding
      content={{
        slug: "forsikring",
        name: "Forsikring",
        heroTitle: "Forsikringstilbud uten å utlevere deg selv",
        heroText:
          "Innbo, bil, reise, bolig eller liv: beskriv behovet med trygge kategorier. Selskapene priser ut fra en anonymisert profil – og du velger hvem som får vite hvem du er.",
        bullets: [
          "Registreringsnummer og adresse lagres kryptert og er aldri synlig for selskapene.",
          "Sammenlign premie, egenandel, dekning og unntak strukturert.",
          "Skadehistorikk oppgis som intervall – ikke detaljert historikk.",
          "Forklarbar sammenligning – ikke skjult rangering eller provisjonsstyring.",
          "Del kontaktinfo først når du har valgt selskapet du vil gå videre med.",
        ],
        snapshotExample: [
          ["Forsikringstype", "Innboforsikring"],
          ["Region", "Trøndelag"],
          ["Objekt", "Leilighet 70 m², bygget 2010"],
          ["Skadehistorikk", "Ingen skader"],
          ["Ønsket egenandel", "Middels (4 000–8 000 kr)"],
        ],
        faq: [
          {
            question: "Hva trenger forsikringsselskap for å gi et tilbud?",
            answer:
              "En beskrivelse av objektet (f.eks. boligstørrelse eller biltype), region, skadehistorikk i grove trekk og ønsket egenandel. Eksakt adresse eller registreringsnummer trengs først ved avtaleinngåelse – etter at du har valgt selskap.",
          },
          {
            question: "Ser selskapene skadehistorikken min?",
            answer:
              "De ser kun et intervall (ingen skader, 1 skade, 2+). Detaljer avklares direkte med selskapet du velger å gå videre med.",
          },
          {
            question: "Er sammenligningen uavhengig?",
            answer:
              "Poengsummen er deterministisk og forklart i klartekst: lavere pris, færre gebyrer, kortere binding og bedre dekning gir høyere score. Dette er en forklarbar sammenligning, ikke finansiell rådgivning.",
          },
        ],
        articleTag: "forsikring",
      }}
    />
  );
}
