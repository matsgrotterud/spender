import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { checkRateLimit } from "@/lib/rate-limit";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const bodySchema = z.object({
  preferences: z.object({
    necessary: z.literal(true),
    analytics: z.boolean(),
  }),
  consentVersion: z.string().max(50),
});

export async function POST(req: Request) {
  const rate = await checkRateLimit({ key: "cookie-consent", limit: 100, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "For mange forespørsler" }, { status: 429 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ugyldig forespørsel" }, { status: 400 });
  }

  const user = await getCurrentUser();

  const cookieStore = cookies();
  let anonymousId = cookieStore.get("spender-anon-id")?.value;
  if (!user && !anonymousId) {
    anonymousId = crypto.randomUUID();
  }

  await db.cookieConsent.create({
    data: {
      userId: user?.id,
      anonymousId: user ? null : anonymousId,
      preferencesJson: parsed.data.preferences,
      consentVersion: parsed.data.consentVersion,
    },
  });

  const res = NextResponse.json({ ok: true });
  if (!user && anonymousId) {
    res.cookies.set("spender-anon-id", anonymousId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
