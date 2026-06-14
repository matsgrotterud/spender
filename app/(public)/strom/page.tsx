import type { Metadata } from "next";
import { buildMetadata } from "@/features/seo/metadata";
import { CategoryLanding } from "@/components/site/category-landing";

export const metadata: Metadata = buildMetadata({
  title: "Få tilbud på strømavtale uten å bli oppringt",
  description:
    "Beskriv strømforbruket ditt anonymt og motta konkrete tilbud på spotpris, fastpris eller variabel avtale fra verifiserte strømleverandører. Gratis og uten telefonsalg.",
  path: "/strom",
});

export default function StromPage() {
  return (
    <CategoryLanding
      content={{
        slug: "strom",
        name: "Strøm",
        heroTitle: "Bedre strømavtale – uten telefonsalg",
        heroText:
          "Oppgi forbruk og ønsket avtaletype. Strømleverandører ser kun en anonymisert profil med region og forbruksintervall, og konkurrerer om å gi deg det beste tilbudet.",
        bullets: [
          "Bedriftene ser prisområdet ditt (NO1–NO5) og forbruksintervall – aldri adresse eller målernummer.",
          "Sammenlign påslag, månedsbeløp, bindingstid og gebyrer side om side.",
          "Forklarbar poengsum viser hvorfor ett tilbud scorer bedre enn et annet.",
          "Aksepterer du et tilbud, velger du selv om bedriften får kontaktinformasjonen din.",
          "Ingen budrunder på deg som person. Ingen ringelister.",
        ],
        snapshotExample: [
          ["Region", "Oslo (NO1)"],
          ["Boligtype", "Leilighet"],
          ["Årsforbruk", "10 000–15 000 kWh"],
          ["Nåværende avtale", "Spotpris"],
          ["Elbil", "Ja"],
          ["Ønsket avtale", "Spot eller fastpris"],
        ],
        faq: [
          {
            question: "Hvordan finner jeg billig strøm uten å bli oppringt?",
            answer:
              "Legg inn behovet ditt på Spender. Strømleverandørene ser kun en anonymisert profil og sender tilbud i appen. Ingen får telefonnummeret ditt, så ingen kan ringe deg.",
          },
          {
            question: "Hva trenger strømleverandøren for å gi et tilbud?",
            answer:
              "Region/prisområde, omtrentlig årsforbruk, boligtype og ønsket avtaletype. Alt dette deles som intervaller og kategorier – ikke eksakte personopplysninger.",
          },
          {
            question: "Må jeg oppgi målernummer (MPID)?",
            answer:
              "Nei. Målernummer trengs først ved selve byttet, og det skjer direkte mellom deg og leverandøren du velger – etter at du har akseptert tilbudet.",
          },
          {
            question: "Koster det noe?",
            answer: "Nei, Spender er gratis for forbrukere. Bedriftene betaler for å sende tilbud.",
          },
        ],
        articleTag: "strom",
      }}
    />
  );
}
