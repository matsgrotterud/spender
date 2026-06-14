import { test, expect, type Page } from "@playwright/test";

async function login(page: Page, email: string) {
  await page.goto("/logg-inn");
  await page.getByLabel("E-post").fill(email);
  await page.getByLabel("Passord").fill("Demo123!");
  await page.getByRole("button", { name: /Logg inn/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("logg-inn"), { timeout: 15_000 });
}

test.describe("seeded demo accounts", () => {
  test("consumer logs in and sees requests and offers", async ({ page }) => {
    await login(page, "consumer@spender.local");
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByRole("link", { name: "Mine behov" })).toBeVisible();

    await page.getByRole("link", { name: "Tilbud" }).first().click();
    await expect(page).toHaveURL(/\/app\/tilbud/);

    // The privacy center shows data rights actions.
    await page.getByRole("link", { name: "Personvern" }).first().click();
    await expect(page.getByText(/eksport/i).first()).toBeVisible();
  });

  test("business logs in and sees the marketplace with pseudonymous requests", async ({ page }) => {
    await login(page, "business@spender.local");
    await expect(page).toHaveURL(/\/bedrift\/app/);

    await page.getByRole("link", { name: "Marked" }).first().click();
    await expect(page).toHaveURL(/\/bedrift\/app\/marked/);

    // Requests are listed under aliases – never real names.
    await expect(page.getByText(/Forbruker #/).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Demo Forbruker");
  });

  test("admin logs in and sees the system checklist", async ({ page }) => {
    await login(page, "admin@spender.local");
    await expect(page).toHaveURL(/\/admin/);

    await page.getByRole("link", { name: "System" }).first().click();
    await expect(page.getByRole("heading", { name: /Oppsettssjekkliste/i })).toBeVisible();
    await expect(page.getByText(/Krypteringsnøkkel/i)).toBeVisible();
  });

  test("role boundaries: consumer cannot open business or admin areas", async ({ page }) => {
    await login(page, "consumer@spender.local");
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin/);
    await page.goto("/bedrift/app");
    await expect(page).not.toHaveURL(/\/bedrift\/app/);
  });
});
