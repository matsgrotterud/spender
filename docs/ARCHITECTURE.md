# Arkitektur

## Oversikt

Spender er en Next.js 14-app (App Router) med PostgreSQL via Prisma. All forretningslogikk ligger i `features/` og `lib/`; rutene i `app/` er tynne og kaller server actions eller delte tjenester.

```
┌───────────────────────────────────────────────────────────┐
│  app/ (ruter)                                             │
│  (public)  /app (forbruker)  /bedrift/app  /admin  /api   │
└──────────────┬────────────────────────────────────────────┘
               │ server actions / route handlers
┌──────────────▼────────────────────────────────────────────┐
│  features/ (domenelogikk)                                 │
│  auth · consumer · business · admin · offers · categories │
│  privacy · billing · seo · analytics                      │
└──────────────┬────────────────────────────────────────────┘
               │
┌──────────────▼────────────────────────────────────────────┐
│  lib/ (kjerne)                                            │
│  db · auth · encryption · permissions · audit · rate-limit│
│  pricing · privacy · validators · adapters · webhooks     │
└──────────────┬────────────────────────────────────────────┘
               │ Prisma
        PostgreSQL  +  Redis (valgfri, in-memory-fallback)
```

## Rutegrupper

| Prefiks | Hvem | Beskyttelse |
| --- | --- | --- |
| `/`, `/strom`, `/artikler`, … | Offentlig | Ingen (SEO-indeksert) |
| `/logg-inn`, `/registrer`, `/bedrift/registrer` | Anonym | Rate limit på auth |
| `/app/**` | CONSUMER | `middleware.ts` + `requireUser(["CONSUMER"])` per side |
| `/bedrift/app/**` | BUSINESS_OWNER/MEMBER | `requireOrgMembership()` (verifiserer org-medlemskap) |
| `/admin/**` | ADMIN/SUPER_ADMIN | `requireUser(["ADMIN","SUPER_ADMIN"])` |
| `/api/v1/**` | Bedrifts-API | API-nøkkel (Bearer, SHA-256-hashet) + scopes + rate limit |
| `/api/webhooks/stripe` | Stripe | Signaturverifisering |

Autorisasjon håndheves i to lag: `middleware.ts` gir grov ruting-beskyttelse, og hver side/aksjon kaller server-side hjelpere (`requireUser`, `requireOrgMembership`, `requireOrgMembershipOrThrow`) som er eneste vei til data.

## Personverngrenser (viktigst i hele systemet)

1. **Skriving:** Forbrukerens svar valideres (`lib/validators/category-form.ts`), splittes i
   - `encryptedPrivatePayload` – alle svar, AES-256-GCM-kryptert (`lib/encryption`),
   - `publicSnapshotJson` – generert av `lib/privacy/snapshot.ts` ut fra kategoriens deklarative snapshot-regler. En `copy`-regel på et `privacy: "private"`-felt kaster exception (defense in depth).
2. **Lesing (bedrift):** Bedriftsruter og API leser **kun** `publicSnapshotJson`. Ingen kodevei i `features/business` eller `/api/v1` rører `UserPrivateProfile` eller dekrypterer payloads.
3. **Kontaktdeling:** `lib/privacy/consent.ts#getConsentedContact` er den eneste funksjonen som avslører kontaktfelter. Den krever en `ConsentGrant` med `status: ACTIVE` for nøyaktig den bedriften + forespørselen, avslører kun feltene i grant-scopet, og logger til `DataAccessLog`.
4. **Logging:** `lib/audit` skiller `DataAccessLog` (lesinger/avsløringer/eksport av persondata) fra `AuditLog` (tilstandsendringer). Begge er append-only.

## Dynamiske kategorier

Kategorier er data, ikke kode. `Category` har tre JSON-kolonner:

- `consumerFormSchemaJson` – feltliste (`FieldDef[]`) som rendres av `components/forms/dynamic-form-fields.tsx` og valideres server-side med Zod generert i `lib/validators/category-form.ts`. Felter kan være betingede (`showIf`) og merkes `privacy: "public" | "private"`.
- `businessOfferSchemaJson` – tilbudsfeltene + `scoring`-konfigurasjon for den forklarbare sammenligningen.
- `publicSnapshotRulesJson` – regler (`copy`, `map`, `numberToRange`, `postalCodeToRegion`) som definerer hva bedrifter ser.

