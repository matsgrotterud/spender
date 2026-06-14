/**
 * NotificationProvider: in-app notifications (always) + email via the email
 * adapter. Marketing email is never sent from here – transactional only.
 */
import { db } from "@/lib/db";
import { getEmailProvider } from "@/lib/adapters/email";
import { decryptJson } from "@/lib/encryption";
import { env } from "@/lib/env";
import type { Prisma } from "@prisma/client";

export type NotificationType =
  | "offer_received"
  | "message_received"
  | "offer_accepted"
  | "offer_declined"
  | "contact_shared"
  | "campaign_completed"
  | "business_status_changed"
  | "consent_withdrawn"
  | "dsr_update";

interface NotifyParams {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  linkUrl?: string;
  /** Also send a transactional email (respects the user's stored preference). */
  email?: boolean;
  tx?: Prisma.TransactionClient;
}

interface PrivateProfilePayload {
  fullName?: string;
  phone?: string;
  address?: string;
  emailPreferences?: { transactional?: boolean; marketing?: boolean };
}

export async function notify(params: NotifyParams): Promise<void> {
  const client = params.tx ?? db;
  await client.notification.create({
    data: {
      userId: params.userId,
      type: params.type,
      title: params.title,
      body: params.body,
      linkUrl: params.linkUrl,
    },
  });

  if (!params.email) return;

  // Email sending happens best-effort outside the transaction path.
  try {
    const user = await db.user.findUnique({
      where: { id: params.userId },
      include: { privateProfile: true },
    });
    if (!user || user.deletedAt) return;

    if (user.privateProfile) {
      const profile = decryptJson<PrivateProfilePayload>(user.privateProfile.encryptedPayload);
      if (profile.emailPreferences?.transactional === false) return;
    }

    const link = params.linkUrl ? `${env.appUrl}${params.linkUrl}` : env.appUrl;
    await getEmailProvider().send({
      to: user.email,
      subject: `Spender: ${params.title}`,
      text: `${params.body}\n\nLogg inn for å se mer: ${link}\n\nDu mottar denne e-posten fordi du har en konto hos Spender.`,
    });
  } catch (err) {
    console.error("[notifications] email failed", err);
  }
}
