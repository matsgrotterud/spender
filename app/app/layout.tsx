import { AppShell } from "@/components/shell/app-shell";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  LayoutDashboard,
  FileText,
  Inbox,
  MessageSquare,
  ShieldCheck,
  User,
} from "lucide-react";

export const metadata = { robots: { index: false, follow: false } };

const NAV = [
  { href: "/app", label: "Oversikt", icon: LayoutDashboard },
  { href: "/app/behov", label: "Mine behov", icon: FileText },
  { href: "/app/tilbud", label: "Tilbud", icon: Inbox },
  { href: "/app/meldinger", label: "Meldinger", icon: MessageSquare },
  { href: "/app/personvern", label: "Personvern", icon: ShieldCheck },
  { href: "/app/profil", label: "Profil", icon: User },
];

export default async function ConsumerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["CONSUMER"]);
  const profile = await db.consumerProfile.findUnique({ where: { userId: user.id } });

  return (
    <AppShell
      navItems={NAV}
      title="Forbruker"
      userLabel={profile?.displayAlias ?? user.email}
      roleLabel={user.email}
    >
      {children}
    </AppShell>
  );
}
