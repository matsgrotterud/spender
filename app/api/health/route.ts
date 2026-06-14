import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/**
 * Lightweight health check for production debugging (Vercel, uptime monitors).
 * Does not expose secrets – only whether required config looks present.
 */
export async function GET() {
  const checks = {
    databaseUrl: Boolean(process.env.DATABASE_URL),
    authSecret: Boolean(env.authSecret),
    encryptionKey: env.encryptionKey.length === 64,
    appUrl: Boolean(env.appUrl),
  };

  let database = false;
  let databaseError: string | undefined;

  if (checks.databaseUrl) {
    try {
      await db.$queryRaw`SELECT 1`;
      database = true;
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "connection failed";
    }
  }

  const ok =
    checks.databaseUrl &&
    checks.authSecret &&
    checks.encryptionKey &&
    database;

  return NextResponse.json(
    {
      ok,
      checks: { ...checks, database },
      ...(databaseError ? { databaseError } : {}),
      hint: ok
        ? undefined
        : "Sett DATABASE_URL, DIRECT_URL, AUTH_SECRET, ENCRYPTION_KEY og APP_URL i Vercel. Kjør deretter db:seed mot produksjons-DB.",
    },
    { status: ok ? 200 : 503 },
  );
}
