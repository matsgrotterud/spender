"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createWebhookEndpoint,
  deleteWebhookEndpoint,
  sendTestWebhook,
} from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Webhook, Zap } from "lucide-react";

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
  deliveries: number;
  createdAt: string;
}

export function WebhookManager({
  endpoints,
  eventTypes,
  canManage,
}: {
  endpoints: WebhookItem[];
  eventTypes: string[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function toggleEvent(eventType: string) {
    setSelectedEvents((current) =>
      current.includes(eventType)
        ? current.filter((e) => e !== eventType)
        : [...current, eventType],
    );
  }

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    if (selectedEvents.length === 0) {
      setError("Velg minst én hendelse");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createWebhookEndpoint({ url: url.trim(), events: selectedEvents });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke opprette webhook");
      return;
    }
    setUrl("");
    setSelectedEvents([]);
    setInfo("Webhook opprettet. Signeringshemmeligheten finner dere i leveranseheaderne.");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Slette webhooken?")) return;
    await deleteWebhookEndpoint(id);
    router.refresh();
  }

  async function onTest() {
    setLoading(true);
    setError(null);
    const result = await sendTestWebhook();
    setLoading(false);
    setInfo(result.ok ? "Testhendelse sendt til alle aktive endepunkter." : null);
    if (!result.ok) setError(result.error ?? "Kunne ikke sende test");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Webhook className="h-4 w-4" aria-hidden /> Webhooks
        </CardTitle>
        <CardDescription>
          Få hendelser som offer.accepted og contact_access.granted levert til egne systemer.
          Leveranser signeres med HMAC-SHA256 i X-Spender-Signature-headeren.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {info && (
          <Alert variant="success">
            <AlertDescription>{info}</AlertDescription>
          </Alert>
        )}

        {endpoints.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen webhooks registrert.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {endpoints.map((endpoint) => (
              <li key={endpoint.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs">{endpoint.url}</p>
                  <p className="text-xs text-muted-foreground">
                    {endpoint.deliveries} leveranser
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {endpoint.events.map((eventType) => (
                      <Badge key={eventType} variant="outline" className="text-[10px]">
                        {eventType}
                      </Badge>
                    ))}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    onClick={() => onDelete(endpoint.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> Slett
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {endpoints.length > 0 && (
          <Button variant="outline" size="sm" onClick={onTest} disabled={loading}>
            <Zap className="h-4 w-4" aria-hidden /> Send testhendelse
          </Button>
        )}

        {canManage && (
          <form onSubmit={onCreate} className="space-y-3 rounded-md border p-4">
            <div className="space-y-1.5">
              <Label htmlFor="webhookUrl">Endepunkt-URL</Label>
              <Input
                id="webhookUrl"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/webhooks/spender"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hendelser</Label>
              <div className="flex flex-wrap gap-2">
                {eventTypes.map((eventType) => (
                  <label
                    key={eventType}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEvents.includes(eventType)}
                      onChange={() => toggleEvent(eventType)}
                      className="h-3 w-3"
                    />
                    {eventType}
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" size="sm" disabled={loading}>
              <Plus className="h-4 w-4" aria-hidden />
              {loading ? "Oppretter …" : "Legg til webhook"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
