import { requireOrgMembership } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { TeamManager } from "@/features/business/team-manager";

export default async function TeamPage() {
  const { organization, memberRole, user } = await requireOrgMembership();
  const canManage = memberRole === "OWNER" || memberRole === "ADMIN";

  const [members, subscription] = await Promise.all([
    db.organizationMember.findMany({
      where: { organizationId: organization.id },
      include: { user: { select: { id: true, email: true, lastLoginAt: true } } },
      orderBy: { createdAt: "asc" },
    }),
    db.subscription.findFirst({
      where: { organizationId: organization.id, status: "ACTIVE" },
      include: { plan: { select: { maxSeats: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team</h1>
        <p className="text-sm text-muted-foreground">
          Medlemmer i {organization.name}.
          {subscription && ` Planen inkluderer ${subscription.plan.maxSeats} brukere.`}
        </p>
      </div>

      <TeamManager
        canManage={canManage}
        currentUserId={user.id}
        maxSeats={subscription?.plan.maxSeats ?? 1}
        members={members.map((member) => ({
          userId: member.user.id,
          email: member.user.email,
          role: member.role,
          lastLoginAt: member.user.lastLoginAt?.toISOString() ?? null,
          joinedAt: member.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
