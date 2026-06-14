/**
 * API key authentication for /api/v1.
 *
 * Keys are stored as SHA-256 hashes; the plaintext is shown once at creation.
 * Every authenticated request updates lastUsedAt and is rate limited per
 * organization. Scope checks gate write endpoints.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sha256 } from "@/lib/encryption";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { ApiKey, Organization } from "@prisma/client";

export interface ApiContext {
  apiKey: ApiKey;
  organization: Organization;
  scopes: string[];
}

export type ApiAuthResult =
  | { ok: true; ctx: ApiContext }
  | { ok: false; response: NextResponse };

function errorResponse(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export async function authenticateApiRequest(
  request: Request,
  requiredScope: "read" | "write",
): Promise<ApiAuthResult> {
  const header = request.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) {
    return {
      ok: false,
      response: errorResponse(401, "unauthorized", "Mangler Bearer-token i Authorization-header"),
    };
  }

  const apiKey = await db.apiKey.findUnique({
    where: { hashedKey: sha256(token) },
    include: { organization: true },
  });
  if (!apiKey || apiKey.revokedAt) {
    return {
      ok: false,
      response: errorResponse(401, "unauthorized", "Ugyldig eller tilbakekalt API-nøkkel"),
    };
  }

  if (apiKey.organization.status !== "VERIFIED") {
    return {
      ok: false,
      response: errorResponse(403, "organization_not_verified", "Bedriften er ikke godkjent"),
    };
  }

  const scopes = (apiKey.scopesJson as string[]) ?? [];
  if (!scopes.includes(requiredScope)) {
    return {
      ok: false,
      response: errorResponse(403, "insufficient_scope", `Nøkkelen mangler «${requiredScope}»-scope`),
    };
  }

  const rate = await checkRateLimit({
    key: `api:${apiKey.organizationId}`,
    ...RATE_LIMITS.api,
  });
  if (!rate.allowed) {
    const response = errorResponse(429, "rate_limited", "For mange forespørsler");
    response.headers.set("Retry-After", String(rate.resetInSeconds));
    return { ok: false, response };
  }

  // Best-effort, throttled to avoid a write per request.
  if (!apiKey.lastUsedAt || Date.now() - apiKey.lastUsedAt.getTime() > 60_000) {
    await db.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });
  }

  return {
    ok: true,
    ctx: { apiKey, organization: apiKey.organization, scopes },
  };
}

export function apiError(status: number, code: string, message: string): NextResponse {
  return errorResponse(status, code, message);
}
