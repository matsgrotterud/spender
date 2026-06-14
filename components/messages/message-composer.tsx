"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/features/messages/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send } from "lucide-react";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const body = String(new FormData(event.currentTarget).get("body") ?? "");
    const result = await sendMessage({ conversationId, body });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "Kunne ikke sende meldingen");
      return;
    }
    formRef.current?.reset();
    router.refresh();
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-2 border-t pt-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Textarea name="body" required maxLength={4000} placeholder="Skriv en melding …" rows={3} />
      <div className="flex justify-end">
        <Button type="submit" disabled={loading} size="sm">
          <Send className="h-4 w-4" aria-hidden /> {loading ? "Sender …" : "Send"}
        </Button>
      </div>
    </form>
  );
}
