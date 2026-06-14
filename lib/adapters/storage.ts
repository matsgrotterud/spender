/**
 * StorageProvider: S3/R2-compatible in production, local disk in development.
 * Only used for optional offer attachments; the app works fully without it.
 */
import { env } from "@/lib/env";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export interface StorageProvider {
  readonly name: string;
  put(key: string, data: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<Buffer | null>;
}

class LocalStorageProvider implements StorageProvider {
  readonly name = "local";
  private dir = path.join(process.cwd(), ".uploads");

  async put(key: string, data: Buffer) {
    const safeKey = crypto.createHash("sha256").update(key).digest("hex");
    await mkdir(this.dir, { recursive: true });
    await writeFile(path.join(this.dir, safeKey), data);
  }

  async get(key: string) {
    try {
      const safeKey = crypto.createHash("sha256").update(key).digest("hex");
      return await readFile(path.join(this.dir, safeKey));
    } catch {
      return null;
    }
  }
}

class S3StorageProvider implements StorageProvider {
  readonly name = "s3";

  // TODO(production): wire up @aws-sdk/client-s3 when S3/R2 credentials are
  // provided (see docs/PROVIDE_KEYS_AND_CONFIG.md). Local provider is used
  // until then so uploads never block development.
  async put(): Promise<void> {
    throw new Error("S3-lagring krever @aws-sdk/client-s3 og S3-nøkler. Se docs/PROVIDE_KEYS_AND_CONFIG.md");
  }

  async get(): Promise<Buffer | null> {
    throw new Error("S3-lagring krever @aws-sdk/client-s3 og S3-nøkler. Se docs/PROVIDE_KEYS_AND_CONFIG.md");
  }
}

export function getStorageProvider(): StorageProvider {
  if (env.s3.bucket && env.s3.accessKeyId) {
    return new S3StorageProvider();
  }
  return new LocalStorageProvider();
}
