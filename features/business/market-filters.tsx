"use client";

import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface MarketFiltersProps {
  categories: { slug: string; name: string }[];
  current: { kategori: string; region: string; alder: string };
}

export function MarketFilters({ categories, current }: MarketFiltersProps) {
  const router = useRouter();

  function apply(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    const kategori = String(formData.get("kategori") ?? "");
    const region = String(formData.get("region") ?? "");
    const alder = String(formData.get("alder") ?? "");
    if (kategori) params.set("kategori", kategori);
    if (region) params.set("region", region);
    if (alder) params.set("alder", alder);
    router.push(`/bedrift/app/marked?${params.toString()}`);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4"
    >
      <div className="min-w-40 space-y-1">
        <Label htmlFor="kategori" className="text-xs">Kategori</Label>
        <Select id="kategori" name="kategori" defaultValue={current.kategori}>
          <option value="">Alle kategorier</option>
          {categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="min-w-40 space-y-1">
        <Label htmlFor="region" className="text-xs">Region</Label>
        <Input id="region" name="region" placeholder="F.eks. Oslo" defaultValue={current.region} />
      </div>
      <div className="min-w-36 space-y-1">
        <Label htmlFor="alder" className="text-xs">Alder</Label>
        <Select id="alder" name="alder" defaultValue={current.alder}>
          <option value="">Alle</option>
          <option value="1">Siste døgn</option>
          <option value="7">Siste 7 dager</option>
          <option value="30">Siste 30 dager</option>
        </Select>
      </div>
      <Button type="submit" size="sm">
        Filtrer
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => router.push("/bedrift/app/marked")}
      >
        Nullstill
      </Button>
    </form>
  );
}
