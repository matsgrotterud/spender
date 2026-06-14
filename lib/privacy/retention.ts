/**
 * Data retention policy. All values configurable via env; defaults follow
 * docs/GDPR_AND_PRIVACY_MODEL.md.
 */

function days(envVar: string | undefined, fallback: number): number {
  const parsed = envVar ? parseInt(envVar, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const RETENTION = {
  /** Draft requests are deleted after this many days of inactivity. */
  draftRequestDays: days(process.env.RETENTION_DRAFT_DAYS, 30),
  /** Active requests expire after this many days unless renewed. */
  activeRequestDays: days(process.env.RETENTION_ACTIVE_REQUEST_DAYS, 30),
  /**
   * Expired/closed requests are anonymized in the marketplace immediately;
   * minimal records are retained this many days for dispute handling.
   */
  closedRequestRetentionDays: days(process.env.RETENTION_CLOSED_REQUEST_DAYS, 180),
  /** Consent and audit logs: retained for compliance. */
  consentLogYears: 5,
  auditLogYears: 5,
  /** Notifications older than this are pruned. */
  notificationDays: 90,
} as const;

export function defaultRequestExpiry(from = new Date()): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + RETENTION.activeRequestDays);
  return d;
}
