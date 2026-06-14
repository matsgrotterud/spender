/**
 * Seed definitions for the three launch categories. These are written into
 * the Category table by prisma/seed.ts; at runtime the app always reads the
 * schemas from the database so admins can edit them.
 */
import type { ConsumerFormSchema, OfferSchema, SnapshotRule } from "./types";

export interface CategoryDefinition {
  slug: string;
  name: string;
  description: string;
  consumerFormSchema: ConsumerFormSchema;
  offerSchema: OfferSchema;
  snapshotRules: SnapshotRule[];
}

// ---------------------------------------------------------------------------
// Strøm
// ---------------------------------------------------------------------------

const strom: CategoryDefinition = {
  slug: "strom",
  name: "Strøm",
  description:
    "Få tilbud på strømavtale fra flere leverandører – uten å oppgi navn eller telefonnummer.",
  consumerFormSchema: {
    fields: [
      {
        key: "postalCode",
        label: "Postnummer",
        type: "postalCode",
        privacy: "private",
        required: true,
        helpText:
          "Brukes kun til å beregne region og prisområde. Bedrifter ser aldri postnummeret ditt.",
      },
      {
        key: "dwellingType",
        label: "Boligtype",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "apartment", label: "Leilighet" },
          { value: "house", label: "Enebolig" },
          { value: "cabin", label: "Hytte" },
          { value: "other", label: "Annet" },
        ],
      },
      {
        key: "householdSizeRange",
        label: "Husstandsstørrelse",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "1", label: "1 person" },
          { value: "2", label: "2 personer" },
          { value: "3-4", label: "3–4 personer" },
          { value: "5+", label: "5 eller flere" },
        ],
      },
      {
        key: "exactAnnualKwh",
        label: "Årsforbruk (kWh)",
        type: "number",
        privacy: "private",
        required: true,
        min: 500,
        max: 100000,
        helpText:
          "Oppgi så nøyaktig du kan. Bedrifter ser kun et intervall, ikke det eksakte tallet.",
      },
      {
        key: "currentSupplier",
        label: "Nåværende leverandør (valgfritt)",
        type: "text",
        privacy: "private",
        helpText: "Vises aldri til bedrifter.",
      },
      {
        key: "currentContractType",
        label: "Nåværende avtaletype",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "spot", label: "Spotpris" },
          { value: "fixed", label: "Fastpris" },
          { value: "variable", label: "Variabel pris" },
          { value: "unknown", label: "Vet ikke" },
        ],
      },
      {
        key: "hasElbil",
        label: "Har du elbil?",
        type: "boolean",
        privacy: "public",
      },
      {
        key: "hasSolar",
        label: "Har du solcelleanlegg?",
        type: "boolean",
        privacy: "public",
      },
      {
        key: "wantsGreenEnergy",
        label: "Ønsker du fornybar energi med opprinnelsesgaranti?",
        type: "boolean",
        privacy: "public",
      },
      {
        key: "preferredContractType",
        label: "Ønsket avtaletype",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "spot", label: "Spotpris" },
          { value: "fixed", label: "Fastpris" },
          { value: "spot_or_fixed", label: "Spot eller fastpris" },
          { value: "open", label: "Åpen for forslag" },
        ],
      },
      {
        key: "moveInOrSwitchDate",
        label: "Når vil du bytte?",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "asap", label: "Så snart som mulig" },
          { value: "30d", label: "Innen 30 dager" },
          { value: "90d", label: "Innen 3 måneder" },
          { value: "flexible", label: "Fleksibel" },
        ],
      },
      {
        key: "acceptsDigitalInvoice",
        label: "Godtar du digital faktura?",
        type: "boolean",
        privacy: "public",
      },
    ],
  },
  snapshotRules: [
    { type: "postalCodeToRegion", from: "postalCode", label: "Region", includePriceZone: true },
    { type: "copy", from: "dwellingType", label: "Boligtype" },
    { type: "copy", from: "householdSizeRange", label: "Husstand" },
    {
      type: "numberToRange",
      from: "exactAnnualKwh",
      label: "Årsforbruk",
      buckets: [
        { max: 5000, label: "Under 5 000 kWh" },
        { max: 10000, label: "5 000–10 000 kWh" },
        { max: 15000, label: "10 000–15 000 kWh" },
        { max: 20000, label: "15 000–20 000 kWh" },
        { max: 30000, label: "20 000–30 000 kWh" },
      ],
      overflowLabel: "Over 30 000 kWh",
    },
    { type: "copy", from: "currentContractType", label: "Nåværende avtale" },
    { type: "copy", from: "hasElbil", label: "Elbil" },
    { type: "copy", from: "hasSolar", label: "Solceller" },
    { type: "copy", from: "wantsGreenEnergy", label: "Ønsker fornybar energi" },
    { type: "copy", from: "preferredContractType", label: "Ønsket avtaletype" },
    { type: "copy", from: "moveInOrSwitchDate", label: "Byttetidspunkt" },
    { type: "copy", from: "acceptsDigitalInvoice", label: "Digital faktura" },
  ],
  offerSchema: {
    fields: [
      { key: "monthlyFeeNok", label: "Fast månedsbeløp (kr)", type: "number", privacy: "public", required: true, min: 0, max: 500 },
      { key: "markupOrePerKwh", label: "Påslag (øre/kWh)", type: "number", privacy: "public", required: true, min: 0, max: 100 },
      {
        key: "contractType",
        label: "Avtaletype",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "spot", label: "Spotpris" },
          { value: "fixed", label: "Fastpris" },
          { value: "variable", label: "Variabel" },
        ],
      },
      { key: "bindingMonths", label: "Bindingstid (måneder)", type: "number", privacy: "public", required: true, min: 0, max: 36 },
      { key: "invoiceFeeNok", label: "Fakturagebyr (kr)", type: "number", privacy: "public", required: true, min: 0, max: 100 },
      { key: "appIncluded", label: "App med forbruksoversikt inkludert", type: "boolean", privacy: "public" },
      { key: "greenEnergyOption", label: "Fornybar energi med opprinnelsesgaranti", type: "boolean", privacy: "public" },
      { key: "estimatedMonthlyCostNok", label: "Estimert månedskostnad (kr)", type: "number", privacy: "public", required: true, min: 0, max: 20000, helpText: "Basert på forbruket i forespørselen." },
      { key: "termsUrl", label: "Lenke til vilkår", type: "text", privacy: "public", placeholder: "https://…" },
      { key: "cancellationTerms", label: "Oppsigelsesvilkår", type: "textarea", privacy: "public", required: true },
    ],
    scoring: {
      monthlyCostKey: "estimatedMonthlyCostNok",
      feeKeys: ["monthlyFeeNok", "invoiceFeeNok"],
      bindingKey: "bindingMonths",
      fitRules: [
        {
          description: "Tilbyr fornybar energi som ønsket",
          points: 10,
          snapshotKey: "wantsGreenEnergy",
          snapshotEquals: true,
          offerKey: "greenEnergyOption",
          offerTruthy: true,
        },
        {
          description: "App med forbruksoversikt inkludert",
          points: 5,
          offerKey: "appIncluded",
          offerTruthy: true,
        },
        {
          description: "Avtaletype matcher ønsket (spotpris)",
          points: 8,
          snapshotKey: "preferredContractType",
          snapshotEquals: "spot",
          offerKey: "contractType",
          offerEquals: "spot",
        },
        {
          description: "Avtaletype matcher ønsket (fastpris)",
          points: 8,
          snapshotKey: "preferredContractType",
          snapshotEquals: "fixed",
          offerKey: "contractType",
          offerEquals: "fixed",
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Mobilabonnement
// ---------------------------------------------------------------------------

const mobil: CategoryDefinition = {
  slug: "mobilabonnement",
  name: "Mobilabonnement",
  description:
    "Beskriv behovet ditt og få konkrete tilbud på mobilabonnement – uten at noen får nummeret ditt.",
  consumerFormSchema: {
    fields: [
      {
        key: "numberOfUsers",
        label: "Antall brukere",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "1", label: "1" },
          { value: "2", label: "2" },
          { value: "3-4", label: "3–4" },
          { value: "5+", label: "5 eller flere" },
        ],
      },
      {
        key: "dataNeedGbRange",
        label: "Databehov per måned",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "0-5", label: "0–5 GB" },
          { value: "5-15", label: "5–15 GB" },
          { value: "15-30", label: "15–30 GB" },
          { value: "30+", label: "Over 30 GB" },
          { value: "unlimited", label: "Ubegrenset" },
        ],
      },
      { key: "needsUnlimitedData", label: "Må ha ubegrenset data", type: "boolean", privacy: "public" },
      {
        key: "preferredNetworkCoverageRegion",
        label: "Hvor trenger du best dekning?",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "oslo_viken", label: "Oslo/Viken" },
          { value: "innlandet", label: "Innlandet" },
          { value: "sorlandet", label: "Sørlandet" },
          { value: "vestlandet", label: "Vestlandet" },
          { value: "trondelag", label: "Trøndelag" },
          { value: "nord_norge", label: "Nord-Norge" },
          { value: "hele_landet", label: "Hele landet" },
        ],
      },
      { key: "hasBinding", label: "Har du bindingstid hos nåværende leverandør?", type: "boolean", privacy: "public" },
      { key: "needsEsim", label: "Trenger eSIM", type: "boolean", privacy: "public" },
      { key: "needsFamilyPlan", label: "Ønsker familieabonnement", type: "boolean", privacy: "public" },
      { key: "internationalUse", label: "Bruker mye data/ringer i utlandet", type: "boolean", privacy: "public" },
      {
        key: "currentProvider",
        label: "Nåværende leverandør (valgfritt)",
        type: "text",
        privacy: "private",
        helpText: "Vises aldri til bedrifter.",
      },
      {
        key: "phoneNumber",
        label: "Telefonnummer (valgfritt)",
        type: "text",
        privacy: "private",
        helpText:
          "Lagres kryptert og deles ALDRI med bedrifter uten ditt eksplisitte samtykke per bedrift.",
      },
    ],
  },
  snapshotRules: [
    { type: "copy", from: "numberOfUsers", label: "Antall brukere" },
    { type: "copy", from: "dataNeedGbRange", label: "Databehov" },
    { type: "copy", from: "needsUnlimitedData", label: "Ubegrenset data" },
    { type: "copy", from: "preferredNetworkCoverageRegion", label: "Dekningsområde" },
    { type: "copy", from: "needsEsim", label: "eSIM" },
    { type: "copy", from: "needsFamilyPlan", label: "Familieabonnement" },
    { type: "copy", from: "internationalUse", label: "Internasjonal bruk" },
  ],
  offerSchema: {
    fields: [
      { key: "monthlyPriceNok", label: "Månedspris (kr)", type: "number", privacy: "public", required: true, min: 0, max: 2000 },
      { key: "dataGb", label: "Datamengde (GB, 0 = ubegrenset)", type: "number", privacy: "public", required: true, min: 0, max: 1000 },
      { key: "speedLimit", label: "Hastighetsbegrensning", type: "text", privacy: "public", placeholder: "F.eks. ingen, 10 Mbit etter kvote" },
      {
        key: "network",
        label: "Nettverk",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "telenor", label: "Telenor-nettet" },
          { value: "telia", label: "Telia-nettet" },
          { value: "ice", label: "Ice-nettet" },
        ],
      },
      { key: "esimIncluded", label: "eSIM inkludert", type: "boolean", privacy: "public" },
      { key: "familyDiscount", label: "Familierabatt", type: "boolean", privacy: "public" },
      { key: "bindingMonths", label: "Bindingstid (måneder)", type: "number", privacy: "public", required: true, min: 0, max: 24 },
      { key: "roamingIncluded", label: "Roaming i EU/EØS inkludert", type: "boolean", privacy: "public" },
      { key: "setupFeeNok", label: "Etableringsgebyr (kr)", type: "number", privacy: "public", required: true, min: 0, max: 500 },
    ],
    scoring: {
      monthlyCostKey: "monthlyPriceNok",
      feeKeys: ["setupFeeNok"],
      bindingKey: "bindingMonths",
      fitRules: [
        {
          description: "eSIM inkludert som ønsket",
          points: 8,
          snapshotKey: "needsEsim",
          snapshotEquals: true,
          offerKey: "esimIncluded",
          offerTruthy: true,
        },
        {
          description: "Familierabatt som ønsket",
          points: 8,
          snapshotKey: "needsFamilyPlan",
          snapshotEquals: true,
          offerKey: "familyDiscount",
          offerTruthy: true,
        },
        {
          description: "Roaming inkludert for internasjonal bruk",
          points: 8,
          snapshotKey: "internationalUse",
          snapshotEquals: true,
          offerKey: "roamingIncluded",
          offerTruthy: true,
        },
      ],
    },
  },
};

