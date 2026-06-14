import type { Metadata } from "next";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/features/seo/json-ld";

export const metadata: Metadata = buildMetadata({
  title: "Personvernerklæring",
  description:
    "Hvordan Spender behandler personopplysninger: kryptering, samtykkebasert deling, dine rettigheter til innsyn, eksport og sletting.",
  path: "/personvern",
});

export default function PersonvernPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "Personvern", path: "/personvern" },
        ])}
      />
      <article className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Personvernerklæring</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Versjon 2026-06 (utkast). {/* TODO(legal): erstatt med endelig juridisk tekst fra advokat. */}
        </p>

        <div className="prose prose-sm mt-8 max-w-none prose-headings:font-semibold">
          <h2>Kort fortalt</h2>
          <ul>
            <li>Spender selger ikke kontaktinformasjonen din til bedrifter.</li>
            <li>
              Bedrifter ser kun en anonymisert/pseudonymisert oppsummering av behovet ditt før du
              eventuelt deler mer.
            </li>
            <li>Du bestemmer hvem som får kontakte deg.</li>
            <li>Du kan trekke tilbake samtykke og be om eksport eller sletting av data.</li>
          </ul>

          <h2>1. Behandlingsansvarlig</h2>
          <p>
            {/* TODO(legal): sett inn juridisk selskapsnavn, organisasjonsnummer og kontaktinfo. */}
            Spender (selskapsinformasjon kommer) er behandlingsansvarlig for personopplysninger som
            behandles i tjenesten. Personvernhenvendelser: kontakt@spender.local.
          </p>

          <h2>2. Hvilke opplysninger vi behandler</h2>
          <p>Vi skiller strengt mellom tre datakategorier:</p>
          <ul>
            <li>
              <strong>Private opplysninger</strong> (navn, telefonnummer, adresse, eksakt forbruk,
              registreringsnummer): lagres kryptert med AES-256-GCM og er aldri tilgjengelige for
              bedrifter uten ditt eksplisitte samtykke per bedrift.
            </li>
            <li>
              <strong>Offentlig behovsprofil</strong> (region, intervaller, kategorivalg): en
              pseudonymisert oppsummering du forhåndsviser og godkjenner før publisering.
            </li>
            <li>
              <strong>Kontodata</strong> (e-post, innloggingstidspunkt): brukes til drift av
              tjenesten.
            </li>
          </ul>
          <p>
            Vi lagrer aldri fødselsnummer. Ved eventuell fremtidig BankID-innlogging lagres kun et
            verifisert-flagg, tillitsnivå og leverandørens subjekt-ID.
          </p>

          <h2>3. Rettslig grunnlag</h2>
          <ul>
            <li>Avtale (GDPR art. 6(1)(b)): drift av kontoen og formidling av tilbud.</li>
            <li>
              Samtykke (art. 6(1)(a)): deling av kontaktinformasjon med en konkret bedrift, og
              valgfri statistikk-informasjonskapsler. Samtykke kan trekkes tilbake når som helst.
            </li>
            <li>Berettiget interesse (art. 6(1)(f)): svindel- og misbruksforebygging, sikkerhetslogger.</li>
          </ul>

          <h2>4. Hvem ser hva</h2>
          <p>
            Bedrifter ser kun den offentlige behovsprofilen og ditt pseudonym (f.eks. «Forbruker
            #A82Q»). Når du aktivt deler kontaktinformasjon med én valgt bedrift, registreres et
            samtykke med tidspunkt og omfang, og kun de feltene du valgte blir synlige for den
            bedriften. Hver visning logges.
          </p>

          <h2>5. Dine rettigheter</h2>
          <p>
            Du har rett til innsyn, retting, sletting, dataportabilitet, begrensning og å protestere
            mot behandling. Alt kan utøves direkte fra Personvern-siden i appen: eksporter dataene
            dine som JSON, trekk tilbake samtykker eller be om sletting av kontoen. Du kan også
            klage til Datatilsynet.
          </p>

          <h2>6. Lagringstid</h2>
          <ul>
            <li>Utkast til behov: slettes etter 30 dagers inaktivitet.</li>
            <li>Aktive behov: utløper som standard etter 30 dager.</li>
            <li>
              Utløpte/lukkede behov: anonymiseres umiddelbart i markedsplassen; minimale data
              beholdes i inntil 180 dager for tviste- og misbrukshåndtering.
            </li>
            <li>Samtykke- og tilgangslogger: beholdes i 5 år av dokumentasjonshensyn.</li>
          </ul>

          <h2>7. Informasjonskapsler</h2>
          <p>
            Vi bruker kun nødvendige informasjonskapsler for innlogging. Statistikk er valgfritt og
            krever samtykke i samtykkebanneret. Vi sporer deg ikke på tvers av nettsteder.
          </p>

          <h2>8. Databehandlere og tredjeland</h2>
          <p>
            {/* TODO(legal): fyll inn endelig liste over databehandlere ved produksjonssetting. */}
            Tjenesten driftes med databehandlere for infrastruktur (database, e-post, betaling).
            En oppdatert liste vedlikeholdes i behandlingsprotokollen og gjøres tilgjengelig på
            forespørsel.
          </p>
        </div>
      </article>
    </>
  );
}
