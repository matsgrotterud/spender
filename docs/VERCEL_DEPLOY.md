# Deploy Spender på Vercel

500-feil på https://spender-chi-one.vercel.app skyldes nesten alltid **manglende database og miljøvariabler**. Appen trenger PostgreSQL i produksjon – den kan ikke bruke lokal `.pgdata/`.

## Oversikt (ca. 15 min)

1. Opprett gratis PostgreSQL (Neon anbefales)
2. Legg inn miljøvariabler i Vercel
3. Push kode → Vercel bygger og kjører migrasjoner automatisk
4. Seed demo-data én gang fra din maskin
5. Test `/api/health` og forsiden

---

## Steg 1: Opprett database (Neon – gratis)

1. Gå til [neon.tech](https://neon.tech) og opprett prosjekt (region EU anbefales).
2. Kopier **Connection string**:
   - **Pooled** (for appen): ofte merket «Pooled» / inkluderer `-pooler` i hostnavnet
   - **Direct** (for migrasjoner): «Direct connection» uten pooler

Du får noe i stil med:

```
postgresql://user:pass@ep-xxx-pooler.eu-central-1.aws.neon.tech/neondb?sslmode=require
postgresql://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

**Alternativ:** Vercel Storage → Postgres (i Vercel-dashboardet). Da får du `POSTGRES_URL` – sett den som både `DATABASE_URL` og `DIRECT_URL`.

---

## Steg 2: Generer hemmeligheter (lokalt)

Kjør i terminal:

```bash
openssl rand -hex 32   # → AUTH_SECRET og NEXTAUTH_SECRET (samme verdi)
openssl rand -hex 32   # → ENCRYPTION_KEY (64 hex-tegn)
```

**Viktig:** Ta backup av `ENCRYPTION_KEY`. Mister du den, er all kryptert persondata uleselig.

---

## Steg 3: Miljøvariabler i Vercel

Vercel → prosjektet **spender** → **Settings** → **Environment Variables**.

Legg inn for **Production** (og gjerne Preview):

| Variabel | Verdi |
| --- | --- |
| `DATABASE_URL` | Neon **pooled** connection string (eller Vercel Postgres `POSTGRES_URL`) |
| `DIRECT_URL` | Neon **direct** connection string. **Mangler denne?** Sett samme verdi som `DATABASE_URL` – build-scriptet faller tilbake automatisk, men det er tryggest å legge den inn eksplisitt. |
| `AUTH_SECRET` | output fra openssl (steg 2) |
| `NEXTAUTH_SECRET` | **samme** som AUTH_SECRET |
| `NEXTAUTH_URL` | `https://spender-chi-one.vercel.app` |
| `APP_URL` | `https://spender-chi-one.vercel.app` |
| `ENCRYPTION_KEY` | output fra openssl (steg 2, 64 tegn) |
| `FEATURE_MOCK_BILLING` | `true` |
| `FEATURE_MOCK_EMAIL` | `true` |
| `SEED_DEMO_DATA` | `true` (første deploy – oppretter demobrukere automatisk; kan fjernes senere) |
| `FEATURE_STRIPE` | `false` |
| `ADMIN_EMAIL` | din e-post |

Stripe, Resend, Redis osv. kan vente – mock-modus fungerer fint til du er klar.

---

## Steg 4: Deploy

```bash
git add .
git commit -m "Prepare Vercel production deploy"
git push origin main
```

Vercel bygger med:

```
prisma generate && prisma migrate deploy && next build
```

Migrasjoner kjøres automatisk ved hver deploy.

---

## Steg 5: Seed demo-data (én gang)

Fra din maskin, med produksjons-URL i env:

```bash
export DATABASE_URL="postgresql://..."   # direct eller pooled OK for seed
export DIRECT_URL="postgresql://..."     # samme eller direct
export ENCRYPTION_KEY="..."              # samme som i Vercel
npm run db:seed
```

Da får du demokontoer på live:

| Konto | Passord |
| --- | --- |
| `consumer@spender.local` | `Demo123!` |
| `business@spender.local` | `Demo123!` |
| `admin@spender.local` | `Demo123!` |

---

## Steg 6: Verifiser

1. https://spender-chi-one.vercel.app/api/health → skal returnere `{ "ok": true }`
2. https://spender-chi-one.vercel.app/ → landingsside med FAQ
3. https://spender-chi-one.vercel.app/logg-inn → innlogging

---

## Feilsøking

| Symptom | Løsning |
| --- | --- |
| 500 på forsiden | Sjekk `/api/health`. Mangler DB eller tabeller → sett `DATABASE_URL`, redeploy, seed |
| `databaseError: ...` i health | Feil connection string, eller Neon-prosjekt sover (wake ved første request) |
| Innlogging virker ikke | `AUTH_SECRET` / `NEXTAUTH_SECRET` / `NEXTAUTH_URL` må være satt |
| Build feiler på migrate | `DIRECT_URL` må peke til **direct** (ikke pooler) for Neon |
| Tom FAQ / tomt marked | Kjør `npm run db:seed` mot produksjons-DB |

---

## Senere (valgfritt)

- **Stripe:** testnøkler + webhook → se `docs/PROVIDE_KEYS_AND_CONFIG.md`
- **Resend:** e-postvarsler
- **Upstash Redis:** `REDIS_URL` for rate limiting på tvers av instanser
- **Eget domene:** Vercel → Domains, oppdater `APP_URL` og `NEXTAUTH_URL`
