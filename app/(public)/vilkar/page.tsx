import type { Metadata } from "next";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/features/seo/json-ld";

export const metadata: Metadata = buildMetadata({
  title: "Vilkår for bruk",
  description: "Brukervilkår for Spender – markedsplass for tilbud på strøm, mobil og forsikring.",
  path: "/vilkar",
});

export default function VilkarPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "Vilkår", path: "/vilkar" },
        ])}
      />
      <article className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Vilkår for bruk</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versjon 2026-06 (utkast). {/* TODO(legal): erstatt med endelig juridisk tekst. */}
        </p>

        <div className="prose prose-sm mt-8 max-w-none prose-headings:font-semibold">
          <h2>1. Tjenesten</h2>
          <p>
            Spender er en markedsplass og et sammenligningsverktøy der forbrukere kan beskrive
            behov og motta tilbud fra verifiserte bedrifter. Tilbudene gis av bedriftene selv.
            Spender er ikke part i avtalen som eventuelt inngås mellom forbruker og bedrift, og
            gir ikke finansiell rådgivning.
          </p>

          <h2>2. For forbrukere</h2>
          <ul>
            <li>Tjenesten er gratis for forbrukere.</li>
            <li>Du er ansvarlig for at opplysningene i behovet ditt er riktige.</li>
            <li>
              Sammenligningspoeng er en forklarbar, deterministisk beregning – ikke finansiell
              rådgivning. Kontroller alltid vilkårene hos bedriften før avtaleinngåelse.
            </li>
            <li>Du kan når som helst slette behov, trekke samtykker og be om sletting av kontoen.</li>
          </ul>

          <h2>3. For bedrifter</h2>
          <ul>
            <li>Bedrifter må verifiseres mot Enhetsregisteret og godkjennes av Spender før de kan sende tilbud.</li>
            <li>
              Kontaktinformasjon mottatt via samtykke skal kun brukes til å følge opp det aktuelle
              tilbudet, og skal slettes hos bedriften hvis samtykket trekkes.
            </li>
            <li>Misbruk, spam eller forsøk på å omgå personvernmodellen medfører suspensjon.</li>
            <li>Kreditter og abonnement faktureres i henhold til gjeldende prisplan.</li>
          </ul>

          <h2>4. Ansvar</h2>
          <p>
            Spender formidler tilbud, men garanterer ikke for innholdet i dem. Bedriften som avgir
            tilbudet er ansvarlig for at det er korrekt og kan leveres. Spender fraskriver seg
            ansvar for tap som følge av avtaler inngått mellom forbruker og bedrift, så langt
            gjeldende rett tillater.
          </p>

          <h2>5. Endringer</h2>
          <p>
            Vi kan oppdatere vilkårene. Vesentlige endringer varsles i appen senest 30 dager før de
            trer i kraft.
          </p>

          <h2>6. Lovvalg og verneting</h2>
          <p>Norsk rett gjelder. Tvister behandles ved ordinære norske domstoler.</p>
        </div>
      </article>
    </>
  );
}
