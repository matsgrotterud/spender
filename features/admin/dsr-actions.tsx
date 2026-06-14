"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateDsr } from "@/features/admin/actions";
import { Button } from "@/components/ui/button";

export function DsrActions({ dsrId, type }: { dsrId: string; type: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onUpdate(status: "IN_PROGRESS" | "COMPLETED" | "REJECTED") {
    if (status === "COMPLETED" && type === "DELETE") {
      if (
        !window.confirm(
          "Fullføre slettingen? Kontoen anonymiseres permanent og dette kan ikke angres.",
        )
      )
        return;
    }
    setLoading(true);
    await updateDsr({ dsrId, status });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-1">
      <Button variant="outline" size="sm" disabled={loading} onClick={() => onUpdate("IN_PROGRESS")}>
        Behandler
      </Button>
      <Button
        variant={type === "DELETE" ? "destructive" : "default"}
        size="sm"
        disabled={loading}
        onClick={() => onUpdate("COMPLETED")}
      >
        Fullfør
      </Button>
      <Button variant="ghost" size="sm" disabled={loading} onClick={() => onUpdate("REJECTED")}>
        Avvis
      </Button>
    </div>
  );
}
