import { Badge } from "@/components/ui/badge";
import { Lock, Eye, Handshake } from "lucide-react";

export type PrivacyLevel = "private" | "public" | "consented";

/**
 * The three privacy labels used consistently across the product:
 *  - "Privat": stored encrypted, never shown to businesses
 *  - "Synlig for bedrifter": part of the public snapshot
 *  - "Delt med samtykke": revealed to one specific business after consent
 */
export function PrivacyBadge({ level }: { level: PrivacyLevel }) {
  switch (level) {
    case "private":
      return (
        <Badge variant="muted">
          <Lock className="h-3 w-3" aria-hidden />
          Privat
        </Badge>
      );
    case "public":
      return (
        <Badge variant="secondary">
          <Eye className="h-3 w-3" aria-hidden />
          Synlig for bedrifter
        </Badge>
      );
    case "consented":
      return (
        <Badge variant="success">
          <Handshake className="h-3 w-3" aria-hidden />
          Delt med samtykke
        </Badge>
      );
  }
}
