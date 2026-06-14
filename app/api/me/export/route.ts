import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { decryptJson } from "@/lib/encryption";
import { logDataAccess } from "@/lib/audit";
import { checkRateLimit } from "@/lib/rate-limit";

/**
 * GDPR data export (right to data portability). Returns all data Spender
 * holds about the logged-in user as a JSON download, with encrypted payloads
 * decrypted so the user can actually read their own data.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke innlogget" }, { status: 401 });
  }

  const rate = await checkRateLimit({ key: `export:${user.id}`, limit: 5, windowSeconds: 3600 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "For mange eksportforespørsler" }, { status: 429 });
  }

  const [
    privateProfile,
    consumerProfile,
    requests,
    offers,
    conversations,
    consents,
    accessLogs,
    notifications,
    dsrs,
  ] = await Promise.all([
    db.userPrivateProfile.findUnique({ where: { userId: user.id } }),
    db.consumerProfile.findUnique({ where: { userId: user.id } }),
    db.demandRequest.findMany({
      where: { consumerId: user.id },
      include: { category: { select: { slug: true, name: true } } },
    }),
    db.offer.findMany({
      where: { demandRequest: { consumerId: user.id } },
      include: { organization: { select: { name: true } }, comparisonScore: true },
    }),
    db.conversation.findMany({
      where: { consumerId: user.id },
      include: {
        messages: { where: { deletedAt: null }, orderBy: { createdAt: "asc" } },
        organization: { select: { name: true } },
      },
    }),
    db.consentGrant.findMany({ where: { userId: user.id } }),
    db.dataAccessLog.findMany({
      where: { targetUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 1000,
    }),
    db.notification.findMany({ where: { userId: user.id } }),
    db.dataSubjectRequest.findMany({ where: { userId: user.id } }),
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    privateProfile: privateProfile ? decryptJson(privateProfile.encryptedPayload) : null,
    consumerProfile,
    demandRequests: requests.map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category.slug,
      status: r.status,
      publicSnapshot: r.publicSnapshotJson,
      privateAnswers: decryptJson(r.encryptedPrivatePayload),
      region: r.region,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    })),
    receivedOffers: offers.map((o) => ({
      id: o.id,
      from: o.organization.name,
      title: o.title,
      summary: o.summary,
      status: o.status,
      payload: o.offerPayloadJson,
      score: o.comparisonScore?.score,
      createdAt: o.createdAt,
    })),
    conversations: conversations.map((c) => ({
      id: c.id,
      with: c.organization.name,
      messages: c.messages.map((m) => ({
        sentByMe: m.senderUserId === user.id,
        body: m.body,
        createdAt: m.createdAt,
      })),
    })),
    consents: consents.map((c) => ({
      id: c.id,
      purpose: c.purpose,
      scope: c.scopeJson,
      status: c.status,
      grantedAt: c.grantedAt,
      withdrawnAt: c.withdrawnAt,
      consentTextVersion: c.consentTextVersion,
    })),
    dataAccessLog: accessLogs.map((l) => ({
      action: l.action,
      dataScope: l.dataScope,
      reason: l.reason,
      createdAt: l.createdAt,
    })),
    notifications: notifications.map((n) => ({
      type: n.type,
      title: n.title,
      createdAt: n.createdAt,
    })),
    dataSubjectRequests: dsrs,
  };

  await logDataAccess({
    actorUserId: user.id,
    targetUserId: user.id,
    action: "EXPORT_DATA",
    dataScope: "full_account_export",
    reason: "Brukerinitiert dataeksport (GDPR art. 20)",
  });

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="spender-eksport-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
