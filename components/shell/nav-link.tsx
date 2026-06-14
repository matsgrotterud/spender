"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  href: string;
  label: string;
  children?: React.ReactNode;
}

export function NavLink({ href, label, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive =
    pathname === href || (href.split("/").length > 3 && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
      {label}
    </Link>
  );
}
