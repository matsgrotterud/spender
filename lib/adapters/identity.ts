/**
 * IdentityProvider adapters.
 *
 * Email/password is the active provider (see lib/auth/options.ts).
 * BankID OIDC and Vipps Login are placeholders: they describe exactly what
 * the integration stores when enabled, and what is required to enable them.
 *
 * PRIVACY RULE: when BankID is enabled we store ONLY:
 *   - identityVerified (boolean)
 *   - identityAssuranceLevel (e.g. "high")
 *   - identityProviderSubjectId (the provider's pairwise subject id)
 *   - identityVerifiedAt (timestamp)
 * We NEVER store fødselsnummer or birthdate.
 */
import { env } from "@/lib/env";

export interface IdentityProviderInfo {
  id: "email_password" | "bankid" | "vipps";
  name: string;
  enabled: boolean;
  requirement: string;
}

export function getIdentityProviders(): IdentityProviderInfo[] {
  return [
    {
      id: "email_password",
      name: "E-post og passord",
      enabled: true,
      requirement: "Alltid aktiv.",
    },
    {
      id: "bankid",
      name: "BankID",
      enabled: env.features.bankid && Boolean(env.bankid.clientId),
      requirement:
        "Krever BankID-avtale via en OIDC-leverandør (f.eks. Signicat). Sett BANKID_CLIENT_ID, BANKID_CLIENT_SECRET, BANKID_ISSUER_URL og FEATURE_BANKID=true.",
    },
    {
      id: "vipps",
      name: "Vipps",
      enabled: env.features.vipps && Boolean(env.vipps.clientId),
      requirement:
        "Krever Vipps MobilePay-avtale. Sett VIPPS_CLIENT_ID, VIPPS_CLIENT_SECRET, VIPPS_SUBSCRIPTION_KEY, VIPPS_MERCHANT_SERIAL_NUMBER og FEATURE_VIPPS=true.",
    },
  ];
}

// TODO(production): when a BankID/Vipps agreement exists, add the OIDC
// providers to lib/auth/options.ts and persist ONLY the verified-identity
// flags listed above (never fødselsnummer).
