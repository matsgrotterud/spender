/**
 * Production build for Vercel/CI.
 * Runs Prisma generate + migrate deploy, then Next.js build.
 *
 * If DIRECT_URL is missing but DATABASE_URL is set, DIRECT_URL defaults to
 * DATABASE_URL (works for providers without a separate pooler URL).
 */
import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadDotEnv() {
  const path = resolve(process.cwd(), ".env");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadDotEnv();

const env = { ...process.env };

if (env.DATABASE_URL && !env.DIRECT_URL) {
  console.warn(
    "[build] DIRECT_URL not set – using DATABASE_URL as fallback. " +
      "For Neon/Supabase with pooler, set DIRECT_URL to the direct connection string.",
  );
  env.DIRECT_URL = env.DATABASE_URL;
}

if (!env.DATABASE_URL) {
  console.error(
    "[build] DATABASE_URL is required. Add it in Vercel → Settings → Environment Variables.",
  );
  process.exit(1);
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit", env });
}

run("npx prisma generate");
run("npx prisma migrate deploy");

if (env.SEED_DEMO_DATA === "true") {
  console.log("[build] SEED_DEMO_DATA=true – seeding demo users and content …");
  run("npx tsx prisma/seed.ts");
}

run("npx next build");
