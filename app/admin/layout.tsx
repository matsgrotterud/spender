import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import {
  LayoutDashboard,
  Building2,
  FolderTree,
  Calculator,
  CreditCard,
  FileText,
  ShieldCheck,
  ScrollText,
  Activity,
} from "lucide-react";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/admin", label: "Oversikt", icon: LayoutDashboard },
  { href: "/admin/bedrifter", label: "Bedrifter", icon: Building2 },
  { href: "/admin/kategorier", label: "Kategorier", icon: FolderTree },
  { href: "/admin/prisregler", label: "Prisregler", icon: Calculator },
  { href: "/admin/abonnement", label: "Abonnement", icon: CreditCard },
  { href: "/admin/innhold", label: "Innhold", icon: FileText },
  { href: "/admin/personvern", label: "Personvern/DSR", icon: ShieldCheck },
  { href: "/admin/audit", label: "Audit-logg", icon: ScrollText },
  { href: "/admin/system", label: "System", icon: Activity },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["ADMIN", "SUPER_ADMIN"]);

  return (
    <AppShell
      navItems={NAV}
      title="Admin"
      userLabel={user.email}
      roleLabel={user.role === "SUPER_ADMIN" ? "Superadministrator" : "Administrator"}
    >
      {children}
    </AppShell>
  );
}
