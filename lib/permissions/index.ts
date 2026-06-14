/**
 * Central RBAC permission matrix. Keep all "who can do what" decisions here
 * so they are auditable in one place.
 */
import type { OrgMemberRole, UserRole } from "@prisma/client";

export type Permission =
  | "consumer.request.create"
  | "consumer.request.manage"
  | "consumer.offer.respond"
  | "consumer.consent.manage"
  | "consumer.data.export"
  | "business.marketplace.view"
  | "business.offer.send"
  | "business.campaign.manage"
  | "business.team.manage"
  | "business.billing.manage"
  | "business.apikeys.manage"
  | "business.integrations.manage"
  | "admin.organizations.review"
  | "admin.categories.manage"
  | "admin.pricing.manage"
  | "admin.plans.manage"
  | "admin.content.manage"
  | "admin.dsr.manage"
  | "admin.audit.view"
  | "admin.system.view";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  CONSUMER: [
    "consumer.request.create",
    "consumer.request.manage",
    "consumer.offer.respond",
    "consumer.consent.manage",
    "consumer.data.export",
  ],
  BUSINESS_OWNER: [
    "business.marketplace.view",
    "business.offer.send",
    "business.campaign.manage",
    "business.team.manage",
    "business.billing.manage",
    "business.apikeys.manage",
    "business.integrations.manage",
    "consumer.data.export",
  ],
  BUSINESS_MEMBER: [
    "business.marketplace.view",
    "business.offer.send",
    "business.campaign.manage",
    "consumer.data.export",
  ],
  ADMIN: [
    "admin.organizations.review",
    "admin.categories.manage",
    "admin.pricing.manage",
    "admin.plans.manage",
    "admin.content.manage",
    "admin.dsr.manage",
    "admin.audit.view",
    "admin.system.view",
  ],
  SUPER_ADMIN: [
    "admin.organizations.review",
    "admin.categories.manage",
    "admin.pricing.manage",
    "admin.plans.manage",
    "admin.content.manage",
    "admin.dsr.manage",
    "admin.audit.view",
    "admin.system.view",
  ],
};

/** Org-member roles allowed to perform org-scoped management actions. */
const ORG_ROLE_PERMISSIONS: Record<string, OrgMemberRole[]> = {
  "business.offer.send": ["OWNER", "ADMIN", "MEMBER"],
  "business.campaign.manage": ["OWNER", "ADMIN", "MEMBER"],
  "business.team.manage": ["OWNER", "ADMIN"],
  "business.billing.manage": ["OWNER", "ADMIN"],
  "business.apikeys.manage": ["OWNER", "ADMIN"],
  "business.integrations.manage": ["OWNER", "ADMIN"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function orgRoleAllows(permission: Permission, memberRole: OrgMemberRole): boolean {
  const allowed = ORG_ROLE_PERMISSIONS[permission];
  if (!allowed) return true;
  return allowed.includes(memberRole);
}
