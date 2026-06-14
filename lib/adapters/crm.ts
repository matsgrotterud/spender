/**
 * CrmProvider adapters. The generic webhook provider is fully functional;
 * HubSpot/Salesforce are documented placeholders configured per organization
 * via IntegrationConnection rows.
 *
 * PRIVACY RULE: CRM sync payloads contain only data the organization is
 * already allowed to see (public snapshots, own offers, consented contact
 * fields). The sync layer reuses the same consent checks as the UI.
 */

export interface CrmEvent {
  type: string;
  payload: Record<string, unknown>;
}

export interface CrmProvider {
  readonly name: string;
  push(event: CrmEvent): Promise<{ ok: boolean; error?: string }>;
}

export class GenericWebhookCrmProvider implements CrmProvider {
  readonly name = "webhook";
  constructor(private url: string) {}

  async push(event: CrmEvent) {
    try {
      const res = await fetch(this.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(8000),
      });
      return res.ok ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "Ukjent feil" };
    }
  }
}

export class PlaceholderCrmProvider implements CrmProvider {
  constructor(readonly name: string) {}

  async push(): Promise<{ ok: boolean; error?: string }> {
    // TODO(production): implement HubSpot/Salesforce OAuth + API sync when an
    // organization requests it. Config lives encrypted in IntegrationConnection.
    return { ok: false, error: `${this.name}-integrasjonen er ikke konfigurert ennå` };
  }
}
