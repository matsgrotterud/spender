import type { Metadata } from "next";
import { buildMetadata } from "@/features/seo/metadata";
import { CategoryLanding } from "@/components/site/category-landing";

export const metadata: Metadata = buildMetadata({
  title: "Få tilbud på mobilabonnement – uten å oppgi nummeret ditt",
  description:
    "Beskriv databehov og antall brukere, og motta tilbud på mobilabonnement fra flere operatører. Telefonnummeret ditt forblir privat til du selv velger å dele det.",
  path: "/mobilabonnement",
});

export default function MobilPage() {
  return (
    <CategoryLanding
      content={{
        slug: "mobilabonnement",
        name: "Mobilabonnement",
        heroTitle: "Riktig mobilabonnement – uten å gi fra deg nummeret",
        heroText:
          "Fortell hvor mye data du trenger og hvor mange brukere dere er. Operatørene konkurrerer med konkrete priser – og nummeret ditt forblir hemmelig til du selv deler det.",
        bullets: [
          "Sammenlign månedspris, datamengde, nettverk og bindingstid strukturert.",
          "eSIM, familierabatt og roaming vises tydelig i hvert tilbud.",
          "Telefonnummeret ditt lagres kryptert og deles aldri uten ditt samtykke.",
          "Still spørsmål til operatøren anonymt via meldinger i appen.",
          "Bytt når det passer deg – tilbudene viser om du har bindingstid å ta hensyn til.",
        ],
        snapshotExample: [
          ["Antall brukere", "3–4"],
          ["Databehov", "15–30 GB"],
          ["Dekningsområde", "Hele landet"],
          ["eSIM", "Ja"],
          ["Familieabonnement", "Ja"],
          ["Internasjonal bruk", "Nei"],
        ],
        faq: [
          {
            question: "Hva bør du sammenligne i et mobilabonnement?",
            answer:
              "Månedspris, datamengde, hastighet etter kvote, hvilket nett som brukes (Telenor, Telia eller Ice), bindingstid, etableringsgebyr og om eSIM, familierabatt og EU-roaming er inkludert. Spender viser alt dette strukturert i hvert tilbud.",
          },
          {
            question: "Får operatørene telefonnummeret mitt?",
            answer:
              "Nei. Nummeret lagres kryptert og deles kun hvis du aksepterer et tilbud og aktivt velger å dele kontaktinformasjon med akkurat den operatøren.",
          },
          {
            question: "Kan jeg få familieabonnement?",
            answer:
              "Ja, oppgi antall brukere og huk av for familieabonnement, så priser operatørene hele familien samlet.",
          },
        ],
        articleTag: "mobilabonnement",
      }}
    />
  );
}
