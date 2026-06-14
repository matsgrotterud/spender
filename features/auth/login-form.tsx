"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

function safeCallbackUrl(raw: string | null): string {
  if (raw && raw.startsWith("/") && !raw.startsWith("//")) {
    return raw;
  }
  return "/etter-innlogging";
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const destination = safeCallbackUrl(searchParams.get("callbackUrl"));

    try {
      const result = await signIn("credentials", {
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        redirect: false,
      });

      if (!result?.ok || result.error) {
        setError("Feil e-post eller passord. Prøv igjen.");
        return;
      }

      // Full page navigation so the session cookie is applied before middleware runs.
      window.location.assign(destination);
    } catch {
      setError("Innlogging feilet. Prøv igjen om litt.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Logg inn</CardTitle>
        <CardDescription>Velkommen tilbake til Spender.</CardDescription>
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
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Passord</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Logger inn …" : "Logg inn"}
          </Button>
        </form>
        <div className="mt-4 space-y-1 text-center text-sm text-muted-foreground">
          <p>
            Ny her?{" "}
            <Link href="/registrer" className="text-primary underline underline-offset-2">
              Opprett forbrukerkonto
            </Link>
          </p>
          <p>
            Bedrift?{" "}
            <Link href="/bedrift/registrer" className="text-primary underline underline-offset-2">
              Registrer bedrift
            </Link>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
