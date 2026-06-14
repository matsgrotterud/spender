import type { Metadata } from "next";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/features/seo/json-ld";
import { db } from "@/lib/db";

export const metadata: Metadata = buildMetadata({
  title: "Ofte stilte spørsmål",
  description:
    "Svar på vanlige spørsmål om Spender: hvordan tilbud fungerer, hva bedrifter ser, samtykke, sletting av data og priser for bedrifter.",
  path: "/faq",
});

export const revalidate = 3600;

export default async function FaqPage() {
  const items = await db.faqItem.findMany({
    where: { isActive: true },
    orderBy: [{ audience: "asc" }, { sortOrder: "asc" }],
  });

  const consumer = items.filter((i) => i.audience === "consumer" || i.audience === "general");
  const business = items.filter((i) => i.audience === "business");

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <JsonLd data={faqJsonLd(items.map((i) => ({ question: i.question, answer: i.answer })))} />

      <div className="container max-w-3xl py-16">
        <h1 className="text-3xl font-bold">Ofte stilte spørsmål</h1>
        <p className="mt-3 text-muted-foreground">
          Korte, direkte svar. Finner du ikke det du lurer på? Send oss en e-post på
          kontakt@spender.local.
        </p>

        <h2 className="mt-10 text-xl font-semibold">For forbrukere</h2>
        <div className="mt-4 space-y-3">
          {consumer.map((item) => (
            <details key={item.id} className="group rounded-lg border bg-card p-4">
              <summary className="cursor-pointer list-none font-medium">{item.question}</summary>
              <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>

        {business.length > 0 && (
          <>
            <h2 className="mt-10 text-xl font-semibold">For bedrifter</h2>
            <div className="mt-4 space-y-3">
              {business.map((item) => (
                <details key={item.id} className="group rounded-lg border bg-card p-4">
                  <summary className="cursor-pointer list-none font-medium">{item.question}</summary>
                  <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
                </details>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
