"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveSavedSearch, deleteSavedSearch } from "@/features/business/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bookmark, X } from "lucide-react";

interface SavedSearchesProps {
  searches: {
    id: string;
    name: string;
    criteria: { categorySlug?: string | null; region?: string | null };
  }[];
  currentFilter: { categorySlug?: string; region?: string };
}

export function SavedSearches({ searches, currentFilter }: SavedSearchesProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const hasFilter = Boolean(currentFilter.categorySlug || currentFilter.region);

  function open(criteria: { categorySlug?: string | null; region?: string | null }) {
    const params = new URLSearchParams();
    if (criteria.categorySlug) params.set("kategori", criteria.categorySlug);
    if (criteria.region) params.set("region", criteria.region);
    router.push(`/bedrift/app/marked?${params.toString()}`);
  }

  async function saveCurrent() {
    const name = prompt(
      "Navn på lagret søk:",
      [currentFilter.categorySlug, currentFilter.region].filter(Boolean).join(" – ") || "Mitt søk",
    );
    if (!name) return;
    setSaving(true);
    await saveSavedSearch({
      name,
      categorySlug: currentFilter.categorySlug,
      region: currentFilter.region,
      notifyByEmail: false,
    });
    setSaving(false);
    router.refresh();
  }

  if (searches.length === 0 && !hasFilter) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Lagrede søk:
      </span>
      {searches.map((search) => (
        <Badge
          key={search.id}
          variant="secondary"
          className="cursor-pointer gap-1 py-1 hover:bg-accent"
        >
          <button onClick={() => open(search.criteria)} className="flex items-center gap-1">
            <Bookmark className="h-3 w-3" aria-hidden />
            {search.name}
          </button>
          <button
            aria-label={`Slett ${search.name}`}
            onClick={async () => {
              await deleteSavedSearch(search.id);
              router.refresh();
            }}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </Badge>
      ))}
      {hasFilter && (
        <Button variant="ghost" size="sm" disabled={saving} onClick={saveCurrent}>
          <Bookmark className="h-3.5 w-3.5" aria-hidden /> Lagre dette søket
        </Button>
      )}
    </div>
  );
}
