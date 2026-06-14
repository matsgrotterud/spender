import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/features/seo/metadata";
import { JsonLd, breadcrumbJsonLd } from "@/features/seo/json-ld";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = buildMetadata({
  title: "API-dokumentasjon",
  description:
    "Spender Business API: hent aktive behovsforespørsler, send tilbud og motta webhooks. API-nøkler med scopes, rate limits og full tilgangslogging.",
  path: "/api-docs",
});

function Endpoint({
  method,
  path,
  description,
  scope,
  children,
}: {
  method: string;
  path: string;
  description: string;
  scope: string;
  children?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={method === "GET" ? "secondary" : "default"}>{method}</Badge>
          <code className="text-sm font-semibold">{path}</code>
          <Badge variant="outline">scope: {scope}</Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      {children && <CardContent>{children}</CardContent>}
    </Card>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-foreground p-4 text-xs leading-relaxed text-background">
      <code>{children}</code>
    </pre>
  );
}

export default function ApiDocsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Hjem", path: "/" },
          { name: "API-dokumentasjon", path: "/api-docs" },
        ])}
      />
      <div className="container max-w-4xl space-y-8 py-16">
        <div>
          <h1 className="text-3xl font-bold">Spender Business API</h1>
          <p className="mt-3 text-muted-foreground">
            REST-API for bedrifter på Pro- og Enterprise-plan. Hent aktive behovsforespørsler,
            send tilbud og motta hendelser via webhooks. All bruk logges, og API-et returnerer
            aldri personidentifiserende forbrukerdata uten mottakerspesifikt samtykke.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Autentisering</h2>
          <p className="text-sm text-muted-foreground">
            Opprett en API-nøkkel under <strong>Integrasjoner → API-nøkler</strong> i
            bedriftsdashbordet. Nøkkelen vises kun én gang og lagres hashet hos oss. Send den i
            Authorization-headeren:
          </p>
          <CodeBlock>{`curl https://spender.example/api/v1/me \\
  -H "Authorization: Bearer sp_live_..."`}</CodeBlock>
          <p className="text-sm text-muted-foreground">
            Rate limit: 120 forespørsler per minutt per nøkkel. Ved overskridelse returneres{" "}
            <code>429</code> med <code>Retry-After</code>.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Endepunkter</h2>

          <Endpoint
            method="GET"
            path="/api/v1/me"
            scope="read"
            description="Returnerer organisasjonen, aktiv plan og kredittsaldo for nøkkelen."
          />

          <Endpoint
            method="GET"
            path="/api/v1/demand-requests"
            scope="read"
            description="Paginert liste over aktive behovsforespørsler (kun offentlige snapshot-data)."
          >
            <CodeBlock>{`GET /api/v1/demand-requests?category=strom&region=Oslo&page=1&pageSize=20

{
  "data": [
    {
      "id": "dr_...",
      "title": "Strømavtale til leilighet",
      "category": "strom",
      "alias": "Forbruker #A82Q",
      "region": "Oslo",
      "priceZone": "NO1",
      "snapshot": { "fields": [ { "key": "dwellingType", "label": "Boligtype", "value": "Leilighet" } ] },
      "expiresAt": "2026-07-01T00:00:00.000Z",
      "createdAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "totalPages": 4
}`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="GET"
            path="/api/v1/demand-requests/:id"
            scope="read"
            description="Detaljer om én forespørsel. Inkluderer kontaktfelter KUN hvis forbrukeren har gitt din organisasjon samtykke."
          />

          <Endpoint
            method="POST"
            path="/api/v1/offers"
            scope="write"
            description="Sender et tilbud på en aktiv forespørsel. Trekker kreditter. Idempotent via Idempotency-Key-header."
          >
            <CodeBlock>{`POST /api/v1/offers
Idempotency-Key: unik-nokkel-123

{
  "demandRequestId": "dr_...",
  "title": "Spotpris med lavt påslag",
  "summary": "Spotpris + 1,9 øre/kWh, ingen binding.",
  "payload": {
    "monthlyFeeNok": 29,
    "markupOrePerKwh": 1.9,
    "contractType": "spot",
    "bindingMonths": 0,
    "invoiceFeeNok": 0,
    "estimatedMonthlyCostNok": 540,
    "cancellationTerms": "Ingen bindingstid, byttes fritt."
  },
  "validUntil": "2026-07-01T00:00:00.000Z"
}`}</CodeBlock>
          </Endpoint>

          <Endpoint
            method="POST"
            path="/api/v1/webhooks/test"
            scope="write"
            description="Sender en webhook.test-hendelse til alle aktive endepunkter for organisasjonen."
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Webhooks</h2>
          <p className="text-sm text-muted-foreground">
            Konfigurer endepunkter i dashbordet. Hendelser signeres med HMAC-SHA256 i{" "}
            <code>X-Spender-Signature</code>-headeren. Tilgjengelige hendelser:
          </p>
          <ul className="grid gap-1 text-sm text-muted-foreground md:grid-cols-2">
            <li><code>offer.sent</code></li>
            <li><code>offer.viewed</code></li>
            <li><code>offer.accepted</code></li>
            <li><code>offer.declined</code></li>
            <li><code>contact_access.granted</code></li>
            <li><code>contact_access.withdrawn</code></li>
            <li><code>conversation.message_created</code></li>
            <li><code>demand_request.created_matching_saved_search</code></li>
            <li><code>campaign.completed</code></li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Personvern i API-et</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Forespørselslister inneholder kun pseudonyme, offentlige snapshot-data.</li>
            <li>
              Kontaktfelter returneres kun for forespørsler der forbrukeren har gitt akkurat din
              organisasjon et aktivt samtykke – og hver visning logges.
            </li>
            <li>Det finnes ingen bulk-eksport av forbrukerdata.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            Full dokumentasjon: se <Link href="/bedrift" className="text-primary underline">bedriftssiden</Link>{" "}
            eller docs/API.md i repoet.
          </p>
        </section>
      </div>
    </>
  );
}
