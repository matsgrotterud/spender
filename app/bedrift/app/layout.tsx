import { AppShell } from "@/components/shell/app-shell";
import { requireOrgMembership } from "@/lib/auth/session";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  LayoutDashboard,
  Store,
  Send,
  MessageSquare,
  Megaphone,
  FileStack,
  BarChart3,
  Plug,
  CreditCard,
  Users,
  Settings,
} from "lucide-react";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/bedrift/app", label: "Oversikt", icon: LayoutDashboard },
  { href: "/bedrift/app/marked", label: "Marked", icon: Store },
  { href: "/bedrift/app/tilbud", label: "Tilbud", icon: Send },
  { href: "/bedrift/app/meldinger", label: "Meldinger", icon: MessageSquare },
  { href: "/bedrift/app/kampanjer", label: "Kampanjer", icon: Megaphone },
  { href: "/bedrift/app/maler", label: "Maler", icon: FileStack },
  { href: "/bedrift/app/innsikt", label: "Innsikt", icon: BarChart3 },
  { href: "/bedrift/app/integrasjoner", label: "Integrasjoner", icon: Plug },
  { href: "/bedrift/app/betaling", label: "Betaling", icon: CreditCard },
  { href: "/bedrift/app/team", label: "Team", icon: Users },
  { href: "/bedrift/app/innstillinger", label: "Innstillinger", icon: Settings },
];

export default async function BusinessLayout({ children }: { children: React.ReactNode }) {
  const { user, organization } = await requireOrgMembership();

  let banner: React.ReactNode = null;
  if (organization.status === "PENDING_REVIEW") {
    banner = (
      <div className="border-b bg-warning/10 px-4 py-3">
        <div className="container max-w-6xl">
          <p className="text-sm">
            <strong>Venter på godkjenning:</strong> Spender gjennomgår bedriften. Dere kan utforske
            markedet, men ikke sende tilbud før godkjenning. Dere får e-post når det er klart.
          </p>
        </div>
      </div>
    );
  } else if (organization.status === "SUSPENDED") {
    banner = (
      <div className="border-b bg-destructive/10 px-4 py-3">
        <div className="container max-w-6xl">
          <Alert variant="destructive" className="border-0 bg-transparent p-0">
            <AlertTitle>Bedriften er suspendert</AlertTitle>
            <AlertDescription>
              {organization.suspendedReason ?? "Kontakt Spender for mer informasjon."}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  } else if (organization.status === "REJECTED") {
    banner = (
      <div className="border-b bg-destructive/10 px-4 py-3">
        <div className="container max-w-6xl">
          <p className="text-sm">
            <strong>Søknaden ble avvist.</strong> Kontakt Spender hvis dere mener dette er feil.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AppShell
      navItems={NAV}
      title="Bedrift"
      userLabel={organization.name}
      roleLabel={user.email}
      banner={banner}
    >
      {children}
    </AppShell>
  );
}
