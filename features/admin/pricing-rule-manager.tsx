"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { savePricingRule, deletePricingRule } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface RuleItem {
  id: string;
  name: string;
  scope: string;
  ruleJson: string;
  isActive: boolean;
}

const SCOPE_LABELS: Record<string, string> = {
  SUBSCRIPTION: "Abonnement",
  CREDIT_COST: "Tilbudskostnad",
  CONTACT_UNLOCK: "Kontaktopplåsing",
  CAMPAIGN_SEND: "Kampanjesending",
};

const NEW_RULE_TEMPLATE = `{
  "base": 5,
  "modifiers": [
    { "description": "Fersk forespørsel (under 24 t)", "if": { "freshnessHours": { "lt": 24 } }, "add": 2 },
    { "description": "Pro-rabatt", "if": { "planSlug": "pro" }, "multiply": 0.8 }
  ],
  "min": 1,
  "max": 100
}`;

export function PricingRuleManager({ rules }: { rules: RuleItem[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing =
    editingId === "new" ? undefined : rules.find((rule) => rule.id === editingId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await savePricingRule({
      ruleId: editing?.id,
      data: {
        name: String(formData.get("name") ?? ""),
        scope: String(formData.get("scope") ?? "CREDIT_COST") as
          | "SUBSCRIPTION"
          | "CREDIT_COST"
          | "CONTACT_UNLOCK"
          | "CAMPAIGN_SEND",
        ruleJson: String(formData.get("ruleJson") ?? ""),
        isActive: formData.get("isActive") === "on",
      },
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke lagre regelen");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function onDelete(ruleId: string) {
    if (!window.confirm("Slette regelen?")) return;
    await deletePricingRule(ruleId);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {rules.map((rule) => (
        <Card key={rule.id}>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">{rule.name}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{SCOPE_LABELS[rule.scope] ?? rule.scope}</Badge>
                <Badge variant={rule.isActive ? "success" : "muted"}>
                  {rule.isActive ? "Aktiv" : "Inaktiv"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setEditingId(rule.id)}>
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(rule.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </CardHeader>
          {editingId !== rule.id && (
            <CardContent>
              <pre className="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs">
                {rule.ruleJson}
              </pre>
            </CardContent>
          )}
        </Card>
      ))}

      {editingId !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? `Rediger: ${editing.name}` : "Ny prisregel"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="ruleName">Navn</Label>
                  <Input id="ruleName" name="name" required defaultValue={editing?.name ?? ""} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ruleScope">Omfang</Label>
                  <Select id="ruleScope" name="scope" defaultValue={editing?.scope ?? "CREDIT_COST"}>
                    {Object.entries(SCOPE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ruleJson">Regel (JSON)</Label>
                <Textarea
                  id="ruleJson"
                  name="ruleJson"
                  required
                  rows={12}
                  spellCheck={false}
                  className="font-mono text-xs"
                  defaultValue={editing?.ruleJson ?? NEW_RULE_TEMPLATE}
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="isActive"
                  defaultChecked={editing?.isActive ?? true}
                  className="h-4 w-4"
                />
                Aktiv
              </label>
              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? "Lagrer …" : "Lagre"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setEditingId(null)}>
                  Avbryt
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Button variant="outline" onClick={() => setEditingId("new")}>
          <Plus className="h-4 w-4" aria-hidden /> Ny regel
        </Button>
      )}
    </div>
  );
}
