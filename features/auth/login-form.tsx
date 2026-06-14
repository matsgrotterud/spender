"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Building2, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoLoginEnabled } from "@/lib/demo-accounts";

const DEMO_ICONS = {
  consumer: User,
  business: Building2,
  admin: ShieldCheck,
} as const;

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
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null);
  const showDemoLogins = isDemoLoginEnabled();

  async function performLogin(email: string, password: string, destination: string) {
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result?.ok || result.error) {
      throw new Error("invalid_credentials");
    }

    window.location.assign(destination);
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setActiveDemoId(null);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const destination = safeCallbackUrl(searchParams.get("callbackUrl"));

    try {
      await performLogin(
        String(formData.get("email") ?? ""),
        String(formData.get("password") ?? ""),
        destination,
      );
    } catch {
      setError("Feil e-post eller passord. Prøv igjen.");
    } finally {
      setLoading(false);
    }
  }

  async function onDemoLogin(account: (typeof DEMO_ACCOUNTS)[number]) {
    setLoading(true);
    setActiveDemoId(account.id);
    setError(null);

    try {
      await performLogin(account.email, DEMO_PASSWORD, account.destination);
    } catch {
      setError(
        `Kunne ikke logge inn som ${account.label.toLowerCase()}. Kjør db:seed mot databasen hvis demokontoer mangler.`,
      );
    } finally {
      setLoading(false);
      setActiveDemoId(null);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-xl">Logg inn</CardTitle>
        <CardDescription>Velkommen tilbake til Spender.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
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
            {loading && !activeDemoId ? "Logger inn …" : "Logg inn"}
          </Button>
        </form>

        {showDemoLogins && (
          <div className="space-y-3 border-t pt-6">
            <div>
              <p className="text-sm font-medium">Demokontoer</p>
              <p className="text-xs text-muted-foreground">
                Test alle deler av plattformen med ett klikk. Passord:{" "}
                <span className="font-mono">{DEMO_PASSWORD}</span>
              </p>
            </div>
            <div className="space-y-2">
              {DEMO_ACCOUNTS.map((account) => {
                const Icon = DEMO_ICONS[account.id as keyof typeof DEMO_ICONS];
                const isActive = activeDemoId === account.id;

                return (
                  <button
                    key={account.id}
                    type="button"
                    disabled={loading}
                    onClick={() => onDemoLogin(account)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-lg border bg-card p-3 text-left transition-colors",
                      "hover:border-primary/40 hover:bg-accent/50",
                      "disabled:pointer-events-none disabled:opacity-60",
                      isActive && "border-primary bg-primary/5",
                    )}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{account.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{account.email}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{account.description}</p>
                    </div>
                    <span className="shrink-0 text-xs text-primary">
                      {isActive ? "Logger inn …" : "Logg inn →"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="space-y-1 text-center text-sm text-muted-foreground">
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
