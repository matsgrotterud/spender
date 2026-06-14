import { Badge } from "@/components/ui/badge";

type BadgeVariant = "default" | "secondary" | "destructive" | "success" | "warning" | "outline" | "muted";

const STATUS_LABELS: Record<string, { label: string; variant: BadgeVariant }> = {
  // DemandRequest
  DRAFT: { label: "Utkast", variant: "muted" },
  ACTIVE: { label: "Aktiv", variant: "success" },
  PAUSED: { label: "Pauset", variant: "warning" },
  EXPIRED: { label: "Utløpt", variant: "muted" },
  CLOSED: { label: "Lukket", variant: "secondary" },
  // Offer
  SENT: { label: "Sendt", variant: "default" },
  VIEWED: { label: "Sett", variant: "secondary" },
  ACCEPTED: { label: "Akseptert", variant: "success" },
  DECLINED: { label: "Avslått", variant: "destructive" },
  WITHDRAWN: { label: "Trukket", variant: "muted" },
  // Organization
  PENDING_REVIEW: { label: "Venter på godkjenning", variant: "warning" },
  VERIFIED: { label: "Godkjent", variant: "success" },
  SUSPENDED: { label: "Suspendert", variant: "destructive" },
  REJECTED: { label: "Avvist", variant: "destructive" },
  // Campaign
  SCHEDULED: { label: "Planlagt", variant: "secondary" },
  RUNNING: { label: "Pågår", variant: "default" },
  COMPLETED: { label: "Fullført", variant: "success" },
  CANCELLED: { label: "Avbrutt", variant: "muted" },
  // Consent
  WITHDRAWN_CONSENT: { label: "Trukket tilbake", variant: "muted" },
  // DSR
  OPEN: { label: "Åpen", variant: "warning" },
  IN_PROGRESS: { label: "Under behandling", variant: "secondary" },
  // Campaign recipients
  PENDING: { label: "Venter", variant: "secondary" },
  SKIPPED_DUPLICATE: { label: "Hoppet over (duplikat)", variant: "muted" },
  SKIPPED_LIMIT: { label: "Hoppet over (grense)", variant: "muted" },
  FAILED: { label: "Feilet", variant: "destructive" },
  DELIVERED: { label: "Levert", variant: "success" },
};

export function StatusBadge({ status }: { status: string }) {
  const config = STATUS_LABELS[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
