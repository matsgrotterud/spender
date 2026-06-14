"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateContactDetails } from "@/features/privacy/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ContactDetailsForm({
  defaultValues,
}: {
  defaultValues: { fullName: string; phone: string; address: string };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const formData = new FormData(event.currentTarget);
    const result = await updateContactDetails({
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      address: String(formData.get("address") ?? ""),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke lagre");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {saved && (
        <Alert variant="success">
          <AlertDescription>Kontaktdetaljene er lagret (kryptert).</AlertDescription>
        </Alert>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="fullName">Fullt navn</Label>
        <Input id="fullName" name="fullName" defaultValue={defaultValues.fullName} autoComplete="name" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="phone">Telefonnummer</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={defaultValues.phone}
          autoComplete="tel"
          placeholder="+47 …"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" name="address" defaultValue={defaultValues.address} autoComplete="street-address" />
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? "Lagrer …" : "Lagre"}
      </Button>
    </form>
  );
}
