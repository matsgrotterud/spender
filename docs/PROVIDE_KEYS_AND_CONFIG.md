# Hva du må skaffe og konfigurere før produksjon

Alt under kjører i mock-modus lokalt. Denne listen er det **du som grunnlegger/driftsansvarlig** må fremskaffe for produksjonsdrift. Status for hvert punkt vises løpende i **Admin → System**.

## 1. Domene og juridisk grunnlag

| Hva | Hvorfor | Hvor det brukes |
| --- | --- | --- |
| Produksjonsdomene (f.eks. `spender.no`) | Kanoniske URL-er, cookies, e-postlenker | `APP_URL` i `.env` |
| Selskapets juridiske navn + org.nr | Footer, vilkår, personvernerklæring | `app/(public)/vilkar`, `personvern` |
| Personvernkontakt-e-post (gjerne `personvern@…`) | GDPR-henvendelser | `ADMIN_EMAIL`, personvernsiden |
| Endelig personvernerklæring og vilkår (advokat) | Sidene i dag er **plassholdere** | Erstatt innholdet i `app/(public)/personvern/page.tsx` og `vilkar/page.tsx` |
| Kategorispesifikke juridiske forbehold | Strøm/forsikring har bransjekrav | Kategoribeskrivelser i admin |

## 2. Kjerneinfrastruktur

| Variabel | Hva du må skaffe |
| --- | --- |
| `DATABASE_URL` (+ ev. `DIRECT_URL`) | Administrert PostgreSQL (Neon, Supabase, RDS, …). `DIRECT_URL` trengs hvis du bruker connection pooler. |
| `AUTH_SECRET` | `openssl rand -hex 32`. Roteres ved kompromittering. |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` (64 hex-tegn = 32 byte). **Kritisk:** tap av denne gjør all kryptert persondata uleselig. Oppbevar i secret manager med backup. Ikke roter uten re-krypteringsplan. |
| `REDIS_URL` | Administrert Redis (Upstash, Railway, …) for rate limiting på tvers av instanser. Uten denne brukes prosessintern fallback (OK for én instans). |

## 3. Stripe (abonnement + kredittkjøp)

1. Opprett Stripe-konto (norsk org).
2. Opprett tre **recurring prices** (Starter/Growth/Pro) i NOK.
3. Sett `STRIPE_SECRET_KEY`, `STRIPE_STARTER_PRICE_ID`, `STRIPE_GROWTH_PRICE_ID`, `STRIPE_PRO_PRICE_ID`.
4. Registrer webhook-endepunkt `https://<domene>/api/webhooks/stripe` med hendelsene `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`; sett `STRIPE_WEBHOOK_SECRET`.
5. Sett `FEATURE_STRIPE=true` og `FEATURE_MOCK_BILLING=false`.
6. Kjør `npm run db:seed` på nytt (eller oppdater planene i admin) slik at `stripePriceId` settes.

Enterprise-planen faktureres manuelt («etter avtale») og trenger ikke Stripe-pris.

## 4. E-post

- Opprett [Resend](https://resend.com)-konto, verifiser domenet (SPF/DKIM).
- Sett `RESEND_API_KEY` og `EMAIL_FROM="Spender <noreply@spender.no>"`.
- Sett `FEATURE_MOCK_EMAIL=false`.

## 5. BankID (valgfritt, for verifisert innlogging)

Krever avtale med en BankID OIDC-leverandør (Signicat, Vipps Login med BankID, …).

- `BANKID_CLIENT_ID`, `BANKID_CLIENT_SECRET`, `BANKID_ISSUER_URL`, `FEATURE_BANKID=true`.
- **Viktig:** Appen lagrer kun verifisert-flagg, tillitsnivå, leverandørens subject-ID og tidsstempel. Fødselsnummer skal aldri lagres – adapteren i `lib/adapters/identity.ts` er bygget for dette.

## 6. Vipps MobilePay (valgfritt)

- Merchant-avtale hos Vipps MobilePay; hent `VIPPS_CLIENT_ID`, `VIPPS_CLIENT_SECRET`, `VIPPS_SUBSCRIPTION_KEY`, `VIPPS_MERCHANT_SERIAL_NUMBER`, sett `FEATURE_VIPPS=true`.

## 7. Brønnøysundregistrene

Åpne data – ingen nøkkel nødvendig. `BRREG_API_BASE_URL` er forhåndsutfylt. Bedriftsverifisering fungerer ut av boksen i produksjon.

## 8. Fillagring (valgfritt, for vedlegg)

S3-kompatibel bucket (AWS S3, Cloudflare R2): `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`. Uten dette brukes lokal disk (`.uploads/`) – ikke egnet for flere instanser.

## 9. Analyse og feilovervåking (valgfritt)

- PostHog (EU-hosting anbefales): `POSTHOG_KEY`, `POSTHOG_HOST=https://eu.posthog.com`. Respekterer cookie-samtykke; ingen sporing på tvers av nettsteder.
- Sentry: `SENTRY_DSN`.

## 10. Forretningsbeslutninger

Disse styres i admin (ingen deploy nødvendig), men du må **beslutte** dem:

- Abonnementspriser (Admin → Abonnement) – seedet: Starter 490, Growth 1 490, Pro 3 490 kr/mnd.
- Kredittkostnader (Admin → Prisregler) – seedet: tilbud 5, kampanje 3/mottaker, kontaktopplåsing 10 kreditter.
- Suksessgebyr ved akseptert tilbud (ledger-støtte finnes, ingen automatisk belastning).
- Godkjenningsrutiner for bedrifter (i dag: Brreg-oppslag + manuell godkjenning).

## Sjekkliste før lansering

- [ ] `APP_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `DATABASE_URL`, `REDIS_URL` satt i produksjonsmiljø
- [ ] `ENCRYPTION_KEY` sikkerhetskopiert i secret manager
- [ ] Stripe-priser + webhook konfigurert og testet (test-modus først)
- [ ] Resend-domene verifisert; testmail sendt
- [ ] Juridisk personvernerklæring og vilkår erstattet plassholderne
- [ ] `npm run db:deploy` kjørt mot produksjonsdatabasen, deretter seed av kategorier/planer
- [ ] Admin-bruker opprettet med sterkt passord (ikke demo-kontoen)
- [ ] Admin → System viser grønt (eller bevisst akseptert mock) på alle punkter
