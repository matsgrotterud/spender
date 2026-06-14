import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth/session";

function dashboardPath(role: string): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return "/admin";
  if (role === "BUSINESS_OWNER" || role === "BUSINESS_MEMBER") return "/bedrift/app";
  return "/app";
}

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b bg-card/90 backdrop-blur">
      <div className="container flex h-14 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold tracking-tight text-primary">
            Spender
          </Link>
          <nav className="hidden items-center gap-4 text-sm text-muted-foreground md:flex">
            <Link href="/strom" className="hover:text-foreground">
              Strøm
            </Link>
            <Link href="/mobilabonnement" className="hover:text-foreground">
              Mobil
            </Link>
            <Link href="/forsikring" className="hover:text-foreground">
              Forsikring
            </Link>
            <Link href="/artikler" className="hover:text-foreground">
              Artikler
            </Link>
            <Link href="/bedrift" className="hover:text-foreground">
              For bedrifter
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link href={dashboardPath(user.role)} className={cn(buttonVariants({ size: "sm" }))}>
              Gå til dashbord
            </Link>
          ) : (
            <>
              <Link
                href="/logg-inn"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
              >
                Logg inn
              </Link>
              <Link href="/registrer" className={cn(buttonVariants({ size: "sm" }))}>
                Legg inn behov
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
