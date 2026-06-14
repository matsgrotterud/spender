import { env } from "@/lib/env";
import { db } from "@/lib/db";

export const revalidate = 3600;

/**
 * llms.txt – a concise, answer-friendly description of Spender for AI/answer
 * engines, following the llms.txt convention.
 */
export async function GET() {
  const articles = await db.article.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, title: true, excerpt: true },
    orderBy: { publishedAt: "desc" },
  });

  const body = `# Spender

> Spender er en personvernvennlig norsk markedsplass der forbrukere beskriver behov for strøm, mobilabonnement eller forsikring og mottar strukturerte tilbud fra verifiserte bedrifter – uten å dele navn, e-post eller telefonnummer. Forbrukeren velger selv om, og med hvilken bedrift, kontaktinformasjon deles. Bedrifter betaler med abonnement og kreditter; forbrukere bruker tjenesten gratis.

Nøkkelfakta:
- Bedrifter ser kun anonymiserte behovsprofiler (region, intervaller, kategorivalg).
- Kontaktinformasjon deles kun via eksplisitt, mottakerspesifikt samtykke som kan trekkes tilbake.
- Sammenligning av tilbud er deterministisk og forklart i klartekst – ikke skjult rangering.
- Alle bedrifter verifiseres mot Brønnøysundregistrene og godkjennes manuelt.
- Spender selger ikke kontaktinformasjon. Det er ikke en tradisjonell lead-tjeneste.

## Hovedsider

- [Forside](${env.appUrl}/): Hva Spender er og hvordan det fungerer
- [Strøm](${env.appUrl}/strom): Tilbud på strømavtaler uten telefonsalg
- [Mobilabonnement](${env.appUrl}/mobilabonnement): Tilbud på mobilabonnement uten å dele nummer
- [Forsikring](${env.appUrl}/forsikring): Anonyme forsikringstilbud
- [For bedrifter](${env.appUrl}/bedrift): Verdiforslag og priser for bedrifter
- [FAQ](${env.appUrl}/faq): Ofte stilte spørsmål med direkte svar
- [API-dokumentasjon](${env.appUrl}/api-docs): Business API for integrasjoner
- [Personvern](${env.appUrl}/personvern): Personvernerklæring
- [Vilkår](${env.appUrl}/vilkar): Brukervilkår

## Artikler

${articles.map((a) => `- [${a.title}](${env.appUrl}/artikler/${a.slug}): ${a.excerpt}`).join("\n")}
`;

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
