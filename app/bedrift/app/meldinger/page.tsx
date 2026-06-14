import Link from "next/link";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { timeAgo } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default async function BusinessConversationsPage() {
  const { organization } = await requireOrgMembership();

  const conversations = await db.conversation.findMany({
    where: { organizationId: organization.id },
    include: {
      consumer: { select: { consumerProfile: { select: { displayAlias: true } } } },
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
          Samtaler med forbrukere om tilbudene deres. Forbrukere vises med alias til de eventuelt
          deler kontaktinfo.
        </p>
      </div>

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessageSquare className="h-8 w-8" aria-hidden />}
          title="Ingen samtaler"
          description="Når en forbruker stiller spørsmål om et tilbud, dukker samtalen opp her."
        />
      ) : (
        <div className="space-y-3">
          {conversations.map((conversation) => {
            const lastMessage = conversation.messages[0];
            return (
              <Link key={conversation.id} href={`/bedrift/app/meldinger/${conversation.id}`}>
                <Card className="p-4 transition-colors hover:bg-muted/50">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">
                        {conversation.consumer.consumerProfile?.displayAlias ?? "Forbruker"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Om: {conversation.demandRequest.title}
                      </p>
                      {lastMessage && (
                        <p className="mt-1 truncate text-sm text-muted-foreground">
                          {lastMessage.body}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {timeAgo(conversation.updatedAt)}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