// ---------------------------------------------------------------------------
// Forsikring
// ---------------------------------------------------------------------------

const forsikring: CategoryDefinition = {
  slug: "forsikring",
  name: "Forsikring",
  description:
    "Få forsikringstilbud basert på en anonymisert beskrivelse – du velger selv hvem som får vite hvem du er.",
  consumerFormSchema: {
    fields: [
      {
        key: "insuranceType",
        label: "Type forsikring",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "innbo", label: "Innboforsikring" },
          { value: "bil", label: "Bilforsikring" },
          { value: "reise", label: "Reiseforsikring" },
          { value: "bolig", label: "Boligforsikring" },
          { value: "liv", label: "Livsforsikring" },
          { value: "other", label: "Annet" },
        ],
      },
      {
        key: "postalCode",
        label: "Postnummer",
        type: "postalCode",
        privacy: "private",
        required: true,
        helpText: "Bedrifter ser kun region, aldri adressen din.",
      },
      {
        key: "objectSummary",
        label: "Kort beskrivelse av det som skal forsikres",
        type: "textarea",
        privacy: "public",
        required: true,
        helpText:
          "F.eks. «Leilighet 70 m², bygget 2010» eller «Elbil 2022-modell, kjører ca. 12 000 km/år». Ikke skriv navn, adresse eller registreringsnummer her.",
      },
      {
        key: "licensePlate",
        label: "Registreringsnummer",
        type: "text",
        privacy: "private",
        showIf: { key: "insuranceType", equals: "bil" },
        helpText: "Lagres kryptert. Deles kun hvis du gir samtykke til en valgt bedrift.",
      },
      {
        key: "exactAddress",
        label: "Adresse for boligen",
        type: "text",
        privacy: "private",
        showIf: { key: "insuranceType", equals: "bolig" },
        helpText: "Lagres kryptert. Deles kun hvis du gir samtykke til en valgt bedrift.",
      },
      {
        key: "claimsHistoryRange",
        label: "Skadehistorikk siste 5 år",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "0", label: "Ingen skader" },
          { value: "1", label: "1 skade" },
          { value: "2+", label: "2 eller flere" },
        ],
      },
      {
        key: "preferredDeductibleRange",
        label: "Ønsket egenandel",
        type: "select",
        privacy: "public",
        required: true,
        options: [
          { value: "low", label: "Lav (under 4 000 kr)" },
          { value: "medium", label: "Middels (4 000–8 000 kr)" },
          { value: "high", label: "Høy (over 8 000 kr)" },
          { value: "flexible", label: "Fleksibel" },
        ],
      },
      {
        key: "currentProvider",
        label: "Nåværende forsikringsselskap (valgfritt)",
        type: "text",
        privacy: "private",
        helpText: "Vises aldri til bedrifter.",
      },
    ],
  },
  snapshotRules: [
    { type: "copy", from: "insuranceType", label: "Forsikringstype" },
    { type: "postalCodeToRegion", from: "postalCode", label: "Region" },
    { type: "copy", from: "objectSummary", label: "Objekt" },
    { type: "copy", from: "claimsHistoryRange", label: "Skadehistorikk" },
    { type: "copy", from: "preferredDeductibleRange", label: "Ønsket egenandel" },
  ],
  offerSchema: {
    fields: [
      { key: "monthlyPremiumNok", label: "Månedspremie (kr)", type: "number", privacy: "public", required: true, min: 0, max: 50000 },
      { key: "annualPremiumNok", label: "Årspremie (kr)", type: "number", privacy: "public", required: true, min: 0, max: 600000 },
      { key: "deductibleNok", label: "Egenandel (kr)", type: "number", privacy: "public", required: true, min: 0, max: 50000 },
      { key: "coverageSummary", label: "Dekningssammendrag", type: "textarea", privacy: "public", required: true },
      { key: "exclusions", label: "Viktige unntak", type: "textarea", privacy: "public" },
      { key: "bindingMonths", label: "Bindingstid (måneder)", type: "number", privacy: "public", required: true, min: 0, max: 12 },
      { key: "termsUrl", label: "Lenke til vilkår", type: "text", privacy: "public", placeholder: "https://…" },
    ],
    scoring: {
      monthlyCostKey: "monthlyPremiumNok",
      feeKeys: [],
      bindingKey: "bindingMonths",
      fitRules: [
        {
          description: "Lav egenandel som ønsket",
          points: 8,
          snapshotKey: "preferredDeductibleRange",
          snapshotEquals: "low",
          offerKey: "deductibleNok",
          offerLte: 4000,
        },
      ],
    },
  },
};

export const CATEGORY_DEFINITIONS: CategoryDefinition[] = [strom, mobil, forsikring];
