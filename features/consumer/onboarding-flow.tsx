"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContactDetails } from "@/features/privacy/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PrivacyBadge } from "@/components/privacy/privacy-badge";
import { Lock, Eye, Handshake } from "lucide-react";

export function OnboardingFlow({ displayAlias }: { displayAlias: string }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveContact(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    const formData = new FormData(event.currentTarget);
    const result = await updateContactDetails({
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "Noe gikk galt");
      return;
    }
    router.push("/app/behov/ny");
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {step === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Velkommen til Spender 👋</CardTitle>
            <CardDescription>
              Du er nå <strong>{displayAlias}</strong> – det er alt bedriftene noensinne ser, med
              mindre du selv velger noe annet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex gap-3">
                <Eye className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p>
                  <strong>Synlig for bedrifter:</strong> en anonymisert behovsprofil med region og
                  intervaller – aldri eksakte tall eller identitet. Du forhåndsviser den alltid
                  før publisering.
                </p>
              </div>
              <div className="flex gap-3">
                <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p>
                  <strong>Privat:</strong> navn, telefon, adresse og eksakte detaljer lagres
                  kryptert. Bedrifter kan ikke slå dem opp – teknisk umulig, ikke bare en regel.
                </p>
              </div>
              <div className="flex gap-3">
                <Handshake className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <p>
                  <strong>Delt med samtykke:</strong> hvis du aksepterer et tilbud, kan du dele
                  kontaktinfo med akkurat den bedriften. Samtykket kan trekkes tilbake når som
                  helst.
                </p>
              </div>
            </div>
            <Button className="w-full" onClick={() => setStep(1)}>
              Neste
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Kontaktdetaljer (valgfritt)</CardTitle>
              <PrivacyBadge level="private" />
            </div>
            <CardDescription>
              Fyll inn nå, så slipper du det senere når du vil dele kontaktinfo med en bedrift du
              velger. Lagres kryptert – kan ikke leses av bedrifter.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveContact} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Fullt navn</Label>
                <Input id="fullName" name="fullName" autoComplete="name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Telefonnummer</Label>
                <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+47 …" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="flex-1" disabled={saving}>
                  {saving ? "Lagrer …" : "Lagre og fortsett"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/app/behov/ny")}
                >
                  Hopp over
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
