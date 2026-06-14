"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { reviewOrganization } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Ban, RotateCcw } from "lucide-react";

export function OrgReviewPanel({
  organizationId,
  status,
}: {
  organizationId: string;
  status: string;
}) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDecision(decision: "VERIFIED" | "REJECTED" | "SUSPENDED" | "REACTIVATED") {
    const confirmText: Record<string, string> = {
      VERIFIED: "Godkjenne bedriften? De kan da sende tilbud.",
      REJECTED: "Avvise søknaden?",
      SUSPENDED: "Suspendere bedriften? De mister tilgang til å sende tilbud umiddelbart.",
      REACTIVATED: "Gjenåpne bedriften?",
    };
    if (!window.confirm(confirmText[decision])) return;

    setLoading(true);
    setError(null);
    const result = await reviewOrganization({
      organizationId,
      decision,
      reason: reason.trim() || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Noe gikk galt");
      return;
    }
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Behandle bedrift</CardTitle>
        <CardDescription>
          Alle vedtak logges i audit-loggen og bedriftens eiere varsles.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="reason">Begrunnelse (valgfritt, vises ved suspensjon)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            placeholder="F.eks. «Gjentatte spam-rapporter fra forbrukere»"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {status === "PENDING_REVIEW" && (
            <>
              <Button disabled={loading} onClick={() => onDecision("VERIFIED")}>
                <CheckCircle2 className="h-4 w-4" aria-hidden /> Godkjenn
              </Button>
              <Button variant="destructive" disabled={loading} onClick={() => onDecision("REJECTED")}>
                <XCircle className="h-4 w-4" aria-hidden /> Avvis
              </Button>
            </>
          )}
          {status === "VERIFIED" && (
            <Button variant="destructive" disabled={loading} onClick={() => onDecision("SUSPENDED")}>
              <Ban className="h-4 w-4" aria-hidden /> Suspender
            </Button>
          )}
          {(status === "SUSPENDED" || status === "REJECTED") && (
            <Button disabled={loading} onClick={() => onDecision("REACTIVATED")}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Gjenåpne / godkjenn
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
