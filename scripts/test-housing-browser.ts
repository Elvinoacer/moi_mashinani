import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium, expect as playwrightExpect } from "@playwright/test";

const expect = playwrightExpect.configure({ timeout: 60000 });

const context = JSON.parse(readFileSync("/tmp/moimashinani-test-context.json", "utf8"));
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const browser = await chromium.launch({ headless: true });
  const ids: string[] = [];
  try {
    for (const width of [390, 1366]) {
      const tag = randomUUID();
      const poster = await browser.newContext({ baseURL: context.baseUrl, viewport: { width, height: 900 }, extraHTTPHeaders: { "X-Forwarded-For": tag } });
      const page = await poster.newPage();
      page.setDefaultNavigationTimeout(120000);
      page.setDefaultTimeout(60000);
      const errors: string[] = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto("/housing");
      await expect(page.getByRole("heading", { name: /A place to stay/ })).toBeVisible();
      await expect(page.getByLabel("Housing scam caution")).toBeVisible();
      // Header shortcut should select a vacancy without a second choice or login.
      await page.getByRole("button", { name: width < 640 ? "Post" : "Post or list", exact: true }).click();
      await page.getByRole("dialog").getByRole("link", { name: /List a housing vacancy/ }).click();
      await expect(page.getByRole("dialog").getByRole("radio", { name: "Vacancy available / I know a place" })).toBeChecked();
      await page.getByRole("dialog").getByRole("button", { name: "Close dialog" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);

      // The global listing chooser deep-link opens the existing vacancy form.
      await page.goto("/housing?post=vacancy");
      await expect(page.getByRole("dialog").getByRole("radio", { name: "Vacancy available / I know a place" })).toBeChecked();
      await page.getByRole("dialog").getByRole("button", { name: "Close dialog" }).click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page).toHaveURL(/\/housing$/);

      // Listing does not require login, business ownership, or checkout.
      await page.getByRole("button", { name: "List a vacancy — free", exact: true }).click();
      let dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("radio", { name: "Vacancy available / I know a place" })).toBeChecked();
      const vacancyQuery = `Browser vacancy ${tag}: single room KES 3,500, available now near Chebarus`;
      await dialog.getByLabel("Housing details").fill(vacancyQuery);
      await dialog.getByLabel("Campus area", { exact: true }).selectOption("chebarus");
      await dialog.getByLabel("Your WhatsApp number").fill("0712345678");
      await dialog.getByLabel(/I agree to share my WhatsApp number/).check();
      await dialog.getByLabel(/I have read the housing scam caution/).check();
      const publishedResponse = page.waitForResponse(response => response.url().endsWith("/api/demand") && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "Publish housing post — free" }).click();
      const published = await (await publishedResponse).json();
      ids.push(published.id);
      await expect(dialog.getByRole("heading", { name: "Your housing post is live" })).toBeVisible();
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      await expect(page.getByText(vacancyQuery, { exact: true })).toBeVisible();

      // A different, signed-out person sees the caution before either reply type.
      const visitor = await browser.newContext({ baseURL: context.baseUrl, viewport: { width, height: 900 }, extraHTTPHeaders: { "X-Forwarded-For": randomUUID() } });
      // Keep the external app boundary local. Opening/closing real WhatsApp
      // popups can leave the browser driver waiting on an unrelated window.
      // Use plain JS source so tsx cannot inject module helpers into the browser.
      await visitor.addInitScript({ content: `(() => {
        let handoffUrl = "";
        Object.defineProperty(window, "__housingHandoffUrl", { get: () => handoffUrl });
        window.open = () => ({
          opener: null,
          location: { set href(value) { handoffUrl = value; } },
          close() {},
        });
      })();` });
      const visitorPage = await visitor.newPage();
      visitorPage.setDefaultNavigationTimeout(120000);
      visitorPage.setDefaultTimeout(60000);
      visitorPage.on("pageerror", error => errors.push(error.message));
      await visitorPage.goto("/housing");
      assert.equal(await visitorPage.evaluate("typeof window.__housingHandoffUrl"), "string");
      await visitorPage.getByRole("button", { name: "Vacancies available", exact: true }).click();
      const card = visitorPage.locator("article").filter({ hasText: vacancyQuery });
      await card.getByRole("button", { name: "Ask about this vacancy" }).click();
      dialog = visitorPage.getByRole("dialog");
      await expect(dialog.getByLabel("Housing scam caution")).toBeVisible();
      const continueButton = dialog.getByRole("button", { name: "Continue to WhatsApp — free" });
      await expect(continueButton).toBeDisabled();
      await dialog.getByRole("checkbox").check();
      const handoffResponse = visitorPage.waitForResponse(response => response.url().endsWith(`/api/demand/${published.id}/respond`));
      await continueButton.click();
      const handoff = await handoffResponse;
      assert.equal(handoff.status(), 200);
      const handoffData = await handoff.json();
      assert.match(handoffData.url, /^https:\/\/wa.me\/254712345678\?/);
      await expect(visitorPage.getByRole("dialog")).toHaveCount(0);
      assert.equal(await visitorPage.evaluate(() => (window as unknown as { __housingHandoffUrl: string }).__housingHandoffUrl), handoffData.url);

      await page.bringToFront();
      await page.getByRole("button", { name: "I'm looking for a house", exact: true }).click();
      dialog = page.getByRole("dialog");
      await expect(dialog.getByRole("radio", { name: "Looking for a house / rental", exact: true })).toBeChecked();
      const lookingQuery = `Browser house search ${tag}: bedsitter at CHS under KES 5,000`;
      await dialog.getByLabel("Housing details").fill(lookingQuery);
      await dialog.getByLabel("Campus area", { exact: true }).selectOption("chs");
      await dialog.getByLabel(/I agree to share my WhatsApp number/).check();
      await dialog.getByLabel(/I have read the housing scam caution/).check();
      const lookingResponse = page.waitForResponse(response => response.url().endsWith("/api/demand") && response.request().method() === "POST");
      await dialog.getByRole("button", { name: "Publish housing post — free" }).click();
      const looking = await (await lookingResponse).json();
      ids.push(looking.id);
      await expect(dialog.getByRole("heading", { name: "Your housing post is live" })).toBeVisible();
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      await visitorPage.bringToFront();
      await visitorPage.reload();
      await visitorPage.getByRole("button", { name: "Looking for a house", exact: true }).click();
      const lookingCard = visitorPage.locator("article").filter({ hasText: lookingQuery });
      await lookingCard.getByRole("button", { name: "Respond with a vacancy" }).click();
      dialog = visitorPage.getByRole("dialog");
      await expect(dialog.getByRole("heading", { name: "Before responding to this house seeker" })).toBeVisible();
      await expect(dialog.getByRole("button", { name: "Continue to WhatsApp — free" })).toBeDisabled();
      await dialog.getByRole("checkbox").check();
      const lookingHandoff = visitorPage.waitForResponse(response => response.url().endsWith(`/api/demand/${looking.id}/respond`));
      await dialog.getByRole("button", { name: "Continue to WhatsApp — free" }).click();
      assert.equal((await lookingHandoff).status(), 200);
      await expect(visitorPage.getByRole("dialog")).toHaveCount(0);
      await visitorPage.bringToFront();

      // The expanded picker is searchable and supports areas outside the named list.
      await visitorPage.getByRole("button", { name: /Your campus area/ }).click();
      await visitorPage.getByRole("combobox", { name: "Search campus areas" }).fill("CHS");
      await visitorPage.getByRole("option", { name: /CHS/ }).click();
      await expect(visitorPage.getByText(lookingQuery, { exact: true })).toBeVisible();
      await visitorPage.getByRole("button", { name: /Your campus area/ }).click();
      await visitorPage.getByRole("combobox", { name: "Search campus areas" }).fill("unlisted location");
      await visitorPage.getByRole("button", { name: "choose Other Moi campus / area" }).click();
      await expect(visitorPage.getByRole("button", { name: /Your campus area Other Moi campus/ })).toBeVisible();

      await page.bringToFront();
      await page.getByRole("button", { name: "Vacancies available", exact: true }).click();
      const ownCard = page.locator("article").filter({ hasText: vacancyQuery });
      await ownCard.getByRole("button", { name: "Mark vacancy taken" }).click();
      await ownCard.getByRole("button", { name: "Yes, close" }).click();
      await expect(ownCard).toHaveCount(0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      assert.deepEqual(errors, []);
      await page.screenshot({ path: `/tmp/housing-board-${width}.png`, fullPage: true });
      console.log(`PASS housing browser ${width}px: two-way posts/replies without login, scam caution, location search, close vacancy, no horizontal overflow`);
      await visitor.close();
      await poster.close();
    }
  } catch (error) {
    const pages = browser.contexts().flatMap(item => item.pages());
    for (const [index, page] of pages.entries()) {
      if (!page.isClosed()) await page.screenshot({ path: `/tmp/housing-error-${index}.png`, fullPage: true }).catch(() => {});
    }
    throw error;
  } finally {
    await browser.close();
    await prisma.serviceRequest.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
