import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { MessageThread } from "@/components/messages/message-thread";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

export default async function ConsumerConversationPage({ params }: { params: { id: string } }) {
  const user = await requireUser(["CONSUMER"]);
  const conversation = await db.conversation.findFirst({
    where: { id: params.id, consumerId: user.id },
    include: {
      organization: { select: { name: true } },
      demandRequest: { select: { id: true, title: true } },
      offer: { select: { id: true, title: true } },
      messages: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!conversation) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Link
        href="/app/meldinger"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden /> Alle samtaler
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{conversation.organization.name}</CardTitle>
          <CardDescription>
            Om: {conversation.demandRequest.title}
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
              isOwn: m.senderUserId === user.id,
              senderLabel: m.senderUserId === user.id ? "Deg" : conversation.organization.name,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
