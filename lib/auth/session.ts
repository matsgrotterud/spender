/**
 * Server-side authorization helpers. Every protected page, server action and
 * API route resolves the current user through these functions – never by
 * trusting client input.
 */
import "server-only";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import type { OrgMemberRole, User, UserRole } from "@prisma/client";

export class AuthorizationError extends Error {
  constructor(message = "Ingen tilgang") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await db.user.findUnique({ where: { id: session.user.id } });
  if (!user || user.deletedAt || user.status === "SUSPENDED" || user.status === "DELETED") {
    return null;
  }
  return user;
}

/** Requires a logged-in user, optionally restricted to specific roles. Redirects otherwise. */
export async function requireUser(roles?: UserRole[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/logg-inn");
  if (roles && !roles.includes(user.role)) redirect("/");
  return user;
}

/** Like requireUser but throws instead of redirecting – for server actions/APIs. */
export async function requireUserOrThrow(roles?: UserRole[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new AuthorizationError("Du må være innlogget");
  if (roles && !roles.includes(user.role)) throw new AuthorizationError();
  return user;
}

export function isAdmin(user: Pick<User, "role">): boolean {
  return user.role === "ADMIN" || user.role === "SUPER_ADMIN";
}

export interface OrgContext {
  user: User;
  organization: NonNullable<
    Awaited<ReturnType<typeof db.organization.findFirst>>
  >;
  memberRole: OrgMemberRole;
}

/**
 * Resolves the organization the current business user belongs to and verifies
 * membership. Optionally requires one of the given member roles.
 */
export async function requireOrgMembership(options?: {
  memberRoles?: OrgMemberRole[];
  redirectTo?: string;
}): Promise<OrgContext> {
  const user = await requireUser(["BUSINESS_OWNER", "BUSINESS_MEMBER"]);
  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) redirect(options?.redirectTo ?? "/bedrift/registrer");
  if (options?.memberRoles && !options.memberRoles.includes(membership.role)) {
    redirect("/bedrift/app");
  }
  return {
    user,
    organization: membership.organization,
    memberRole: membership.role,
  };
}

/** Throwing variant for server actions. */
export async function requireOrgMembershipOrThrow(options?: {
  memberRoles?: OrgMemberRole[];
}): Promise<OrgContext> {
  const user = await requireUserOrThrow(["BUSINESS_OWNER", "BUSINESS_MEMBER"]);
  const membership = await db.organizationMember.findFirst({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
  if (!membership) throw new AuthorizationError("Du er ikke medlem av en bedrift");
  if (options?.memberRoles && !options.memberRoles.includes(membership.role)) {
    throw new AuthorizationError("Krever høyere rolle i bedriften");
  }
  return {
    user,
    organization: membership.organization,
    memberRole: membership.role,
  };
}

/** Verifies that the organization is allowed to act in the marketplace. */
export function assertOrgCanOperate(org: { status: string }): void {
  if (org.status !== "VERIFIED") {
    throw new AuthorizationError(
      "Bedriften må være godkjent av Spender før den kan sende tilbud",
    );
  }
}
