"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { withdrawConsent, requestAccountDeletion } from "@/features/privacy/actions";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2 } from "lucide-react";

export function WithdrawConsentButton({ grantId }: { grantId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading}
      onClick={async () => {
        if (!confirm("Trekke tilbake samtykket? Bedriften mister umiddelbart tilgangen.")) return;
        setLoading(true);
        await withdrawConsent(grantId);
        setLoading(false);
        router.refresh();
      }}
    >
      {loading ? "Trekker tilbake …" : "Trekk tilbake"}
    </Button>
  );
}

export function DangerZone({ hasPendingDeletion }: { hasPendingDeletion: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (hasPendingDeletion) {
    return (
      <Alert variant="warning">
        <AlertTitle>Sletteforespørsel mottatt</AlertTitle>
        <AlertDescription>
          Kontoen din er markert for sletting og behovene dine er satt på pause. En administrator
          behandler forespørselen, og du får beskjed når den er fullført.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="rounded-md border border-destructive/30 p-4">
      <p className="text-sm font-medium">Slett kontoen min</p>
      <p className="mt-1 text-xs text-muted-foreground">
        Behovene dine fjernes fra markedsplassen umiddelbart, og kontoen slettes/anonymiseres i
        tråd med personvernerklæringen. Samtykke- og tilgangslogger beholdes av
        dokumentasjonshensyn i anonymisert form.
      </p>
      {error && (
        <Alert variant="destructive" className="mt-2">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        variant="destructive"
        size="sm"
        className="mt-3"
        disabled={loading}
        onClick={async () => {
          if (!confirm("Er du sikker? Dette starter sletting av kontoen din.")) return;
          setLoading(true);
          const result = await requestAccountDeletion();
          setLoading(false);
          if (!result.ok) {
            setError(result.error ?? "Noe gikk galt");
            return;
          }
          router.refresh();
        }}
      >
        <Trash2 className="h-4 w-4" aria-hidden /> Be om sletting
      </Button>
    </div>
  );
}
