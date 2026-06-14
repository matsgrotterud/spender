import { cn, formatDateTime } from "@/lib/utils";
import { MessageComposer } from "@/components/messages/message-composer";

export interface ThreadMessage {
  id: string;
  body: string;
  createdAt: Date;
  isOwn: boolean;
  senderLabel: string;
}

export function MessageThread({
  messages,
  conversationId,
}: {
  messages: ThreadMessage[];
  conversationId: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            Ingen meldinger ennå. Start samtalen under.
          </p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex flex-col", message.isOwn ? "items-end" : "items-start")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm",
                message.isOwn
                  ? "bg-primary text-primary-foreground"
                  : "border bg-card",
              )}
            >
              <p className="whitespace-pre-wrap">{message.body}</p>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {message.senderLabel} · {formatDateTime(message.createdAt)}
            </p>
          </div>
        ))}
      </div>
      <MessageComposer conversationId={conversationId} />
    </div>
  );
}
