"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateRequestStatus } from "@/features/consumer/actions";
import { Button } from "@/components/ui/button";

export function RequestStatusActions({
  requestId,
  status,
}: {
  requestId: string;
  status: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function act(action: "pause" | "resume" | "close") {
    if (action === "close" && !confirm("Lukke behovet? Bedrifter kan ikke lenger sende tilbud.")) {
      return;
    }
    setLoading(true);
    await updateRequestStatus({ requestId, action });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {status === "ACTIVE" && (
        <Button variant="outline" size="sm" disabled={loading} onClick={() => act("pause")}>
          Sett på pause
        </Button>
      )}
      {status === "PAUSED" && (
        <Button variant="outline" size="sm" disabled={loading} onClick={() => act("resume")}>
          Gjenoppta
        </Button>
      )}
      {(status === "ACTIVE" || status === "PAUSED") && (
        <Button variant="ghost" size="sm" disabled={loading} onClick={() => act("close")}>
          Lukk
        </Button>
      )}
    </div>
  );
}
