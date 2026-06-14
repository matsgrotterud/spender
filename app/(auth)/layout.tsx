import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="container flex h-14 items-center">
          <Link href="/" className="text-lg font-bold tracking-tight text-primary">
            Spender
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">{children}</main>
      <footer className="border-t py-4">
        <p className="container text-center text-xs text-muted-foreground">
          Spender selger ikke kontaktinformasjonen din til bedrifter.
        </p>
      </footer>
    </div>
  );
}
