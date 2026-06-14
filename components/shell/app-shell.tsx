import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { LogoutButton } from "@/components/shell/logout-button";
import { NavLink } from "@/components/shell/nav-link";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface AppShellProps {
  navItems: NavItem[];
  title: string;
  userLabel: string;
  roleLabel: string;
  children: React.ReactNode;
  banner?: React.ReactNode;
}

/** Shared dashboard shell: sidebar on desktop, top scroll-nav on mobile. */
export function AppShell({ navItems, title, userLabel, roleLabel, children, banner }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="border-b bg-card md:flex md:w-60 md:flex-col md:border-b-0 md:border-r">
        <div className="flex h-14 items-center gap-2 border-b px-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-primary">
            Spender
          </Link>
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase text-muted-foreground">
            {title}
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto p-2 md:flex-1 md:flex-col md:overflow-x-visible">
          {navItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label}>
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
            </NavLink>
          ))}
        </nav>
        <div className="hidden border-t p-3 md:block">
          <p className="truncate text-sm font-medium">{userLabel}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
          <LogoutButton />
        </div>
      </aside>
      <div className="flex-1">
        {banner}
        <main className="container max-w-6xl py-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
