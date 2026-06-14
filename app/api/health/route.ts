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
  let userCount = 0;
  let faqCount = 0;

  if (checks.databaseUrl) {
    try {
      await db.$queryRaw`SELECT 1`;
      database = true;
      [userCount, faqCount] = await Promise.all([
        db.user.count(),
        db.faqItem.count({ where: { isActive: true } }),
      ]);
    } catch (error) {
      databaseError = error instanceof Error ? error.message : "connection failed";
    }
  }

  const seeded = userCount > 0;

  const ok =
    checks.databaseUrl &&
    checks.authSecret &&
    checks.encryptionKey &&
    database;

  return NextResponse.json(
    {
      ok,
      seeded,
      counts: { users: userCount, faqItems: faqCount },
      checks: { ...checks, database },
      ...(databaseError ? { databaseError } : {}),
      hint: !database
        ? "Sett DATABASE_URL, DIRECT_URL, AUTH_SECRET, ENCRYPTION_KEY og APP_URL i Vercel."
        : !seeded
          ? "Databasen er tom. Kjør npm run db:seed mot produksjon, eller sett SEED_DEMO_DATA=true i Vercel og redeploy."
          : undefined,
    },
    { status: ok ? 200 : 503 },
  );
}
