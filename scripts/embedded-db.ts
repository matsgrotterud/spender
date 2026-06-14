/**
 * Fallback local PostgreSQL for machines without Docker.
 *
 * Starts an embedded PostgreSQL 16 server on port 5432 with the same
 * credentials as docker-compose.yml, storing data in ./.pgdata.
 *
 * Usage: npm run db:embedded
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const dataDir = path.join(process.cwd(), ".pgdata");

/**
 * The @embedded-postgres platform packages (16.1.1-beta.x) ship an ESM file
 * that references `__dirname`, which crashes at import time. Patch it to use
 * `import.meta.url` before importing. Idempotent; safe across reinstalls.
 */
function patchPlatformPackage() {
  const candidates = [
    "@embedded-postgres/darwin-arm64",
    "@embedded-postgres/darwin-x64",
    "@embedded-postgres/linux-x64",
    "@embedded-postgres/linux-arm64",
    "@embedded-postgres/windows-x64",
  ];
  for (const pkg of candidates) {
    const file = path.join(process.cwd(), "node_modules", pkg, "dist", "index.js");
    if (!existsSync(file)) continue;
    const src = readFileSync(file, "utf8");
    if (src.includes("__dirname") && !src.includes("fileURLToPath")) {
      const patched = [
        "import path from 'path';",
        "import { fileURLToPath } from 'url';",
        "const __dirname = path.dirname(fileURLToPath(import.meta.url));",
        src.replace("import path from 'path';", ""),
      ].join("\n");
      writeFileSync(file, patched);
      console.log(`Patched ESM bug in ${pkg}`);
    }
  }
}

async function main() {
  patchPlatformPackage();
  const { default: EmbeddedPostgres } = await import("embedded-postgres");

  const pg = new EmbeddedPostgres({
    databaseDir: dataDir,
    user: "spender",
    password: "spender",
    port: 5432,
    persistent: true,
  });

  if (!existsSync(path.join(dataDir, "PG_VERSION"))) {
    console.log("Initialiserer ny embedded PostgreSQL i ./.pgdata ...");
    await pg.initialise();
  }

  await pg.start();
  try {
    await pg.createDatabase("spender");
  } catch {
    // database already exists
  }

  console.log("");
  console.log("PostgreSQL kjører på postgresql://spender:spender@localhost:5432/spender");
  console.log("Trykk Ctrl+C for å stoppe.");

  const stop = async () => {
    console.log("\nStopper PostgreSQL ...");
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
