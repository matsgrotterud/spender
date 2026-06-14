# Spender Business API v1

REST-API for bedrifter på **Pro- eller Enterprise-plan**. Basis-URL: `https://<domene>/api/v1`.

## Autentisering

API-nøkler opprettes under **Bedrift → Integrasjoner** (krever eier/admin-rolle og API-tilgang i planen). Nøkkelen vises **én gang** og lagres som SHA-256-hash.

```
Authorization: Bearer sp_live_…
```

- Scopes: `read` (oppslag) og `write` (sende tilbud, teste webhooks).
- Rate limit: 120 forespørsler/minutt per organisasjon (HTTP 429 + `Retry-After`).
- Alle feil har formen `{ "error": { "code": "…", "message": "…", "details": … } }`.

## Personverngaranti

API-et returnerer **aldri** privat forbrukerdata. Forespørsler eksponeres kun som pseudonyme offentlige snapshots. Kontaktfelter (`consentedContact`) finnes kun i svaret når forbrukeren har gitt **deres** organisasjon mottakerspesifikt samtykke – og hver lesing logges.

## Endepunkter

### `GET /api/v1/me`

Organisasjons- og nøkkelinfo.

```json
{
  "organization": { "id": "…", "name": "…", "orgNumber": "…", "status": "VERIFIED" },
  "plan": { "slug": "pro", "name": "Pro" },
  "creditBalance": 540,
  "apiKey": { "name": "CRM-integrasjon", "prefix": "sp_live_AbC1", "scopes": ["read", "write"] }
}
```

### `GET /api/v1/demand-requests`

Aktive forespørsler i markedet (paginert, maks `page_size=50`).

Query-parametre: `page`, `page_size`, `category` (slug), `region` (delstreng).

```json
{
  "data": [
    {
      "id": "…",
      "title": "Strømavtale til leilighet i Oslo",
      "category": "strom",
      "consumerAlias": "Forbruker #A82Q",
      "region": "Oslo/Viken",
      "priceZone": "NO1",
      "publicSnapshot": { "fields": [ { "key": "dwellingType", "label": "Boligtype", "value": "Leilighet" } ] },
      "expiresAt": "2026-07-01T00:00:00.000Z",
      "createdAt": "2026-06-11T09:00:00.000Z",
      "ourOffer": null
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 6, "totalPages": 1 }
}
```

### `GET /api/v1/demand-requests/:id`

Én forespørsel. `ourOffer` viser deres eksisterende tilbud. `consentedContact` er `null` uten aktivt samtykke.

```json
{
  "id": "…",
  "status": "ACTIVE",
  "publicSnapshot": { "fields": [ … ] },
  "ourOffer": { "id": "…", "status": "SENT", "sentAt": "…" },
  "consentedContact": {
    "fields": { "fullName": "…", "phone": "…" },
    "grantedAt": "2026-06-12T10:00:00.000Z"
  }
}
```

### `POST /api/v1/offers`

Sender et tilbud. Koster kreditter (samme prisregler som dashbordet). Payload-feltene må følge kategoriens tilbudsskjema (se `/api-docs` eller kategorien i dashbordet).

```json
{
  "demand_request_id": "…",
  "title": "Spotpris med lavt påslag",
  "summary": "Spotpris uten binding, 0 kr i gebyrer.",
  "payload": {
    "monthlyFeeNok": 29,
    "markupOrePerKwh": 2.5,
    "contractType": "spot",
    "bindingMonths": 0,
    "invoiceFeeNok": 0,
    "estimatedMonthlyCostNok": 1180,
    "cancellationTerms": "Ingen bindingstid."
  },
  "valid_until": "2026-07-01T00:00:00Z",
  "idempotency_key": "valgfri-unik-nokkel"
}
```

Svar `201`: `{ "offer": { "id": "…", "creditsSpent": 5 } }`

Feilkoder: `validation_error` (422), `duplicate` (409 – ett tilbud per forespørsel), `insufficient_credits` (402), `not_active` (409), `organization_not_verified` (403), `not_found` (404).

### `POST /api/v1/webhooks/test`

Sender en `webhook.test`-hendelse til alle organisasjonens aktive webhook-endepunkter.

## Webhooks

Endepunkter administreres under **Bedrift → Integrasjoner**. Hendelser:

| Hendelse | Når |
| --- | --- |
| `offer.sent` | Tilbud sendt (dashbord, kampanje eller API) |
| `offer.viewed` | Forbruker åpnet tilbudet |
| `offer.accepted` / `offer.declined` | Forbruker svarte |
| `contact_access.granted` / `contact_access.withdrawn` | Samtykke gitt/trukket (hendelsen inneholder **ikke** kontaktdataene) |
| `conversation.message_created` | Ny melding fra forbruker |
| `demand_request.created_matching_saved_search` | Ny forespørsel matcher lagret søk |
| `campaign.completed` | Kampanjekjøring ferdig |

Leveranseformat:

```json
{ "id": "delivery-id", "type": "offer.accepted", "createdAt": "…", "data": { … } }
```

Hver leveranse signeres med HMAC-SHA256 av rå body i headeren `X-Spender-Signature`. Verifiser slik (Node):

```js
const expected = crypto.createHmac("sha256", endpointSecret).update(rawBody).digest("hex");
const valid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
```

Mislykkede leveranser prøves på nytt inntil 3 ganger. Leveranser er idempotente per hendelse (`id` kan brukes som dedupliseringsnøkkel).
