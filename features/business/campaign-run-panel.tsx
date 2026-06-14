"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { runCampaignAction, cancelCampaignAction } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, XCircle } from "lucide-react";

export function CampaignRunPanel({
  campaignId,
  status,
}: {
  campaignId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    sent: number;
    skippedDuplicates: number;
    failed: number;
  } | null>(null);

  if (status !== "DRAFT" && status !== "SCHEDULED" && !result) {
    return null;
  }

  async function onRun() {
    if (!window.confirm("Sende kampanjen nå? Kreditter trekkes for hvert sendte tilbud.")) return;
    setLoading(true);
    setError(null);
    const response = await runCampaignAction(campaignId);
    setLoading(false);
    if (!response.ok) {
      setError(response.error ?? "Kunne ikke kjøre kampanjen");
      return;
    }
    setResult(response.campaignRun ?? null);
    router.refresh();
  }

  async function onCancel() {
    setLoading(true);
    const response = await cancelCampaignAction(campaignId);
    setLoading(false);
    if (!response.ok) {
      setError(response.error ?? "Kunne ikke avbryte");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kjør kampanje</CardTitle>
        <CardDescription>
          Tilbud sendes til alle matchende aktive forespørsler. Mottakere dere allerede har sendt
          tilbud til hoppes over automatisk.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {result && (
          <Alert variant="success">
            <AlertTitle>Kampanje fullført</AlertTitle>
            <AlertDescription>
              {result.sent} tilbud sendt, {result.skippedDuplicates} hoppet over (duplikat),{" "}
              {result.failed} feilet.
            </AlertDescription>
          </Alert>
        )}
        {!result && (
          <div className="flex gap-3">
            <Button onClick={onRun} disabled={loading}>
              <Send className="h-4 w-4" aria-hidden />
              {loading ? "Sender …" : "Send nå"}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={loading}>
              <XCircle className="h-4 w-4" aria-hidden /> Avbryt kampanje
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
