import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CookieBanner } from "@/components/site/cookie-banner";
import { AuthProvider } from "@/components/providers/auth-provider";
import { env } from "@/lib/env";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: {
    default: "Spender – Få tilbud uten å bli nedringt",
    template: "%s | Spender",
  },
  description:
    "Spender er en personvernvennlig markedsplass: beskriv behovet ditt og motta tilbud på strøm, mobilabonnement og forsikring – uten å dele kontaktinformasjon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nb">
      <body className={`${inter.variable} font-sans`}>
        <AuthProvider>{children}</AuthProvider>
        <CookieBanner />
      </body>
    </html>
  );
}
