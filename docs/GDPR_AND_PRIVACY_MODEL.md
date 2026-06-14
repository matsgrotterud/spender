# GDPR- og personvernmodell

Dette dokumentet beskriver hvordan Spender behandler persondata, hvilke garantier som er bygget inn i koden, og hvordan de registrertes rettigheter oppfylles.

## Grunnprinsipper

1. **Pseudonymitet som standard.** Bedrifter ser aldri hvem forbrukeren er – kun et alias («Forbruker #A82Q») og en anonymisert behovsoppsummering.
2. **Mottakerspesifikt samtykke.** Kontaktinformasjon deles aldri «til markedet», kun til én navngitt bedrift for én konkret forespørsel, etter eksplisitt handling fra forbrukeren.
3. **Kryptering av direkte identifikatorer.** Navn, telefon, adresse, registreringsnummer o.l. lagres AES-256-GCM-kryptert med app-nøkkel (ikke lesbart fra databasen alene).
4. **Full sporbarhet.** Hver lesing, avsløring, eksport og administrativ handling logges.
5. **Ingen fødselsnumre.** Lagring av norske fødselsnumre er forbudt i hele systemet. Ved fremtidig BankID-integrasjon lagres kun verifisert-flagg, tillitsnivå, leverandørens subject-ID og tidsstempel.

## Dataklassifisering

| Klasse | Eksempler | Lagring | Hvem ser |
| --- | --- | --- | --- |
| Direkte identifikatorer | Navn, telefon, adresse, reg.nr | `UserPrivateProfile.encryptedPayload`, `DemandRequest.encryptedPrivatePayload` (AES-256-GCM) | Forbrukeren selv; bedrift kun via aktivt `ConsentGrant` |
| Kontoidentifikator | E-post | `User.email` (klartekst, kreves for innlogging) | Forbrukeren; bedrift kun via samtykke med `email` i scope |
| Pseudonyme markedsdata | Region, prisområde, forbruksintervaller, preferanser | `DemandRequest.publicSnapshotJson` | Godkjente bedrifter |
| Tekniske spor | IP, user-agent | Kun som HMAC-hash (`safeHash`) i samtykke-/tilgangslogg | Admin |
| Bedriftsdata | Org.nr, registerdata | Klartekst (offentlige data) | Admin + bedriften selv |

## Snapshot-generering (personverngrensen)

`lib/privacy/snapshot.ts` genererer det bedrifter ser, styrt av deklarative regler per kategori:

- `postalCodeToRegion` – postnummer → grov region + strømprisområde (postnummeret selv forblir privat).
- `numberToRange` – eksakte tall (f.eks. årsforbruk) → intervaller.
- `map` / `copy` – kun for felter merket `privacy: "public"`. En `copy`-regel på et privat felt kaster exception ved kjøring (defense in depth).

Forbrukeren ser en **forhåndsvisning av nøyaktig hva bedriftene får se** før publisering, med etikettene «Privat», «Synlig for bedrifter» og «Delt med samtykke» gjennomgående i UI.

## Samtykkemodellen

- `ConsentGrant` er en append-only samtykkeprotokoll: bruker, forespørsel, bedrift, formål, felt-scope, samtykketekst-versjon, hashet IP/user-agent, tidsstempler.
- `lib/privacy/consent.ts#getConsentedContact` er **eneste kodevei** som avslører kontaktfelter: krever `status: ACTIVE` for nøyaktig den bedriften og forespørselen, avslører kun feltene i scopet, og logger hver lesing.
- Tilbaketrekking (`status: WITHDRAWN`) virker umiddelbart – også for API-tilgang.
- Bedrifts-API-et returnerer kontaktfelter kun når et aktivt grant finnes, og hver lesing logges.

## De registrertes rettigheter

| Rettighet | Implementasjon |
| --- | --- |
| Innsyn (art. 15) | Personvernsenteret (`/app/personvern`) viser forespørsler, hva som er offentlig vs. privat, hvilke bedrifter som har mottatt tilbud/fått kontakttilgang, og et sammendrag av tilgangsloggen |
| Dataportabilitet (art. 20) | `GET /api/me/export` – komplett JSON-eksport inkl. dekrypterte egne data; eksporten logges |
| Sletting (art. 17) | «Slett konto» oppretter en `DataSubjectRequest`; admin fullfører → anonymisering: e-post erstattes, kryptert payload tømmes, alias anonymiseres, forespørsler lukkes og tømmes, meldinger redigeres, aktive samtykker trekkes |
| Tilbaketrekking av samtykke (art. 7) | Én-klikks «Trekk tilbake» per bedrift i personvernsenteret |
| Retting/begrensning/innsigelse | `DataSubjectRequest`-typene RECTIFY/RESTRICT_PROCESSING/OBJECT behandles av admin under Personvern/DSR |

## Behandlingsprotokoll (art. 30)

Vises i **Admin → Personvern/DSR**. Hovedaktiviteter:

| Behandling | Grunnlag | Lagringstid |
| --- | --- | --- |
| Konto og innlogging | Avtale (6-1-b) | Til sletting |
| Forespørsler/behov | Avtale (6-1-b) | Aktive: 30 d (konfig.), lukkede: 180 d minimalt |
| Kontaktdeling | Samtykke (6-1-a) | Til tilbaketrekking |
| Samtykke- og auditlogg | Rettslig forpliktelse (6-1-c) | 5 år |
| Bedriftsverifisering | Berettiget interesse (6-1-f) | Så lenge bedriften er aktiv |

## Lagringstider (konfigurerbare)

Definert i `lib/privacy/retention.ts`, overstyrbare via miljøvariabler:

- Utkast: slettes etter 30 dagers inaktivitet (`RETENTION_DRAFT_DAYS`)
- Aktive forespørsler: utløper etter 30 dager (`RETENTION_ACTIVE_REQUEST_DAYS`)
- Utløpte/lukkede: anonymiseres i markedet umiddelbart; minimale data beholdes 180 dager (`RETENTION_CLOSED_REQUEST_DAYS`)
- Samtykke-/auditlogg: 5 år
- Varsler: 90 dager

## Informasjonskapsler

Cookie-banner med preferanser (nødvendige / analyse). Valget lagres lokalt og i `CookieConsent` (med anonym ID for ikke-innloggede). Analyse-hendelser sendes kun ved samtykke; ingen tredjeparts sporing på tvers av nettsteder som standard.

## Logging

- **`DataAccessLog`** – hvem leste/avslørte/eksporterte hvilke persondata, om hvem, hvorfor (snapshot-visning, kontaktavsløring, eksport, API-oppslag). IP kun hashet.
- **`AuditLog`** – tilstandsendringer (tilbud sendt, bedrift godkjent/suspendert, kategori endret, DSR fullført, …) med før/etter der relevant.
- Begge er append-only; ingenting i applikasjonen sletter fra dem. Admin har read-only innsyn under Audit-logg.

## Kjente begrensninger / produksjonsoppgaver

- Personvernerklæring og vilkår er plassholdere – krever juridisk tekst.
- Automatisk håndheving av lagringstider (cron som utløper/anonymiserer) er forberedt i konstanter, men jobben må aktiveres i drift (se ROADMAP).
- `ENCRYPTION_KEY`-rotasjon krever en re-krypteringsjobb (ikke bygget).
