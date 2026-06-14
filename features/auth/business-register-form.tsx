"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerBusiness } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BusinessRegisterForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const result = await registerBusiness({
      email,
      password,
      organizationName: String(formData.get("organizationName") ?? ""),
      orgNumber: String(formData.get("orgNumber") ?? "").replace(/\s/g, ""),
      website: String(formData.get("website") ?? ""),
      acceptTerms: formData.get("acceptTerms") === "on",
    });

    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? null);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/bedrift/app");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Registrer bedrift</CardTitle>
        <CardDescription>
          Vi verifiserer organisasjonsnummeret mot Brønnøysundregistrene. Bedriften må godkjennes
          av Spender før dere kan sende tilbud.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="organizationName">Bedriftsnavn</Label>
            <Input id="organizationName" name="organizationName" required />
            {fieldErrors.organizationName && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.organizationName}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="orgNumber">Organisasjonsnummer</Label>
            <Input id="orgNumber" name="orgNumber" inputMode="numeric" placeholder="9 siffer" required />
            {fieldErrors.orgNumber && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.orgNumber}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="website">Nettside (valgfritt)</Label>
            <Input id="website" name="website" type="url" placeholder="https://" />
            {fieldErrors.website && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.website}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">E-post (din innlogging)</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
            {fieldErrors.email && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.email}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
            />
            {fieldErrors.password && (
              <p className="text-xs font-medium text-destructive">{fieldErrors.password}</p>
            )}
          </div>
          <label className="flex cursor-pointer items-start gap-2 text-sm">
            <input type="checkbox" name="acceptTerms" required className="mt-0.5 h-4 w-4" />
            <span className="text-muted-foreground">
              Jeg godtar{" "}
              <Link href="/vilkar" className="text-primary underline" target="_blank">
                vilkårene
              </Link>{" "}
              på vegne av bedriften, inkludert reglene for bruk av kontaktinformasjon.
            </span>
          </label>
          {fieldErrors.acceptTerms && (
            <p className="text-xs font-medium text-destructive">{fieldErrors.acceptTerms}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registrerer …" : "Registrer bedrift"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Har du konto?{" "}
          <Link href="/logg-inn" className="text-primary underline underline-offset-2">
            Logg inn
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
