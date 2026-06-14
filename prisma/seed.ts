/**
 * Seed script: demo users, categories, plans, pricing rules, demand requests,
 * offers, a campaign, articles and FAQ. Idempotent – safe to re-run.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { encryptJson } from "../lib/encryption";
import { createPublicSnapshot } from "../lib/privacy/snapshot";
import { scoreOffer } from "../features/offers/scoring";
import { CATEGORY_DEFINITIONS } from "../features/categories/definitions";
import { defaultRequestExpiry } from "../lib/privacy/retention";
import type { PublicSnapshot } from "../features/categories/types";

const db = new PrismaClient();

const DEMO_PASSWORD = "Demo123!";

// ---------------------------------------------------------------------------
// Plans
// ---------------------------------------------------------------------------

const PLANS = [
  {
    slug: "starter",
    name: "Starter",
    monthlyPriceNok: 490,
    includedCredits: 50,
    maxSeats: 2,
    maxActiveCampaigns: 0,
    featuresJson: {
      savedSearches: false,
      offerTemplates: false,
      bulkCampaigns: false,
      apiAccess: false,
      webhooks: false,
      analytics: false,
    },
    stripePriceEnv: process.env.STRIPE_STARTER_PRICE_ID,
  },
  {
    slug: "growth",
    name: "Growth",
    monthlyPriceNok: 1490,
    includedCredits: 200,
    maxSeats: 5,
    maxActiveCampaigns: 3,
    featuresJson: {
      savedSearches: true,
      offerTemplates: true,
      bulkCampaigns: true,
      apiAccess: false,
      webhooks: true,
      analytics: false,
    },
    stripePriceEnv: process.env.STRIPE_GROWTH_PRICE_ID,
  },
  {
    slug: "pro",
    name: "Pro",
    monthlyPriceNok: 3490,
    includedCredits: 600,
    maxSeats: 15,
    maxActiveCampaigns: 10,
    featuresJson: {
      savedSearches: true,
      offerTemplates: true,
      bulkCampaigns: true,
      advancedCampaigns: true,
      apiAccess: true,
      webhooks: true,
      analytics: true,
    },
    stripePriceEnv: process.env.STRIPE_PRO_PRICE_ID,
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    monthlyPriceNok: 0, // custom pricing – "Etter avtale"
    includedCredits: 2000,
    maxSeats: 50,
    maxActiveCampaigns: 50,
    featuresJson: {
      savedSearches: true,
      offerTemplates: true,
      bulkCampaigns: true,
      advancedCampaigns: true,
      apiAccess: true,
      webhooks: true,
      analytics: true,
      sso: true,
      dedicatedSupport: true,
    },
    stripePriceEnv: undefined,
  },
];

// ---------------------------------------------------------------------------
// Pricing rules
// ---------------------------------------------------------------------------

const PRICING_RULES = [
  {
    name: "Standard tilbudskostnad",
    scope: "CREDIT_COST" as const,
    ruleJson: {
      base: 5,
      modifiers: [
        {
          description: "Fersk forespørsel (under 24 timer)",
          if: { freshnessHours: { lt: 24 } },
          add: 2,
        },
        {
          description: "Høy konkurranse (4+ tilbud allerede)",
          if: { existingOfferCount: { gte: 4 } },
          add: -1,
        },
        { description: "Pro-rabatt", if: { planSlug: "pro" }, multiply: 0.8 },
        { description: "Enterprise-rabatt", if: { planSlug: "enterprise" }, multiply: 0.7 },
      ],
      min: 1,
      max: 50,
    },
  },
  {
    name: "Kampanjesending per mottaker",
    scope: "CAMPAIGN_SEND" as const,
    ruleJson: {
      base: 3,
      modifiers: [
        { description: "Volumrabatt (20+ mottakere)", if: { volume: { gte: 20 } }, multiply: 0.8 },
        { description: "Pro-rabatt", if: { planSlug: "pro" }, multiply: 0.9 },
      ],
      min: 1,
      max: 20,
    },
  },
  {
    name: "Kontaktopplåsing etter samtykke",
    scope: "CONTACT_UNLOCK" as const,
    ruleJson: {
      base: 10,
      modifiers: [{ description: "Pro-rabatt", if: { planSlug: "pro" }, multiply: 0.8 }],
      min: 1,
      max: 50,
    },
  },
];

// ---------------------------------------------------------------------------
// Articles & FAQ
// ---------------------------------------------------------------------------

const ARTICLES = [
  {
    slug: "billig-strom-uten-a-bli-oppringt",
    title: "Hvordan finne billig strøm uten å bli oppringt?",
    excerpt:
      "Du kan sammenligne strømavtaler og motta konkrete tilbud uten å oppgi telefonnummeret ditt. Slik gjør du det.",
    categorySlug: "strom",
    body: `## Kort svar

Du finner billig strøm uten å bli nedringt ved å bruke en markedsplass der strømleverandørene **ikke får kontaktinformasjonen din**. På Spender beskriver du forbruket ditt anonymt, og leverandørene sender tilbud til innboksen din i appen – ikke til telefonen din.

## Problemet med tradisjonelle sammenligningstjenester

Mange «gratis» strømsammenligninger er i praksis leadsalg: du legger inn navn og telefonnummer, og opplysningene selges videre til flere leverandører som ringer deg. Resultatet er mas, press og tilbud det er vanskelig å sammenligne.

## Slik fungerer den personvernvennlige måten

1. **Beskriv behovet ditt anonymt.** Oppgi boligtype, omtrentlig årsforbruk og ønsket avtaletype. Postnummeret brukes kun til å beregne prisområde – leverandørene ser bare regionen.
2. **Motta strukturerte tilbud.** Leverandørene ser en anonymisert oppsummering og sender tilbud med påslag, månedsgebyr og bindingstid i samme format, slik at de kan sammenlignes direkte.
3. **Sammenlign og velg.** En forklarbar poengsum viser hvorfor ett tilbud kommer bedre ut enn et annet – lavere kostnad, færre gebyrer, kortere binding.
4. **Del kontaktinfo kun med vinneren.** Først når du aksepterer et tilbud velger du om den ene leverandøren skal få kontaktinformasjonen din.

## Hva bør du se på i et strømtilbud?

- **Påslag per kWh** – den viktigste prisfaktoren på spotprisavtaler.
- **Fast månedsbeløp** – små beløp blir store over et år.
- **Bindingstid** – unngå lang binding med mindre fastprisen er god.
- **Fakturagebyr** – velg digital faktura uten gebyr.

## Vanlige spørsmål

**Må jeg oppgi fødselsnummer?** Nei. Seriøse tjenester trenger ikke fødselsnummeret ditt for å gi tilbud.

**Kan leverandøren ringe meg?** Ikke uten at du eksplisitt har delt nummeret ditt med akkurat den leverandøren.`,
  },
  {
    slug: "hva-bor-du-sammenligne-i-et-mobilabonnement",
    title: "Hva bør du sammenligne i et mobilabonnement?",
    excerpt:
      "Pris per gigabyte er bare halve bildet. Her er feltene som faktisk avgjør om et mobilabonnement passer deg.",
    categorySlug: "mobilabonnement",
    body: `## Kort svar

Sammenlign **månedspris, datamengde, nettverk, bindingstid, roaming og familierabatt** – ikke bare prisen. Et billig abonnement med feil dekning eller skjult etableringsgebyr blir fort dyrt.

## De seks viktigste feltene

1. **Månedspris** – totalprisen inkludert alle faste kostnader.
2. **Datamengde og hastighet etter kvote.** «Ubegrenset» har ofte redusert hastighet etter et tak. Sjekk hva hastigheten reduseres til.
3. **Nettverk.** Telenor-, Telia- og Ice-nettet har ulik dekning. Velg etter hvor du faktisk bor og ferdes.
4. **Bindingstid.** Uten binding kan du bytte når et bedre tilbud dukker opp.
5. **Roaming i EU/EØS.** Reiser du mye, sjekk hva som er inkludert.
6. **Etableringsgebyr og eSIM.** Engangskostnader og støtte for eSIM varierer.

## Familieabonnement: regn på totalen

Familierabatter ser bra ut per linje, men sammenlign totalprisen for hele husstanden mot å velge billigste enkeltabonnement per person.

## Slik får du tilbud uten å oppgi nummeret ditt

På Spender beskriver du behovet – antall brukere, databehov, dekningsområde – og mobiloperatørene sender strukturerte tilbud uten å vite hvem du er. Telefonnummeret ditt deles aldri uten ditt eksplisitte samtykke per leverandør.`,
  },
  {
    slug: "hva-trenger-forsikringsselskap-for-a-gi-tilbud",
    title: "Hva trenger forsikringsselskap for å gi et tilbud?",
    excerpt:
      "Mindre enn du tror. Forsikringsselskap kan estimere pris ut fra anonymiserte opplysninger – uten navn, adresse eller fødselsnummer.",
    categorySlug: "forsikring",
    body: `## Kort svar

For et **prisestimat** trenger forsikringsselskapet bare å vite *hva* som skal forsikres, *hvor* (region), skadehistorikk og ønsket egenandel. Navn, eksakt adresse, registreringsnummer og fødselsnummer trengs først ved **avtaleinngåelse** – ikke for å gi tilbud.

## Hva som faktisk påvirker prisen

| Forsikringstype | Viktigste prisfaktorer |
| --- | --- |
| Innbo | Boligtype, areal, region, sikkerhetstiltak |
| Bil | Biltype/alder, kjørelengde, region, skadehistorikk |
| Reise | Antall personer, reisemønster, dekningsnivå |
| Bolig | Byggeår, størrelse, region, tidligere skader |

## Hvorfor du ikke bør dele mer enn nødvendig

Når du legger inn navn og telefonnummer i et tilbudsskjema, behandles det ofte som et «lead» som utløser oppringninger. Du får bedre forhandlingsposisjon ved å sammenligne skriftlige tilbud i ro og mak først.

## Slik fungerer det på Spender

1. Du beskriver objektet anonymt: type, region, skadehistorikk, ønsket egenandel.
2. Forsikringsselskapene ser kun den anonymiserte oppsummeringen og sender strukturerte tilbud med premie, egenandel og dekning.
3. Du sammenligner, stiller spørsmål i appen, og deler først identiteten din med selskapet du velger.

**Husk:** Endelig pris kan justeres når selskapet får fullstendige opplysninger ved avtaleinngåelse, men seriøse aktører gir estimater som holder seg nær sluttprisen.`,
  },
];

const FAQ_ITEMS = [
  {
    question: "Hva er Spender?",
    answer:
      "Spender er en personvernvennlig markedsplass der du beskriver hva du vil ha tilbud på – strøm, mobilabonnement eller forsikring – og mottar strukturerte tilbud fra godkjente bedrifter, uten å oppgi navn eller telefonnummer.",
    audience: "general",
    sortOrder: 0,
  },
  {
    question: "Selger Spender kontaktinformasjonen min?",
    answer:
      "Nei. Spender selger ikke kontaktinformasjonen din til bedrifter. Bedrifter ser kun en anonymisert oppsummering av behovet ditt. Kontaktinformasjon deles bare hvis du selv eksplisitt velger å dele den med én konkret bedrift.",
    audience: "consumer",
    sortOrder: 1,
  },
  {
    question: "Hva ser bedriftene om meg?",
    answer:
      "Bedrifter ser et pseudonymt alias (f.eks. «Forbruker #A82Q») og en anonymisert oppsummering: region, behovsbeskrivelse og preferanser. Navn, e-post, telefonnummer, adresse og lignende er kryptert og aldri synlig uten ditt samtykke.",
    audience: "consumer",
    sortOrder: 2,
  },
  {
    question: "Koster det noe å bruke Spender som forbruker?",
    answer: "Nei, Spender er gratis for forbrukere. Bedriftene betaler for å sende tilbud.",
    audience: "consumer",
    sortOrder: 3,
  },
  {
    question: "Kan jeg trekke tilbake et samtykke?",
    answer:
      "Ja. Under Personvern i appen ser du hvilke bedrifter som har fått kontakttilgang, og du kan trekke tilbake samtykket når som helst. Du kan også eksportere dataene dine eller be om sletting av kontoen.",
    audience: "consumer",
    sortOrder: 4,
  },
  {
    question: "Hvordan blir bedrifter godkjent?",
    answer:
      "Bedrifter verifiseres mot Brønnøysundregistrene ved registrering og gjennomgås manuelt av Spender før de kan sende tilbud. Bedrifter som misbruker plattformen suspenderes.",
    audience: "business",
    sortOrder: 5,
  },
  {
    question: "Hva koster det for bedrifter?",
    answer:
      "Bedrifter velger et månedsabonnement (Starter, Growth, Pro eller Enterprise) som inkluderer kreditter. Å sende et tilbud koster kreditter; bulk-kampanjer og kontaktopplåsing likeså. Ingen betaling per «lead» – dere betaler for tilbud, ikke persondata.",
    audience: "business",
    sortOrder: 6,
  },
  {
    question: "Hvordan sammenlignes tilbudene?",
    answer:
      "Hvert tilbud får en forklarbar poengsum basert på estimert kostnad, gebyrer, bindingstid og hvor godt tilbudet matcher behovet. Hele utregningen vises i klartekst. Dette er en forklarbar sammenligning, ikke finansiell rådgivning.",
    audience: "general",
    sortOrder: 7,
  },
];

// ---------------------------------------------------------------------------
// Demo demand requests (per extra consumer)
// ---------------------------------------------------------------------------

interface DemoRequest {
  categorySlug: string;
  title: string;
  payload: Record<string, unknown>;
  daysAgo: number;
}

const DEMO_REQUESTS: DemoRequest[] = [
  {
    categorySlug: "strom",
    title: "Strømavtale til leilighet i Oslo",
    daysAgo: 1,
    payload: {
      postalCode: "0571",
      dwellingType: "apartment",
      householdSizeRange: "2",
      exactAnnualKwh: 12000,
      currentSupplier: "Fjordkraft",
      currentContractType: "spot",
      hasElbil: true,
      hasSolar: false,
      wantsGreenEnergy: false,
      preferredContractType: "spot_or_fixed",
      moveInOrSwitchDate: "30d",
      acceptsDigitalInvoice: true,
    },
  },
  {
    categorySlug: "strom",
    title: "Strøm til enebolig med solceller",
    daysAgo: 3,
    payload: {
      postalCode: "7030",
      dwellingType: "house",
      householdSizeRange: "3-4",
      exactAnnualKwh: 22000,
      currentContractType: "fixed",
      hasElbil: false,
      hasSolar: true,
      wantsGreenEnergy: true,
      preferredContractType: "spot",
      moveInOrSwitchDate: "asap",
      acceptsDigitalInvoice: true,
    },
  },
  {
    categorySlug: "mobilabonnement",
    title: "Familieabonnement, 4 linjer",
    daysAgo: 2,
    payload: {
      numberOfUsers: "3-4",
      dataNeedGbRange: "15-30",
      needsUnlimitedData: false,
      preferredNetworkCoverageRegion: "oslo_viken",
      hasBinding: false,
      needsEsim: true,
      needsFamilyPlan: true,
      internationalUse: false,
      currentProvider: "Telia",
    },
  },
  {
    categorySlug: "mobilabonnement",
    title: "Abonnement med mye data og roaming",
    daysAgo: 5,
    payload: {
      numberOfUsers: "1",
      dataNeedGbRange: "unlimited",
      needsUnlimitedData: true,
      preferredNetworkCoverageRegion: "hele_landet",
      hasBinding: true,
      needsEsim: true,
      needsFamilyPlan: false,
      internationalUse: true,
    },
  },
  {
    categorySlug: "forsikring",
    title: "Innboforsikring for leilighet",
    daysAgo: 1,
    payload: {
      insuranceType: "innbo",
      postalCode: "5006",
      objectSummary: "Leilighet 65 m², bygget 2015, 2. etasje, alarm installert",
      claimsHistoryRange: "0",
      preferredDeductibleRange: "low",
    },
  },
  {
    categorySlug: "forsikring",
    title: "Bilforsikring for elbil",
    daysAgo: 4,
    payload: {
      insuranceType: "bil",
      postalCode: "4014",
      objectSummary: "Elbil 2023-modell, ca. 10 000 km/år, parkeres i garasje",
      licensePlate: "EL12345",
      claimsHistoryRange: "1",
      preferredDeductibleRange: "medium",
      currentProvider: "If",
    },
  },
];

// Offers the demo business sends to the first few requests.
const DEMO_OFFERS: Record<
  string,
  { title: string; summary: string; payload: Record<string, unknown> }
> = {
  "Strømavtale til leilighet i Oslo": {
    title: "Spotpris med lavt påslag og elbilfordel",
    summary:
      "Spotprisavtale uten bindingstid, 0 kr i fakturagebyr ved digital faktura og egen app med forbruksoversikt time for time.",
    payload: {
      monthlyFeeNok: 29,
      markupOrePerKwh: 2.5,
      contractType: "spot",
      bindingMonths: 0,
      invoiceFeeNok: 0,
      appIncluded: true,
      greenEnergyOption: false,
      estimatedMonthlyCostNok: 1180,
      termsUrl: "https://example.com/vilkar",
      cancellationTerms: "Ingen bindingstid. Avtalen kan sies opp med 14 dagers varsel.",
    },
  },
  "Strøm til enebolig med solceller": {
    title: "Spotavtale med plusskunde-ordning",
    summary:
      "Spotpris med god innmatingspris for solstrømmen din, fornybar energi med opprinnelsesgaranti inkludert.",
    payload: {
      monthlyFeeNok: 39,
      markupOrePerKwh: 3.2,
      contractType: "spot",
      bindingMonths: 0,
      invoiceFeeNok: 0,
      appIncluded: true,
      greenEnergyOption: true,
      estimatedMonthlyCostNok: 2150,
      termsUrl: "https://example.com/vilkar",
      cancellationTerms: "Ingen bindingstid.",
    },
  },
  "Familieabonnement, 4 linjer": {
    title: "Familiepakke 4 linjer med eSIM",
    summary:
      "20 GB per linje i Telenor-nettet, familierabatt fra linje to, eSIM og fri tale/SMS inkludert.",
    payload: {
      monthlyPriceNok: 996,
      dataGb: 20,
      speedLimit: "Ingen begrensning innenfor kvoten",
      network: "telenor",
      esimIncluded: true,
      familyDiscount: true,
      bindingMonths: 0,
      roamingIncluded: true,
      setupFeeNok: 0,
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function upsertUser(params: {
  email: string;
  role: "CONSUMER" | "BUSINESS_OWNER" | "ADMIN";
  passwordHash: string;
}) {
  return db.user.upsert({
    where: { email: params.email },
    update: {},
    create: {
      email: params.email,
      passwordHash: params.passwordHash,
      role: params.role,
      status: "ACTIVE",
      emailVerifiedAt: new Date(),
    },
  });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("🌱 Seeder Spender …");
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  // 1. Categories ------------------------------------------------------------
  const categoryBySlug = new Map<string, { id: string }>();
  for (const def of CATEGORY_DEFINITIONS) {
    const category = await db.category.upsert({
      where: { slug: def.slug },
      update: {
        name: def.name,
        description: def.description,
        consumerFormSchemaJson: def.consumerFormSchema as unknown as Prisma.InputJsonValue,
        businessOfferSchemaJson: def.offerSchema as unknown as Prisma.InputJsonValue,
        publicSnapshotRulesJson: def.snapshotRules as unknown as Prisma.InputJsonValue,
      },
      create: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        consumerFormSchemaJson: def.consumerFormSchema as unknown as Prisma.InputJsonValue,
        businessOfferSchemaJson: def.offerSchema as unknown as Prisma.InputJsonValue,
        publicSnapshotRulesJson: def.snapshotRules as unknown as Prisma.InputJsonValue,
        isActive: true,
      },
    });
    categoryBySlug.set(def.slug, category);
  }
  console.log(`  ✓ ${CATEGORY_DEFINITIONS.length} kategorier`);

  // 2. Plans -----------------------------------------------------------------
  for (const plan of PLANS) {
    await db.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: {
        name: plan.name,
        monthlyPriceNok: plan.monthlyPriceNok,
        includedCredits: plan.includedCredits,
        maxSeats: plan.maxSeats,
        maxActiveCampaigns: plan.maxActiveCampaigns,
        featuresJson: plan.featuresJson as Prisma.InputJsonValue,
        stripePriceId: plan.stripePriceEnv || null,
      },
      create: {
        slug: plan.slug,
        name: plan.name,
        monthlyPriceNok: plan.monthlyPriceNok,
        includedCredits: plan.includedCredits,
        maxSeats: plan.maxSeats,
        maxActiveCampaigns: plan.maxActiveCampaigns,
        featuresJson: plan.featuresJson as Prisma.InputJsonValue,
        stripePriceId: plan.stripePriceEnv || null,
        isActive: true,
      },
    });
  }
  console.log(`  ✓ ${PLANS.length} abonnementsplaner`);

  // 3. Pricing rules ----------------------------------------------------------
  for (const rule of PRICING_RULES) {
    const existing = await db.pricingRule.findFirst({ where: { name: rule.name } });
    if (existing) {
      await db.pricingRule.update({
        where: { id: existing.id },
        data: { ruleJson: rule.ruleJson as unknown as Prisma.InputJsonValue, isActive: true },
      });
    } else {
      await db.pricingRule.create({
        data: {
          name: rule.name,
          scope: rule.scope,
          ruleJson: rule.ruleJson as unknown as Prisma.InputJsonValue,
          isActive: true,
        },
      });
    }
  }
  console.log(`  ✓ ${PRICING_RULES.length} prisregler`);

  // 4. Demo users --------------------------------------------------------------
  const consumer = await upsertUser({
    email: "consumer@spender.local",
    role: "CONSUMER",
    passwordHash,
  });
  await db.consumerProfile.upsert({
    where: { userId: consumer.id },
    update: {},
    create: {
      userId: consumer.id,
      displayAlias: "Forbruker #A82Q",
      ageRange: "30-39",
      region: "Oslo/Viken",
      householdType: "couple",
    },
  });
  await db.userPrivateProfile.upsert({
    where: { userId: consumer.id },
    update: {},
    create: {
      userId: consumer.id,
      encryptedPayload: encryptJson({
        fullName: "Demo Forbruker",
        phone: "+47 900 00 001",
        address: "Demogata 1, 0571 Oslo",
        emailPreferences: { transactional: true, marketing: false },
      }),
    },
  });

  const businessOwner = await upsertUser({
    email: "business@spender.local",
    role: "BUSINESS_OWNER",
    passwordHash,
  });

  const admin = await upsertUser({
    email: "admin@spender.local",
    role: "ADMIN",
    passwordHash,
  });
  console.log("  ✓ Demobrukere (consumer/business/admin @spender.local)");

  // 5. Demo organization (verified, Growth plan, credits) ----------------------
  const organization = await db.organization.upsert({
    where: { orgNumber: "923609016" },
    update: { status: "VERIFIED" },
    create: {
      name: "Demo Energi & Tele AS",
      orgNumber: "923609016",
      website: "https://demo-energi.example.no",
      status: "VERIFIED",
      billingStatus: "ACTIVE",
    },
  });
  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: organization.id, userId: businessOwner.id },
    },
    update: {},
    create: { organizationId: organization.id, userId: businessOwner.id, role: "OWNER" },
  });

  const existingVerification = await db.businessVerification.findFirst({
    where: { organizationId: organization.id },
  });
  if (!existingVerification) {
    await db.businessVerification.create({
      data: {
        organizationId: organization.id,
        provider: "BRREG",
        status: "PASSED",
        resultJson: {
          navn: "DEMO ENERGI & TELE AS",
          organisasjonsnummer: "923609016",
          organisasjonsform: "AS",
          registrertIMvaregisteret: true,
          source: "seed",
        },
        verifiedAt: new Date(),
        reviewedByAdminId: admin.id,
      },
    });
  }

  const growthPlan = await db.subscriptionPlan.findUniqueOrThrow({ where: { slug: "growth" } });
  const existingSub = await db.subscription.findFirst({
    where: { organizationId: organization.id, status: "ACTIVE" },
  });
  if (!existingSub) {
    const sub = await db.subscription.create({
      data: {
        organizationId: organization.id,
        planId: growthPlan.id,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await db.creditLedger.create({
      data: {
        organizationId: organization.id,
        amount: growthPlan.includedCredits,
        type: "GRANT",
        reason: `Inkluderte kreditter – ${growthPlan.name} (seed)`,
        referenceType: "subscription",
        referenceId: sub.id,
        idempotencyKey: `seed-sub-grant-${sub.id}`,
      },
    });
  }
  console.log("  ✓ Demo Energi & Tele AS (godkjent, Growth-plan, kreditter)");

  // A second, pending organization so the admin has something to review.
  const pendingOrgOwner = await upsertUser({
    email: "pending-business@spender.local",
    role: "BUSINESS_OWNER",
    passwordHash,
  });
  const pendingOrg = await db.organization.upsert({
    where: { orgNumber: "918654062" },
    update: {},
    create: {
      name: "Nordlys Forsikring AS",
      orgNumber: "918654062",
      website: "https://nordlys-forsikring.example.no",
      status: "PENDING_REVIEW",
    },
  });
  await db.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: pendingOrg.id, userId: pendingOrgOwner.id },
    },
    update: {},
    create: { organizationId: pendingOrg.id, userId: pendingOrgOwner.id, role: "OWNER" },
  });

  // 6. Extra consumers + demand requests ---------------------------------------
  const extraConsumerEmails = [
    "demo-forbruker-2@spender.local",
    "demo-forbruker-3@spender.local",
    "demo-forbruker-4@spender.local",
    "demo-forbruker-5@spender.local",
    "demo-forbruker-6@spender.local",
  ];
  const aliasSuffixes = ["B17K", "C93M", "D45P", "E28R", "F61T"];
  const consumers = [consumer];
  for (const [i, email] of extraConsumerEmails.entries()) {
    const user = await upsertUser({ email, role: "CONSUMER", passwordHash });
    await db.consumerProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        displayAlias: `Forbruker #${aliasSuffixes[i] ?? `X${i}Z`}`,
        region: null,
      },
    });
    await db.userPrivateProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        encryptedPayload: encryptJson({
          fullName: `Demo Forbruker ${i + 2}`,
          phone: `+47 900 00 0${i + 2}0`,
          emailPreferences: { transactional: true, marketing: false },
        }),
      },
    });
    consumers.push(user);
  }

  const createdRequests: { id: string; title: string; categorySlug: string }[] = [];
  for (const [i, demo] of DEMO_REQUESTS.entries()) {
    const owner = consumers[i % consumers.length]!;
    const def = CATEGORY_DEFINITIONS.find((d) => d.slug === demo.categorySlug)!;
    const category = categoryBySlug.get(demo.categorySlug)!;

    const existing = await db.demandRequest.findFirst({
      where: { consumerId: owner.id, title: demo.title },
    });
    if (existing) {
      createdRequests.push({ id: existing.id, title: demo.title, categorySlug: demo.categorySlug });
      continue;
    }

    const snapshot = createPublicSnapshot(
      { consumerFormSchema: def.consumerFormSchema, snapshotRules: def.snapshotRules },
      demo.payload,
    );

    const created = await db.demandRequest.create({
      data: {
        consumerId: owner.id,
        categoryId: category.id,
        title: demo.title,
        status: "ACTIVE",
        publicSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
        encryptedPrivatePayload: encryptJson(demo.payload),
        region: snapshot.region,
        priceZone: snapshot.priceZone,
        expiresAt: defaultRequestExpiry(daysAgo(demo.daysAgo)),
        createdAt: daysAgo(demo.daysAgo),
        versions: {
          create: {
            versionNumber: 1,
            publicSnapshotJson: snapshot as unknown as Prisma.InputJsonValue,
            encryptedPrivatePayload: encryptJson(demo.payload),
          },
        },
      },
    });
    createdRequests.push({ id: created.id, title: demo.title, categorySlug: demo.categorySlug });
  }
  console.log(`  ✓ ${createdRequests.length} forespørsler i markedet`);

  // 7. Offers from the demo business --------------------------------------------
  let offersCreated = 0;
  for (const request of createdRequests) {
    const offerDef = DEMO_OFFERS[request.title];
    if (!offerDef) continue;

    const existing = await db.offer.findUnique({
      where: {
        organizationId_demandRequestId: {
          organizationId: organization.id,
          demandRequestId: request.id,
        },
      },
    });
    if (existing) continue;

    const def = CATEGORY_DEFINITIONS.find((d) => d.slug === request.categorySlug)!;
    const dbRequest = await db.demandRequest.findUniqueOrThrow({ where: { id: request.id } });
    const snapshot = dbRequest.publicSnapshotJson as unknown as PublicSnapshot;
    const score = scoreOffer(def.offerSchema.scoring, offerDef.payload, snapshot);

    await db.$transaction(async (tx) => {
      const offer = await tx.offer.create({
        data: {
          organizationId: organization.id,
          demandRequestId: request.id,
          categoryId: categoryBySlug.get(request.categorySlug)!.id,
          status: "SENT",
          title: offerDef.title,
          summary: offerDef.summary,
          offerPayloadJson: offerDef.payload as Prisma.InputJsonValue,
          priceEstimateJson: { credits: 5 } as Prisma.InputJsonValue,
          createdByUserId: businessOwner.id,
          sentAt: daysAgo(0.5),
          comparisonScore: {
            create: {
              score: score.score,
              explanationJson: score.explanation as unknown as Prisma.InputJsonValue,
            },
          },
        },
      });
      await tx.creditLedger.create({
        data: {
          organizationId: organization.id,
          amount: -5,
          type: "SPEND",
          reason: `Tilbud sendt – ${request.title} (seed)`,
          referenceType: "offer",
          referenceId: offer.id,
          idempotencyKey: `seed-offer-spend-${request.id}`,
        },
      });
      await tx.notification.create({
        data: {
          userId: dbRequest.consumerId,
          type: "offer_received",
          title: "Nytt tilbud mottatt",
          body: `Demo Energi & Tele AS har sendt deg et tilbud på «${request.title}».`,
          linkUrl: `/app/tilbud/${offer.id}`,
        },
      });
      offersCreated += 1;
    });
  }
  console.log(`  ✓ ${offersCreated} tilbud fra demobedriften`);

  // 8. Offer template + saved search + draft campaign ----------------------------
  const stromTemplate = DEMO_OFFERS["Strømavtale til leilighet i Oslo"]!;
  const existingTemplate = await db.offerTemplate.findFirst({
    where: { organizationId: organization.id, name: "Spotpris standard" },
  });
  if (!existingTemplate) {
    await db.offerTemplate.create({
      data: {
        organizationId: organization.id,
        categorySlug: "strom",
        name: "Spotpris standard",
        payloadJson: {
          title: stromTemplate.title,
          summary: stromTemplate.summary,
          payload: stromTemplate.payload,
        } as Prisma.InputJsonValue,
      },
    });
  }

  const existingSearch = await db.savedSearch.findFirst({
    where: { organizationId: organization.id, name: "Strøm i Oslo/Viken" },
  });
  if (!existingSearch) {
    await db.savedSearch.create({
      data: {
        organizationId: organization.id,
        userId: businessOwner.id,
        name: "Strøm i Oslo/Viken",
        criteriaJson: { categorySlug: "strom", region: "Oslo" },
        notifyByEmail: false,
      },
    });
  }

  const existingCampaign = await db.bulkCampaign.findFirst({
    where: { organizationId: organization.id, name: "Vårkampanje spotpris" },
  });
  if (!existingCampaign) {
    await db.bulkCampaign.create({
      data: {
        organizationId: organization.id,
        categoryId: categoryBySlug.get("strom")!.id,
        name: "Vårkampanje spotpris",
        status: "DRAFT",
        targetCriteriaJson: { maxAgeDays: 14 } as Prisma.InputJsonValue,
        offerTemplateJson: {
          title: stromTemplate.title,
          summary: stromTemplate.summary,
          payload: stromTemplate.payload,
        } as Prisma.InputJsonValue,
        estimatedRecipientCount: 1,
        estimatedCreditCost: 3,
        createdByUserId: businessOwner.id,
      },
    });
  }
  console.log("  ✓ Tilbudsmal, lagret søk og kampanjeutkast");

  // 9. Articles & FAQ -------------------------------------------------------------
  for (const article of ARTICLES) {
    await db.article.upsert({
      where: { slug: article.slug },
      update: {
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        categorySlug: article.categorySlug,
      },
      create: {
        slug: article.slug,
        title: article.title,
        excerpt: article.excerpt,
        body: article.body,
        categorySlug: article.categorySlug,
        status: "PUBLISHED",
        publishedAt: daysAgo(7),
      },
    });
  }
  for (const item of FAQ_ITEMS) {
    const existing = await db.faqItem.findFirst({ where: { question: item.question } });
    if (existing) {
      await db.faqItem.update({
        where: { id: existing.id },
        data: { answer: item.answer, audience: item.audience, sortOrder: item.sortOrder },
      });
    } else {
      await db.faqItem.create({ data: { ...item, isActive: true } });
    }
  }
  console.log(`  ✓ ${ARTICLES.length} artikler og ${FAQ_ITEMS.length} FAQ-punkter`);

  console.log("\n✅ Seed fullført. Demokontoer (passord: Demo123!):");
  console.log("   consumer@spender.local  – forbruker med forespørsler og tilbud");
  console.log("   business@spender.local  – Demo Energi & Tele AS (godkjent, Growth)");
  console.log("   admin@spender.local     – administrator");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
