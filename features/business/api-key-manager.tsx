"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createApiKey, revokeApiKey } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { KeyRound, Plus, Trash2 } from "lucide-react";

interface ApiKeyItem {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  scopes: string[];
}

export function ApiKeyManager({
  apiKeys,
  canManage,
  hasApiAccess,
}: {
  apiKeys: ApiKeyItem[];
  canManage: boolean;
  hasApiAccess: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);

  async function onCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await createApiKey(name.trim());
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke opprette nøkkel");
      return;
    }
    setNewKey(result.apiKeyPlaintext ?? null);
    setName("");
    router.refresh();
  }

  async function onRevoke(id: string) {
    if (!window.confirm("Tilbakekalle nøkkelen? Integrasjoner som bruker den slutter å virke."))
      return;
    await revokeApiKey(id);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4" aria-hidden /> API-nøkler
        </CardTitle>
        <CardDescription>
          Nøkler lagres hashet og vises bare én gang ved opprettelse. Bruk dem som Bearer-token mot
          /api/v1.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {newKey && (
          <Alert variant="success">
            <AlertTitle>Ny nøkkel opprettet – kopier den nå</AlertTitle>
            <AlertDescription>
              <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
                {newKey}
              </code>
              Nøkkelen vises ikke igjen.
            </AlertDescription>
          </Alert>
        )}

        {apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen aktive nøkler.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {apiKeys.map((key) => (
              <li key={key.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                <div>
                  <p className="font-medium">{key.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Opprettet {formatDate(new Date(key.createdAt))} · sist brukt{" "}
                    {key.lastUsedAt ? formatDate(new Date(key.lastUsedAt)) : "aldri"}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {key.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="text-[10px]">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                </div>
                {canManage && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => onRevoke(key.id)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden /> Tilbakekall
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}

        {canManage && hasApiAccess && (
          <form onSubmit={onCreate} className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Navn, f.eks. «CRM-integrasjon»"
              required
              minLength={2}
              maxLength={100}
            />
            <Button type="submit" disabled={loading}>
              <Plus className="h-4 w-4" aria-hidden />
              {loading ? "Oppretter …" : "Ny nøkkel"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
