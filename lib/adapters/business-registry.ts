/**
 * BusinessRegistryProvider: Brønnøysundregistrene open data API with a mock
 * fallback used in tests/offline development.
 */
import { env } from "@/lib/env";

export interface RegistryLookupResult {
  found: boolean;
  orgNumber: string;
  name?: string;
  organizationForm?: string;
  registeredAt?: string;
  isBankrupt?: boolean;
  industryDescription?: string;
  raw?: unknown;
  error?: string;
}

export interface BusinessRegistryProvider {
  readonly name: string;
  lookup(orgNumber: string): Promise<RegistryLookupResult>;
}

class BrregProvider implements BusinessRegistryProvider {
  readonly name = "brreg";

  async lookup(orgNumber: string): Promise<RegistryLookupResult> {
    try {
      const res = await fetch(`${env.brregApiBaseUrl}/enheter/${orgNumber}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });
      if (res.status === 404) {
        return { found: false, orgNumber, error: "Organisasjonsnummeret finnes ikke i Enhetsregisteret" };
      }
      if (!res.ok) {
        return { found: false, orgNumber, error: `Brreg svarte med ${res.status}` };
      }
      const data = (await res.json()) as {
        navn?: string;
        organisasjonsform?: { beskrivelse?: string };
        registreringsdatoEnhetsregisteret?: string;
        konkurs?: boolean;
        naeringskode1?: { beskrivelse?: string };
      };
      return {
        found: true,
        orgNumber,
        name: data.navn,
        organizationForm: data.organisasjonsform?.beskrivelse,
        registeredAt: data.registreringsdatoEnhetsregisteret,
        isBankrupt: data.konkurs ?? false,
        industryDescription: data.naeringskode1?.beskrivelse,
        raw: data,
      };
    } catch (err) {
      return {
        found: false,
        orgNumber,
        error: `Kunne ikke nå Brreg: ${err instanceof Error ? err.message : "ukjent feil"}`,
      };
    }
  }
}

class MockRegistryProvider implements BusinessRegistryProvider {
  readonly name = "mock";

  async lookup(orgNumber: string): Promise<RegistryLookupResult> {
    if (!/^\d{9}$/.test(orgNumber)) {
      return { found: false, orgNumber, error: "Organisasjonsnummer må være 9 siffer" };
    }
    return {
      found: true,
      orgNumber,
      name: `Mock Bedrift ${orgNumber.slice(0, 3)} AS`,
      organizationForm: "Aksjeselskap",
      registeredAt: "2015-01-01",
      isBankrupt: false,
      industryDescription: "Mock-oppslag (Brreg ikke tilgjengelig)",
    };
  }
}

export function getBusinessRegistryProvider(): BusinessRegistryProvider {
  if (process.env.NODE_ENV === "test" || process.env.MOCK_BRREG === "true") {
    return new MockRegistryProvider();
  }
  return new BrregProvider();
}