Admin redigerer disse under `/admin/kategorier` uten deploy. Seed-definisjonene ligger i `features/categories/definitions.ts`.

## Tilbudsmotoren

`features/offers/send-offer.ts` er den eneste koden som oppretter tilbud, brukt av dashboard, kampanjemotor og API. Den gjør (i rekkefølge): org-verifisering → request-status → duplikatkontroll (unik `(organizationId, demandRequestId)`) → skjemavalidering → prisberegning (`lib/pricing/engine.ts`) → **atomisk** kredittrekk + tilbudsopprettelse i én Prisma-transaksjon (med idempotensnøkkel) → scoring (`features/offers/scoring.ts`) → varsling/webhook/analytikk.

Scoringen er deterministisk og forklart på norsk per komponent (pris, gebyrer, binding, kategorifit). UI viser alltid «Dette er en forklarbar sammenligning, ikke finansiell rådgivning.»

## Kampanjemotoren

`features/business/campaign-engine.ts` matcher ACTIVE forespørsler mot kriterier (region, ferskhet, snapshot-filtre), ekskluderer forespørsler bedriften alt har gitt tilbud på, dedupliserer via unik `(campaignId, demandRequestId)` og sender via `sendOffer` med `CAMPAIGN_SEND`-prising og idempotensnøkler. Kredittrekk skjer kun for faktisk sendte tilbud; tom for kreditter stopper kjøringen. Rate limiting (3 kjøringer/time) håndheves i server action-laget.

## Prismotor

`lib/pricing/engine.ts` evaluerer JSON-regler (`PricingRule`-tabellen) per scope (`CREDIT_COST`, `CAMPAIGN_SEND`, `CONTACT_UNLOCK`). Regler har `base`, betingede `modifiers` (kategori, region, ferskhet, plan, volum, konkurranse) og `min`/`max`. Konteksten inneholder aldri persondata. Faller tilbake til fornuftige standardpriser når ingen regel finnes. Bedrifter ser pris-forhåndsvisning med full breakdown før sending.

## Adaptere

Alle eksterne tjenester går via adaptere i `lib/adapters/` med mock som standard:

| Adapter | Produksjon | Mock |
| --- | --- | --- |
| `billing` | Stripe Checkout + webhook | Aktiverer abonnement direkte |
| `email` | Resend | Konsoll-logg |
| `business-registry` | Brønnøysundregistrene (åpne data) | Statisk oppslag |
| `storage` | S3/R2 | Lokal disk `.uploads/` |
| `identity` | BankID/Vipps OIDC (plassholder) | E-post/passord |
| `analytics` | PostHog | Intern `AnalyticsEvent`-tabell |
| `error-monitoring` | Sentry | Konsoll |
| `crm` | Generisk webhook | No-op |

Status for hver vises i **Admin → System** (`lib/env.ts#getSetupChecklist`).

## Kø, cache og rate limiting

`lib/rate-limit` implementerer sliding window mot Redis når `REDIS_URL` er satt, ellers prosessintern Map. `lib/queue` er en minimal jobbabstraksjon (in-memory) for utsendelser; webhook-leveranser persisteres i `WebhookDelivery` med HMAC-signering, idempotensnøkler og inntil 3 forsøk.

## Sikkerhet

- RBAC-matrise i `lib/permissions` + org-rolle-sjekker (`OWNER/ADMIN/MEMBER/VIEWER`).
- bcrypt-passord, JWT-sesjon i httpOnly-cookie, CSRF håndteres av NextAuth/server actions.
- Sikkerhetsheadere i `next.config.mjs` (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- API-nøkler lagres som SHA-256-hash med prefiks; vises én gang.
- Rate limits: auth, registrering, API, tilbudssending, kampanjekjøring, meldinger.
- Ingen scraping-vennlige endepunkter: API krever nøkkel, paginert (maks 50), ingen CSV-eksport av markedet.

## Testing

- `tests/unit` – encryption, snapshot-generering, scoring, prismotor, skjemavalidering.
- `tests/integration` – mot ekte Postgres: tilbudsflyt + kredittledger, samtykkegrensen (inkl. «urelatert bedrift får ingenting»), kampanje-deduplisering. Egne testdata med opprydding.
- `tests/e2e` (Playwright) – offentlig side/SEO-artefakter, innlogging for alle tre roller, rollegrenser, pseudonymitet i markedet.
