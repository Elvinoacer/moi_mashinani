import assert from "node:assert/strict";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, expect as baseExpect, type Page } from "@playwright/test";

const expect = baseExpect.configure({ timeout: 60000 });
const harness = JSON.parse(readFileSync("/tmp/moimashinani-test-context.json", "utf8"));
const database = new URL(harness.databaseUrl);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname.startsWith("/moimashinani_e2e_"), "Use the disposable local workflow harness");
const screenshots = "/tmp/mm-motion";

async function fits(page: Page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Page must not overflow horizontally");
}
async function idle(page: Page) {
  await expect(page.locator('[data-state="idle"][aria-hidden="true"]')).toHaveCount(1);
}

async function main() {
  mkdirSync(screenshots, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: harness.baseUrl, viewport: { width: 1440, height: 1000 } });
  const errors: string[] = [];
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(180000);
  page.on("pageerror", (error) => errors.push(error.message));

  try {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#landing-query")).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/PublicMotion.*scope/);
    await idle(page);
    await fits(page);
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${screenshots}/landing-desktop.png`, fullPage: true });
    assert.equal(await page.locator('a[href^="/b/"]').count() > 0, true, "Landing contains businesses");
    console.log("PASS desktop landing: visible search, business discovery, motion mounted, no overflow");

    // A real link remains responsive and settles without remounting the layout.
    await page.locator('header a[href="/search"]').first().click();
    await expect(page).toHaveURL(/\/search$/);
    await expect(page.locator(".directory-results-grid")).toBeVisible();
    await idle(page);
    await fits(page);
    await page.screenshot({ path: `${screenshots}/search-desktop.png`, fullPage: true });

    // Query-only navigation must clear progress just as a pathname change does.
    const zone = page.locator('footer a[href^="/search?zone="]').first();
    const zoneHref = await zone.getAttribute("href");
    assert.ok(zoneHref);
    await zone.click();
    await expect(page).toHaveURL(new URL(zoneHref, harness.baseUrl).href);
    await idle(page);
    await page.goBack();
    await expect(page).toHaveURL(/\/search$/);
    await idle(page);
    console.log("PASS navigation: public links, query-only change and browser back settle progress");

    // Current-page clicks must not start an orphaned pending indicator.
    await page.locator('header a[href="/search"]').first().click();
    await idle(page);

    await page.locator('footer a[href="/c/food-cafes"]').click();
    await expect(page).toHaveURL(/\/c\/food-cafes$/);
    await expect(page.locator('a[href^="/b/"]').first()).toBeVisible();
    await idle(page);
    await fits(page);
    await page.screenshot({ path: `${screenshots}/category-desktop.png`, fullPage: true });
    await page.locator('a[href^="/b/"]').first().click();
    await expect(page).toHaveURL(/\/b\//);
    await expect(page.locator("main h1")).toBeVisible();
    await idle(page);
    await fits(page);
    await page.screenshot({ path: `${screenshots}/profile-desktop.png`, fullPage: true });
    console.log("PASS category and business profile navigation, content visibility and viewport fit");

    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect(page.locator("#landing-query")).toBeVisible();
      await fits(page);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${screenshots}/landing-${width}.png`, fullPage: true });
    }
    console.log("PASS landing fits 320px, 390px and 768px screens");

    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expect(page.locator("#landing-query")).toBeVisible();
    await expect(page.locator("body")).toHaveClass(/PublicMotion.*scope/);
    await page.mouse.click(20, 20);
    assert.equal(await page.locator('[class*="PublicMotion"][class*="tap"]').count(), 0);
    assert.equal(await page.evaluate(() => document.getAnimations().filter((animation) => animation.playState === "running" && animation.effect instanceof KeyframeEffect && (animation.effect.target as Element | null)?.closest('[data-motion="reveal"]')).length), 0, "Reduced motion skips reveal animations");
    await page.screenshot({ path: `${screenshots}/landing-reduced-motion.png`, fullPage: true });
    console.log("PASS reduced motion: visible content, no reveal or tap animations");

    // Exercise a data-loading failure rather than depending on a healthy API.
    await page.route("**/api/businesses?*", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "Test directory temporarily unavailable" }) }));
    await page.goto("/search?q=motion-error-check", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Test directory temporarily unavailable", { exact: true })).toBeVisible();
    await idle(page);
    await fits(page);
    await page.screenshot({ path: `${screenshots}/search-error-mobile.png`, fullPage: true });
    await page.unroute("**/api/businesses?*");
    console.log("PASS failed directory load: error stays visible and progress clears");

    await page.goto("/dashboard", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toHaveClass(/PublicMotion.*scope/);
    await idle(page);
    assert.deepEqual(errors, [], "No browser runtime errors");
    console.log(`PASS private routes excluded; no runtime errors. Screenshots: ${screenshots}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
