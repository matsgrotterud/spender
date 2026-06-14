"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  acceptOffer,
  declineOffer,
  toggleShortlist,
  reportOffer,
  startConversation,
} from "@/features/offers/consumer-actions";
import { grantContactAccess } from "@/features/privacy/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { Star, MessageSquare, Flag, Handshake, CheckCircle2 } from "lucide-react";

interface OfferActionPanelProps {
  offerId: string;
  status: string;
  isShortlisted: boolean;
  organizationName: string;
  hasContactGrant: boolean;
}

type Panel = "none" | "decline" | "report" | "share";

export function OfferActionPanel({
  offerId,
  status,
  isShortlisted,
  organizationName,
  hasContactGrant,
}: OfferActionPanelProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>("none");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [shareFields, setShareFields] = useState<string[]>(["fullName", "email"]);

  const canRespond = status === "VIEWED";
  const isAccepted = status === "ACCEPTED";

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setLoading(true);
    setError(null);
    const result = await fn();
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Noe gikk galt");
      return false;
    }
    router.refresh();
    return true;
  }

  async function onAskQuestion() {
    setLoading(true);
    const result = await startConversation(offerId);
    setLoading(false);
    if (result.ok && result.conversationId) {
      router.push(`/app/meldinger/${result.conversationId}`);
    } else {
      setError(result.error ?? "Kunne ikke starte samtale");
    }
  }

  function toggleField(field: string) {
    setShareFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  }

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="text-base">Hva vil du gjøre?</CardTitle>
        <CardDescription>
          Bedriften ser deg fortsatt kun som pseudonym{hasContactGrant ? " – pluss det du har delt" : ""}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {canRespond && (
          <>
            <Button
              className="w-full"
              variant="success"
              disabled={loading}
              onClick={() => run(() => acceptOffer(offerId))}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden /> Aksepter tilbudet
            </Button>
            <Button
              className="w-full"
              variant="outline"
              disabled={loading}
              onClick={() => setPanel(panel === "decline" ? "none" : "decline")}
            >
              Avslå
            </Button>
          </>
        )}

        {isAccepted && !hasContactGrant && (
          <Button
            className="w-full"
            disabled={loading}
            onClick={() => setPanel(panel === "share" ? "none" : "share")}
          >
            <Handshake className="h-4 w-4" aria-hidden /> Del kontaktinfo med denne bedriften
          </Button>
        )}

        {isAccepted && hasContactGrant && (
          <div className="flex items-center justify-between rounded-md border bg-success/5 p-3">
            <p className="text-sm">Kontaktinfo delt med {organizationName}</p>
            <PrivacyBadge level="consented" />
          </div>
        )}

        {panel === "share" && (
          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Velg hva du deler:</p>
            {[
              { key: "fullName", label: "Fullt navn" },
              { key: "email", label: "E-postadresse" },
              { key: "phone", label: "Telefonnummer" },
            ].map((field) => (
              <label key={field.key} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={shareFields.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="h-4 w-4"
                />
                {field.label}
              </label>
            ))}
            <p className="text-xs text-muted-foreground">
              Kun {organizationName} får tilgang, kun til disse feltene, og du kan trekke
              samtykket tilbake når som helst under Personvern.
            </p>
            <Button
              size="sm"
              className="w-full"
              disabled={loading || shareFields.length === 0}
              onClick={async () => {
                const ok = await run(() => grantContactAccess({ offerId, fields: shareFields }));
                if (ok) setPanel("none");
              }}
            >
              Bekreft deling
            </Button>
          </div>
        )}

        {panel === "decline" && (
          <form
            className="space-y-2 rounded-md border p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
              const ok = await run(() => declineOffer({ offerId, reason }));
              if (ok) setPanel("none");
            }}
          >
            <p className="text-sm font-medium">Begrunnelse (valgfritt)</p>
            <Textarea name="reason" placeholder="F.eks. for høy pris, for lang bindingstid …" />
            <Button size="sm" variant="destructive" type="submit" className="w-full" disabled={loading}>
              Avslå tilbudet
            </Button>
          </form>
        )}

        <div className="space-y-2 border-t pt-3">
          <Button className="w-full" variant="outline" disabled={loading} onClick={onAskQuestion}>
            <MessageSquare className="h-4 w-4" aria-hidden /> Still spørsmål (anonymt)
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            disabled={loading}
            onClick={() => run(() => toggleShortlist(offerId))}
          >
            <Star
              className={`h-4 w-4 ${isShortlisted ? "fill-warning text-warning" : ""}`}
              aria-hidden
            />
            {isShortlisted ? "Fjern fra favoritter" : "Legg til favoritter"}
          </Button>
          <Button
            className="w-full text-muted-foreground"
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={() => setPanel(panel === "report" ? "none" : "report")}
          >
            <Flag className="h-3.5 w-3.5" aria-hidden /> Rapporter tilbudet
          </Button>
        </div>

        {panel === "report" && (
          <form
            className="space-y-2 rounded-md border p-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const reason = String(new FormData(e.currentTarget).get("reason") ?? "");
              const ok = await run(() => reportOffer({ offerId, reason }));
              if (ok) setPanel("none");
            }}
          >
            <p className="text-sm font-medium">Hva er galt med tilbudet?</p>
            <Textarea name="reason" required minLength={5} placeholder="Beskriv problemet …" />
            <Button size="sm" type="submit" className="w-full" disabled={loading}>
              Send rapport
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
