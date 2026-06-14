"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOfferTemplate } from "@/features/business/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import { Trash2 } from "lucide-react";

interface TemplateItem {
  id: string;
  name: string;
  categoryName: string;
  createdAt: string;
  payload: { title?: string; summary?: string };
}

export function TemplateList({ templates }: { templates: TemplateItem[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function onDelete(id: string) {
    if (!window.confirm("Slette malen?")) return;
    setBusyId(id);
    await deleteOfferTemplate(id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {templates.map((template) => (
        <Card key={template.id}>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{template.name}</CardTitle>
                <CardDescription>
                  Opprettet {formatDate(new Date(template.createdAt))}
                </CardDescription>
              </div>
              <Badge variant="secondary">{template.categoryName}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm">
              <p className="font-medium">{template.payload.title}</p>
              <p className="mt-1 line-clamp-2 text-muted-foreground">{template.payload.summary}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={busyId === template.id}
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="h-4 w-4" aria-hidden /> Slett
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
