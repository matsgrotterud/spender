"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveFaqItem, deleteFaqItem } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

interface FaqItemData {
  id: string;
  question: string;
  answer: string;
  audience: "consumer" | "business" | "general";
  sortOrder: number;
  isActive: boolean;
}

const AUDIENCE_LABELS: Record<string, string> = {
  consumer: "Forbruker",
  business: "Bedrift",
  general: "Generelt",
};

export function FaqManager({ items }: { items: FaqItemData[] }) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = editingId === "new" ? undefined : items.find((i) => i.id === editingId);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const result = await saveFaqItem({
      faqId: editing?.id,
      data: {
        question: String(formData.get("question") ?? ""),
        answer: String(formData.get("answer") ?? ""),
        audience: String(formData.get("audience") ?? "general") as
          | "consumer"
          | "business"
          | "general",
        sortOrder: Number(formData.get("sortOrder") ?? 0),
        isActive: formData.get("isActive") === "on",
      },
    });

    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke lagre");
      return;
    }
    setEditingId(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Slette spørsmålet?")) return;
    await deleteFaqItem(id);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {items.map((item) => (
        <Card key={item.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-sm">{item.question}</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{AUDIENCE_LABELS[item.audience]}</Badge>
                <Badge variant={item.isActive ? "success" : "muted"}>
                  {item.isActive ? "Aktiv" : "Skjult"}
                </Badge>
                <Button variant="outline" size="sm" onClick={() => setEditingId(item.id)}>
                  Rediger
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(item.id)}
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </CardHeader>
          {editingId !== item.id && (
            <CardContent>
              <p className="text-sm text-muted-foreground">{item.answer}</p>
            </CardContent>
          )}
        </Card>
      ))}

      {editingId !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editing ? "Rediger spørsmål" : "Nytt spørsmål"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="faqQuestion">Spørsmål</Label>
                <Input id="faqQuestion" name="question" required defaultValue={editing?.question ?? ""} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="faqAnswer">Svar</Label>
                <Textarea id="faqAnswer" name="answer" required rows={4} defaultValue={editing?.answer ?? ""} />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="faqAudience">Målgruppe</Label>
                  <Select id="faqAudience" name="audience" defaultValue={editing?.audience ?? "general"}>
                    {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="faqSort">Sortering</Label>
                  <Input id="faqSort" name="sortOrder" type="number" min={0} defaultValue={editing?.sortOrder ?? 0} />
                </div>
                <label className="flex items-end gap-2 pb-2 text-sm">
                  <input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} className="h-4 w-4" />
                  Aktiv
                </label>
              </div>
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
          <Plus className="h-4 w-4" aria-hidden /> Nytt spørsmål
        </Button>
      )}
    </div>
  );
}
