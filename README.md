# Spender

**Få tilbud uten å bli nedringt.** Spender er en personvernvennlig, to-sidig markedsplass der forbrukere beskriver behov (strøm, mobilabonnement, forsikring) og mottar strukturerte tilbud fra godkjente bedrifter – uten å eksponere navn, telefonnummer eller andre direkte identifikatorer før de selv velger å dele dem med én konkret bedrift.

Dette er **ikke** en lead-plattform: bedrifter ser kun pseudonyme, anonymiserte oppsummeringer. All tilgang til persondata krever mottakerspesifikt samtykke og logges.

## Teknologi

- Next.js 14 (App Router) · React 18 · TypeScript (strict)
- Tailwind CSS + eget komponentbibliotek (shadcn-stil)
- Prisma ORM · PostgreSQL · Redis-kompatibel cache/kø (med in-memory-fallback)
- Auth.js (NextAuth) med e-post/passord (BankID/Vipps klargjort som adaptere)
- Zod-validering · Server Actions · API-ruter
- Vitest (unit + integrasjon) · Playwright (e2e)
- Docker Compose for lokal Postgres/Redis, med innebygd Postgres-fallback uten Docker

## Kom i gang lokalt

Krav: Node.js 20+. Docker er valgfritt.

```bash
# 1. Installer avhengigheter
npm install

# 2. Opprett .env (genererer hemmeligheter selv)
cp .env.example .env
# Sett AUTH_SECRET og ENCRYPTION_KEY, f.eks.:
#   AUTH_SECRET=$(openssl rand -hex 32)
#   ENCRYPTION_KEY=$(openssl rand -hex 32)   # må være 64 hex-tegn
# DATABASE_URL=postgresql://spender:spender@localhost:5432/spender

# 3a. Start database med Docker …
npm run db:up

# 3b. … eller uten Docker (innebygd PostgreSQL i .pgdata/)
npm run db:embedded   # la denne kjøre i et eget terminalvindu

# 4. Migrér og seed
npm run db:migrate
npm run db:seed

# 5. Start utviklingsserveren
npm run dev
```

Appen kjører på [http://localhost:3000](http://localhost:3000). Alt fungerer uten eksterne API-nøkler – betaling, e-post m.m. kjører i mock-modus (se status under **Admin → System**).

**Deploy på Vercel:** se [docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) for database, miljøvariabler og seed mot produksjon.

## Demokontoer

Alle med passord `Demo123!`:

| Konto | Rolle |
| --- | --- |
| `consumer@spender.local` | Forbruker med aktive forespørsler og mottatte tilbud |
| `business@spender.local` | Eier av «Demo Energi & Tele AS» (godkjent, Growth-plan, kreditter) |
| `admin@spender.local` | Administrator |

I tillegg finnes `pending-business@spender.local` (bedrift som venter på godkjenning) og fem demo-forbrukere med forespørsler i markedet.

## Scripts

| Kommando | Hva |
| --- | --- |
| `npm run dev` | Utviklingsserver |
| `npm run build` / `npm start` | Produksjonsbygg / -server |
| `npm run db:up` / `db:down` | Postgres + Redis via Docker Compose |
| `npm run db:embedded` | Innebygd PostgreSQL uten Docker |
| `npm run db:migrate` | Prisma-migrasjoner (dev) |
| `npm run db:seed` | Seed demo-data (idempotent) |
| `npm run db:reset` | Nullstill database + re-seed |
| `npm test` | Vitest (unit + integrasjon, krever kjørende DB) |
| `npm run test:e2e` | Playwright e2e (krever seedet DB; starter dev-server selv) |
| `npm run lint` / `typecheck` / `format` | Kvalitetsverktøy |

## Struktur

```
app/            Ruter (offentlig side, /app forbruker, /bedrift/app, /admin, /api)
components/     UI-komponenter, skall, skjema-renderer
features/       Domenelogikk per område (auth, consumer, business, admin, offers, …)
lib/            Kjernebiblioteker (db, auth, encryption, audit, rate-limit, pricing, privacy, adapters)
prisma/         Skjema, migrasjoner, seed
tests/          unit/, integration/, e2e/
docs/           Arkitektur-, personvern- og driftsdokumentasjon
```

Se [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detaljer, [docs/GDPR_AND_PRIVACY_MODEL.md](docs/GDPR_AND_PRIVACY_MODEL.md) for personvernmodellen og [docs/PROVIDE_KEYS_AND_CONFIG.md](docs/PROVIDE_KEYS_AND_CONFIG.md) for hva som må konfigureres før produksjon.

## Personvernprinsipper (kortversjon)

- Direkte identifikatorer lagres **AES-256-GCM-kryptert** (`UserPrivateProfile`, `DemandRequest.encryptedPrivatePayload`).
- Bedrifter ser kun `publicSnapshotJson` – generert av kategoriens snapshot-regler, aldri rådata.
- Kontaktinfo deles kun via `ConsentGrant` per bedrift per forespørsel, og kan trekkes tilbake.
- Hver lesing/avsløring/eksport logges i `DataAccessLog`; hver tilstandsendring i `AuditLog`.
- Ingen norske fødselsnumre lagres – noensinne.
