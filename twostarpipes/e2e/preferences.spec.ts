import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route(/^https:\/\//, (route) => route.abort());
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`language, light appearance and WhatsApp at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.getByLabel("Language", { exact: true })).toBeEnabled();
    const anniversary = await page.locator("[data-anniversary-logo]").boundingBox();
    const language = await page.getByLabel("Language", { exact: true }).boundingBox();
    expect(anniversary).not.toBeNull();
    expect(language).not.toBeNull();
    expect(Math.abs(anniversary!.x + anniversary!.width / 2 - width / 2)).toBeLessThan(1);
    expect(language!.x).toBeGreaterThanOrEqual(anniversary!.x + anniversary!.width);
    if (width < 1280) {
      const menu = await page.getByRole("button", { name: "Open menu" }).boundingBox();
      expect(language!.x + language!.width).toBeLessThanOrEqual(menu!.x);
    }
    await page.getByLabel("Language", { exact: true }).selectOption("te");
    await expect(page.locator("html")).toHaveAttribute("lang", "te");
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    for (const route of ["/", "/about", "/products", "/dealers", "/contact"]) {
      await page.goto(route);
      await expect(page.locator("html")).toHaveAttribute("lang", "te");
      await expect(page.locator("html")).not.toHaveClass(/dark/);
      await expect(page.locator("main")).toContainText(/[\u0c00-\u0c7f]/);
      await expect(page).toHaveTitle(/[\u0c00-\u0c7f]/);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      const links = page.locator('a[href*="wa.me"]');
      expect(await links.count()).toBeGreaterThan(0);
      for (const link of await links.all()) {
        await expect(link).toHaveAttribute("href", "https://wa.me/919505503550");
        await expect(link).toHaveAttribute("target", "_blank");
      }
    }
    if (process.env["QA_SCREENSHOTS"] === "1")
      await page.screenshot({ path: `test-results/telugu-light-${width}.png`, fullPage: true });
    await page.locator("header select").first().selectOption("en");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await expect(page.getByLabel("Your name *")).toBeVisible();
    await expect(page).toHaveTitle(/Contact & Request a Quote/);
    await page.reload();
    await expect(page.getByLabel("Language", { exact: true })).toHaveValue("en");
    await expect(page.locator("header select")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}
