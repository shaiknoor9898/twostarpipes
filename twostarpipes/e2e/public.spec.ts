import { test, expect } from "@playwright/test";
test("liveness is local, uncached and discloses no configuration", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(await response.json()).toEqual({ status: "ok" });
});
test.beforeEach(async ({ page }) => {
  // No external messages, CAPTCHA solving, telemetry or real Auth traffic in local QA.
  await page.route(/^https:\/\//, (route) => route.abort());
});
for (const width of [390, 768, 1440]) {
  test(`public navigation and quote validation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Two Star Pipes");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    if (width < 1024) {
      await page.getByRole("button", { name: "Open menu" }).click();
      await page
        .getByRole("navigation", { name: "Mobile navigation" })
        .getByRole("link", { name: "Products", exact: true })
        .click();
    } else
      await page
        .getByRole("navigation", { name: "Main navigation" })
        .getByRole("link", { name: "Products", exact: true })
        .click();
    await expect(page.getByLabel("Search products")).toBeVisible();
    await page.getByLabel("Search products").fill("nonexistent-product");
    await expect(page.getByText("No matching products.", { exact: false })).toBeVisible();
    await page.goto("/contact");
    await page.getByRole("button", { name: "Request a Quote", exact: true }).click();
    await expect(page.getByText("Please enter your name", { exact: true })).toBeVisible();
    await page.getByLabel("Your name *").fill("QA fixture");
    await page.getByLabel("Phone / WhatsApp *").fill("1234567890");
    await page.getByLabel("Product *", { exact: true }).selectOption({ label: "PVC Pipes" });
    await page.getByRole("button", { name: "Request a Quote", exact: true }).click();
    await expect(page.getByText("Please complete the security check.")).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (process.env["QA_SCREENSHOTS"] === "1")
      await page.screenshot({ path: `test-results/contact-${width}.png`, fullPage: true });
    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
    await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    if (process.env["QA_SCREENSHOTS"] === "1")
      await page.screenshot({ path: `test-results/admin-login-${width}.png`, fullPage: true });
  });
}
test("reduced-motion carousel, keyboard navigation and private login", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByText("Autoplay off", { exact: true })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Admin sign in" })).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toHaveAttribute("type", "password");
  await expect(page.locator("main")).not.toContainText("QA fixture");
  await page.route("https://example.supabase.co/auth/v1/token**", (route) =>
    route.fulfill({
      status: 400,
      contentType: "application/json",
      body: JSON.stringify({ error: "invalid_grant", error_description: "Invalid credentials" }),
    }),
  );
  await page.getByLabel("Email", { exact: true }).fill("nonadmin@example.com");
  await page.getByLabel("Password", { exact: true }).fill("invalid-test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Sign-in failed");
});
