import { defineConfig } from "@playwright/test";

/**
 * E2E tests run against a dev server with the seeded database.
 * Prerequisites: database running (npm run db:embedded or db:up) + npm run db:seed.
 */
// Dedicated port so tests never hit an unrelated app on :3000.
const PORT = process.env.E2E_PORT ?? "3100";
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: BASE_URL,
    locale: "nb-NO",
    timezoneId: "Europe/Oslo",
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      APP_URL: BASE_URL,
      NEXTAUTH_URL: BASE_URL,
    },
  },
});
