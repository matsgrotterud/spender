import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo, truncate } from "@/lib/utils";
import { Building2 } from "lucide-react";

export default async function ConsumerMessagesPage() {
  const user = await requireUser(["CONSUMER"]);
  const conversations = await db.conversation.findMany({
    where: { consumerId: user.id },
    include: {
      organization: { select: { name: true } },
      demandRequest: { select: { title: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1, where: { deletedAt: null } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Meldinger</h1>
        <p className="text-sm text-muted-foreground">
          Samtaler med bedrifter. Du fremstår alltid med pseudonymet ditt.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          title="Ingen samtaler"
          description="Still et spørsmål fra et tilbud for å starte en samtale."
        />
      ) : (
        <div className="grid gap-3">
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            return (
              <Link key={conversation.id} href={`/app/meldinger/${conversation.id}`}>
                <Card className="transition-shadow hover:shadow-md">
                  <CardContent className="flex items-center justify-between gap-3 py-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 font-medium">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        {conversation.organization.name}
                      </p>
                      <p className="truncate text-sm text-muted-foreground">
                        {conversation.demandRequest.title}
                        {lastMessage && ` – ${truncate(lastMessage.body, 60)}`}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(conversation.updatedAt)}
                    </span>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
