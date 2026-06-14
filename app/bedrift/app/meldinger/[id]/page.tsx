import Link from "next/link";
import { notFound } from "next/navigation";
import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { MessageThread } from "@/components/messages/message-thread";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function BusinessConversationPage({ params }: { params: { id: string } }) {
  const { organization, user } = await requireOrgMembership();

  const conversation = await db.conversation.findFirst({
    where: { id: params.id, organizationId: organization.id },
    include: {
      consumer: { select: { consumerProfile: { select: { displayAlias: true } } } },
      demandRequest: { select: { id: true, title: true } },
      offer: { select: { id: true, title: true } },
      messages: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) notFound();

  const alias = conversation.consumer.consumerProfile?.displayAlias ?? "Forbruker";

  // Identify which messages came from our own org members (any member, not
  // just the current user) so the thread renders correctly for the whole team.
  const memberIds = new Set(
    (
      await db.organizationMember.findMany({
        where: { organizationId: organization.id },
        select: { userId: true },
      })
    ).map((m) => m.userId),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/bedrift/app/meldinger"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle samtaler
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{alias}</CardTitle>
          <CardDescription>
            Om:{" "}
            <Link
              href={`/bedrift/app/marked/${conversation.demandRequest.id}`}
              className="text-primary hover:underline"
            >
              {conversation.demandRequest.title}
            </Link>
            {conversation.offer && ` · Tilbud: ${conversation.offer.title}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MessageThread
            conversationId={conversation.id}
            messages={conversation.messages.map((m) => ({
              id: m.id,
              body: m.body,
              createdAt: m.createdAt,
              isOwn: memberIds.has(m.senderUserId),
              senderLabel: memberIds.has(m.senderUserId)
                ? m.senderUserId === user.id
                  ? "Deg"
                  : organization.name
                : alias,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
