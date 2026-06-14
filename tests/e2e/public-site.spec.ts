import { test, expect } from "@playwright/test";

test.describe("public site", () => {
  test("landing page renders hero, categories and legal disclaimers", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Få tilbud uten å bli nedringt/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Legg inn behov/i }).first()).toBeVisible();
    await expect(page.getByText(/Spender selger ikke kontaktinformasjonen din/i).first()).toBeVisible();
  });

  test("category landing pages exist", async ({ page }) => {
    for (const path of ["/strom", "/mobilabonnement", "/forsikring", "/bedrift"]) {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      await expect(page.locator("h1")).toBeVisible();
    }
  });

  test("seo artifacts are served", async ({ request }) => {
    const robots = await request.get("/robots.txt");
    expect(robots.status()).toBe(200);
    expect(await robots.text()).toContain("Disallow");

    const sitemap = await request.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);

    const llms = await request.get("/llms.txt");
    expect(llms.status()).toBe(200);
    expect(await llms.text()).toContain("Spender");
  });

  test("faq and articles render seeded content", async ({ page }) => {
    await page.goto("/faq");
    await expect(page.getByText(/Hva er Spender/i).first()).toBeVisible();

    await page.goto("/artikler");
    await page
      .getByRole("link", { name: /Hvordan finne billig strøm uten å bli oppringt/i })
      .first()
      .click();
    await expect(page.locator("h1")).toContainText(/billig strøm/i);
  });

  test("private dashboards redirect anonymous visitors to login", async ({ page }) => {
    await page.goto("/app");
    await expect(page).toHaveURL(/logg-inn/);
    await page.goto("/admin");
    await expect(page).toHaveURL(/logg-inn/);
  });
});
