/**
 * Central, typed access to environment configuration and feature flags.
 * No secrets are ever exposed to the client from this module: it is
 * server-only (imported from server code).
 */

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined || value === "") return fallback;
  return value === "true" || value === "1";
}

export const env = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  adminEmail: process.env.ADMIN_EMAIL ?? "admin@spender.local",
  encryptionKey: process.env.ENCRYPTION_KEY ?? "",
  authSecret: process.env.AUTH_SECRET ?? "",
  redisUrl: process.env.REDIS_URL ?? "",

  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY ?? "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
    priceIds: {
      starter: process.env.STRIPE_STARTER_PRICE_ID ?? "",
      growth: process.env.STRIPE_GROWTH_PRICE_ID ?? "",
      pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
    },
  },

  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Spender <noreply@spender.local>",

  brregApiBaseUrl:
    process.env.BRREG_API_BASE_URL ?? "https://data.brreg.no/enhetsregisteret/api",

  s3: {
    endpoint: process.env.S3_ENDPOINT ?? "",
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    bucket: process.env.S3_BUCKET ?? "",
  },

  posthog: {
    key: process.env.POSTHOG_KEY ?? "",
    host: process.env.POSTHOG_HOST ?? "https://eu.posthog.com",
  },
  sentryDsn: process.env.SENTRY_DSN ?? "",

  bankid: {
    clientId: process.env.BANKID_CLIENT_ID ?? "",
    clientSecret: process.env.BANKID_CLIENT_SECRET ?? "",
    issuerUrl: process.env.BANKID_ISSUER_URL ?? "",
  },
  vipps: {
    clientId: process.env.VIPPS_CLIENT_ID ?? "",
    clientSecret: process.env.VIPPS_CLIENT_SECRET ?? "",
    subscriptionKey: process.env.VIPPS_SUBSCRIPTION_KEY ?? "",
    merchantSerialNumber: process.env.VIPPS_MERCHANT_SERIAL_NUMBER ?? "",
  },

  features: {
    mockBilling: bool(process.env.FEATURE_MOCK_BILLING, true),
    mockEmail: bool(process.env.FEATURE_MOCK_EMAIL, true),
    bankid: bool(process.env.FEATURE_BANKID, false),
    vipps: bool(process.env.FEATURE_VIPPS, false),
    stripe: bool(process.env.FEATURE_STRIPE, false),
  },
} as const;

export type SetupCheckStatus = "ok" | "mock" | "missing";

export interface SetupCheck {
  key: string;
  label: string;
  status: SetupCheckStatus;
  detail: string;
}

/**
 * System setup checklist shown in the admin dashboard. Tells the operator
 * which integrations run in mock mode and what is required for production.
 */
export function getSetupChecklist(): SetupCheck[] {
  const stripeReady = Boolean(env.stripe.secretKey) && env.features.stripe;
  return [
    {
      key: "database",
      label: "PostgreSQL",
      status: process.env.DATABASE_URL ? "ok" : "missing",
      detail: process.env.DATABASE_URL
        ? "Tilkoblet via DATABASE_URL"
        : "DATABASE_URL mangler",
    },
    {
      key: "encryption",
      label: "Krypteringsnøkkel (AES-256-GCM)",
      status: env.encryptionKey.length === 64 ? "ok" : "missing",
      detail:
        env.encryptionKey.length === 64
          ? "ENCRYPTION_KEY er satt (32 byte)"
          : "ENCRYPTION_KEY mangler eller har feil lengde (krever 64 hex-tegn)",
    },
    {
      key: "auth",
      label: "Auth-hemmelighet",
      status: env.authSecret ? "ok" : "missing",
      detail: env.authSecret ? "AUTH_SECRET er satt" : "AUTH_SECRET mangler",
    },
    {
      key: "redis",
      label: "Redis (kø/cache)",
      status: env.redisUrl ? "ok" : "mock",
      detail: env.redisUrl
        ? "Tilkoblet via REDIS_URL"
        : "Bruker prosessintern minne-fallback. Sett REDIS_URL i produksjon.",
    },
    {
      key: "stripe",
      label: "Stripe-betaling",
      status: stripeReady ? "ok" : "mock",
      detail: stripeReady
        ? "Stripe er aktivert"
        : "Mock-fakturering aktiv. Sett STRIPE_SECRET_KEY og FEATURE_STRIPE=true.",
    },
    {
      key: "email",
      label: "E-post (Resend)",
      status: env.resendApiKey && !env.features.mockEmail ? "ok" : "mock",
      detail:
        env.resendApiKey && !env.features.mockEmail
          ? "Resend er aktivert"
          : "E-post logges til konsoll. Sett RESEND_API_KEY og FEATURE_MOCK_EMAIL=false.",
    },
    {
      key: "bankid",
      label: "BankID-innlogging",
      status: env.features.bankid && env.bankid.clientId ? "ok" : "mock",
      detail:
        env.features.bankid && env.bankid.clientId
          ? "BankID OIDC er konfigurert"
          : "Ikke konfigurert. Krever BankID-avtale (se docs/PROVIDE_KEYS_AND_CONFIG.md).",
    },
    {
      key: "vipps",
      label: "Vipps-innlogging",
      status: env.features.vipps && env.vipps.clientId ? "ok" : "mock",
      detail:
        env.features.vipps && env.vipps.clientId
          ? "Vipps Login er konfigurert"
          : "Ikke konfigurert. Krever Vipps MobilePay-avtale.",
    },
    {
      key: "storage",
      label: "Fillagring (S3/R2)",
      status: env.s3.bucket ? "ok" : "mock",
      detail: env.s3.bucket
        ? `Bucket: ${env.s3.bucket}`
        : "Lokal disk (.uploads/) brukes. Sett S3-variabler i produksjon.",
    },
    {
      key: "analytics",
      label: "Analyse (PostHog)",
      status: env.posthog.key ? "ok" : "mock",
      detail: env.posthog.key
        ? "PostHog er aktivert"
        : "Hendelser logges kun internt i databasen.",
    },
    {
      key: "monitoring",
      label: "Feilovervåkning (Sentry)",
      status: env.sentryDsn ? "ok" : "mock",
      detail: env.sentryDsn
        ? "Sentry er aktivert"
        : "Feil logges til konsoll. Sett SENTRY_DSN i produksjon.",
    },
  ];
}
