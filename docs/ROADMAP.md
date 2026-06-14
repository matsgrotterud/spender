# Roadmap

## Status: fungerende fundament (v0.1)

Implementert: offentlig SEO-side, forbruker-/bedrifts-/admin-dashbord, dynamiske kategorier, snapshot-personverngrense, samtykkeprotokoll, tilbudsmotor med forklarbar scoring, kampanjemotor med deduplisering, kreditt-/abonnementsmodell (mock + Stripe-adapter), Business API v1 med webhooks, audit-/tilgangslogging, GDPR-flyt (eksport, sletting, tilbaketrekking), seed og tester.

## Neste: produksjonsherding (prioritert)

1. **Retention-jobber** – cron/worker som utløper aktive forespørsler, sletter gamle utkast, anonymiserer lukkede forespørsler og prunerer varsler iht. `lib/privacy/retention.ts`. (Konstantene og feltene finnes; jobben må kjøres f.eks. via Vercel Cron eller en worker.)
2. **E-postverifisering + passordtilbakestilling** – `emailVerifiedAt` finnes; flyten (token-lenker via e-postadapteren) må bygges.
3. **Ekte kø for webhooks/e-post** – flytt `lib/queue` fra in-memory til BullMQ/Redis slik at leveranser overlever restart; retry med eksponentiell backoff.
4. **Stripe end-to-end-test** – checkout, fornyelse, mislykket betaling, oppsigelse i testmodus; grace period-håndtering ved `PAST_DUE`.
5. **Observability** – aktiver Sentry-adapteren, strukturert logging, helsesjekk-endepunkt, alarmer på feilede webhook-leveranser.
6. **Sikkerhetsgjennomgang** – penetrasjonstest, avhengighetsskanning i CI, CSP-header (i dag kun grunnheadere), 2FA for admin.
7. **Nøkkelrotasjon** – re-krypteringsjobb for `ENCRYPTION_KEY`-rotasjon.
8. **CI/CD** – GitHub Actions: lint, typecheck, vitest (med Postgres-service), Playwright, preview-deploys.

## Kvartal 2: vekst

- **BankID-innlogging** (Signicat/Vipps Login) → «verifisert forbruker»-merke som øker tilliten hos bedrifter. Kun flagg/nivå/subject lagres.
- **Vipps Login** som alternativ innlogging.
- **Vedleggsopplasting** (S3/R2-adapteren finnes) for tilbudsdokumenter, med virussjekk.
- **Lagret søk-varsling** – e-post/webhook når nye forespørsler matcher (`demand_request.created_matching_saved_search` er klargjort).
- **Bedre innsikt for bedrifter** – konverteringstrakt, prisbenchmarks per kategori (aggregert, aldri persondata).
- **Flere kategorier** – bredbånd, boliglån-refinansiering, håndverkertjenester (kun admin-konfigurasjon takket være dynamiske skjemaer).

## Kvartal 3+: skala

- **Suksessgebyr-fakturering** – automatisk ledger → faktura ved aksepterte tilbud (ledger-typen finnes).
- **CRM-integrasjoner** – HubSpot/Salesforce-connectors oppå webhook-fundamentet; Zapier/n8n-app.
- **Enterprise** – SSO (SAML/OIDC), egne SLA-er, dedikerte miljøer.
- **Smartere matching** – valgfri varsling til bedrifter ved relevante forespørsler; alltid forklarbar, aldri automatiske avslag (GDPR art. 22).
- **Flere markeder** – i18n-rammeverk (svensk/dansk), valuta- og registeradaptere per land.
- **Mobilapp** – API-et er klart; React Native-klient med push-varsler.

## Eksplisitt utenfor scope (bevisste valg)

- Salg av leads/persondata – aldri.
- Skjult/«svart boks»-scoring av forbrukere.
- Tredjeparts annonsesporing på tvers av nettsteder.
- Lagring av fødselsnummer.
