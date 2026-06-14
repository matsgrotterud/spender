import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t bg-card">
      <div className="container grid gap-8 py-12 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold text-primary">Spender</p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Få tilbud uten å bli nedringt. Du bestemmer hvem som får kontakte deg.
          </p>
        </div>
        <div>
          <p className="text-sm font-semibold">Kategorier</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/strom" className="hover:text-foreground">Strømavtale</Link>
            </li>
            <li>
              <Link href="/mobilabonnement" className="hover:text-foreground">Mobilabonnement</Link>
            </li>
            <li>
              <Link href="/forsikring" className="hover:text-foreground">Forsikring</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Spender</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/artikler" className="hover:text-foreground">Artikler</Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-foreground">Ofte stilte spørsmål</Link>
            </li>
            <li>
              <Link href="/bedrift" className="hover:text-foreground">For bedrifter</Link>
            </li>
            <li>
              <Link href="/api-docs" className="hover:text-foreground">API-dokumentasjon</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold">Juridisk</p>
          <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
            <li>
              <Link href="/personvern" className="hover:text-foreground">Personvernerklæring</Link>
            </li>
            <li>
              <Link href="/vilkar" className="hover:text-foreground">Vilkår</Link>
            </li>
            <li>
              <a href="mailto:kontakt@spender.local" className="hover:text-foreground">Kontakt</a>
            </li>
            <li>
              <Link href="/logg-inn" className="hover:text-foreground">Bedriftsinnlogging</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="container py-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Spender. Spender selger ikke kontaktinformasjonen din
            til bedrifter. Tilbudene gis av bedriftene selv – Spender er markedsplass og
            sammenligningsverktøy.
          </p>
        </div>
      </div>
    </footer>
  );
}
