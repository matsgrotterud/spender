/**
 * App-level authenticated encryption for private payloads (AES-256-GCM).
 *
 * Everything that can identify a person directly (name, phone, exact address,
 * meter number, license plate, …) is stored through encryptJson and never in
 * plaintext columns. The key lives only in the ENCRYPTION_KEY env variable.
 */
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ENCRYPTION_KEY must be set to a 32-byte hex string (64 chars). Generate with: openssl rand -hex 32",
    );
  }
  return Buffer.from(hex, "hex");
}

/** Encrypts any JSON-serializable payload. Returns "v1.<iv>.<tag>.<ciphertext>" (base64url). */
export function encryptJson(payload: unknown): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const plaintext = Buffer.from(JSON.stringify(payload), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Decrypts a string produced by encryptJson. Throws on tampering or wrong key. */
export function decryptJson<T = unknown>(token: string): T {
  const [version, ivB64, tagB64, dataB64] = token.split(".");
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload format");
  }
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64url")),
    decipher.final(),
  ]);
  return JSON.parse(plaintext.toString("utf8")) as T;
}

/**
 * One-way keyed hash for values we must be able to compare but never read
 * back (IP addresses, user agents in consent records, API keys).
 */
export function safeHash(value: string): string {
  const key = getKey();
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

/** Plain SHA-256 (hex) – used for API key lookup where the key itself is high-entropy. */
export function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Generates an API key. Returns plaintext (shown once) and storage hash. */
export function generateApiKey(): { plaintext: string; hashed: string; prefix: string } {
  const random = crypto.randomBytes(24).toString("base64url");
  const plaintext = `sp_live_${random}`;
  return { plaintext, hashed: sha256(plaintext), prefix: plaintext.slice(0, 12) };
}

/** Generates a webhook signing secret. */
export function generateWebhookSecret(): string {
  return `whsec_${crypto.randomBytes(24).toString("base64url")}`;
}

/** Constant-time string comparison. */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
