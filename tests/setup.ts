/**
 * Test setup: loads .env so DATABASE_URL and ENCRYPTION_KEY are available.
 * Existing process env always wins (CI can override).
 */
import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!match) continue;
    const key = match[1]!;
    let value = match[2]!.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

// Tests never send real email or hit Stripe.
process.env.FEATURE_MOCK_EMAIL = "true";
process.env.FEATURE_MOCK_BILLING = "true";
process.env.FEATURE_STRIPE = "false";
