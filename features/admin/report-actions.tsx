"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { resolveOfferReport } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

export function OfferReportActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onResolve(status: "REVIEWED" | "ACTION_TAKEN" | "DISMISSED") {
    setLoading(true);
    await resolveOfferReport({ reportId, status });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" disabled={loading} onClick={() => onResolve("REVIEWED")}>
        Sett som vurdert
      </Button>
      <Button variant="ghost" size="sm" disabled={loading} onClick={() => onResolve("DISMISSED")}>
        Avvis
      </Button>
    </div>
  );
}
