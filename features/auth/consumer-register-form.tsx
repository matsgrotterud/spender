"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerConsumer } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck } from "lucide-react";

export function ConsumerRegisterForm() {
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

    const result = await registerConsumer({
      email,
      password,
      acceptTerms: formData.get("acceptTerms") === "on",
    });

    if (!result.ok) {
      setLoading(false);
      setError(result.error ?? null);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }

    await signIn("credentials", { email, password, redirect: false });
    router.push("/app/onboarding");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Opprett forbrukerkonto</CardTitle>
        <CardDescription>
          Gratis. Du får et pseudonym, og bedrifter ser aldri hvem du er uten ditt samtykke.
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
            <Label htmlFor="email">E-post</Label>
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
            <p className="text-xs text-muted-foreground">
              Minst 8 tegn, én stor bokstav og ett tall.
            </p>
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
              og har lest{" "}
              <Link href="/personvern" className="text-primary underline" target="_blank">
                personvernerklæringen
              </Link>
              .
            </span>
          </label>
          {fieldErrors.acceptTerms && (
            <p className="text-xs font-medium text-destructive">{fieldErrors.acceptTerms}</p>
          )}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Oppretter konto …" : "Opprett konto"}
          </Button>
        </form>
        <div className="mt-4 flex items-start gap-2 rounded-md bg-muted p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          <span>
            E-posten din brukes kun til innlogging og varsler. Den deles aldri med bedrifter uten
            at du eksplisitt velger det.
          </span>
        </div>
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
