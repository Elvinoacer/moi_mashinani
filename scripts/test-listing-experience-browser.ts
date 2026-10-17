import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, expect as baseExpect, type Page, type BrowserContext } from "@playwright/test";
import sharp from "sharp";
import type { Business } from "../src/lib/types";

const expect = baseExpect.configure({ timeout: 60000 });
const harness = JSON.parse(readFileSync("/tmp/moimashinani-test-context.json", "utf8"));
const database = new URL(harness.databaseUrl);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname.startsWith("/moimashinani_e2e_"), "Use the disposable local workflow harness");
process.env.DATABASE_URL = harness.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";
const base = harness.baseUrl;
const tag = randomUUID().slice(0, 8);
const screenshots = "/tmp/moimashinani-listing-experience";

function track(page: Page, errors: string[]) {
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(180000);
  page.on("pageerror", (error) => errors.push(error.message));
}
async function fixtureImages(context: BrowserContext) {
  await context.route("https://r2.test.invalid/**", async (route) => {
    const key = new URL(route.request().url()).pathname.slice(1);
    await route.fulfill({ contentType: "image/webp", body: readFileSync(`/tmp/moimashinani-test-images/${createHash("sha256").update(key).digest("hex")}.webp`) });
  });
}
async function fits(page: Page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Page must fit viewport");
}
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { hashPassword } = await import("../src/lib/auth");
  const browser = await chromium.launch({ headless: true });
  const owner = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } });
  await fixtureImages(owner);
  const visitor = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } });
  await fixtureImages(visitor);
  const errors: string[] = [];
  const page = await owner.newPage(); track(page, errors);
  const publicPage = await visitor.newPage(); track(publicPage, errors);
  const admin = await browser.newContext({ baseURL: base });
  mkdirSync(screenshots, { recursive: true });
  let business: Business | undefined;
  try {
    const email = `listing-ux-${tag}@test.invalid`, password = "listing photo test 2026";
    await prisma.account.create({ data: { email, name: "Campus Seller", role: "BUSINESS", emailVerifiedAt: new Date(), passwordHash: await hashPassword(password) } });
    const login = await owner.request.post("/api/auth/login", { headers: { Origin: base }, data: { email, password } });
    assert.equal(login.status(), 200, await login.text());
    await page.goto("/market?post=1");
    const dialog = page.getByRole("dialog", { name: "Create your free listing" });
    await expect(dialog).toBeVisible();
    console.log("Student modal opened");
    await page.getByRole("radio", { name: /My student hustle/ }).check();
    const listingName = `Campus Braids ${tag}`;
    await page.getByLabel("Item or service name", { exact: true }).fill(listingName);
    await page.getByLabel("Price (KES)", { exact: true }).fill("1200");
    await page.getByRole("button", { name: "Business category", exact: true }).click();
    await page.getByRole("combobox", { name: "Search business categories" }).fill("hair");
    await dialog.getByRole("option").first().click();
    await page.getByLabel("Condition / service details", { exact: true }).fill("Neat campus braids by appointment. Bring your preferred extensions.");
    console.log("Student listing details entered");
    const makeImage = async (name: string, color: string) => ({ name, mimeType: "image/png", buffer: await sharp({ create: { width: 600, height: 420, channels: 3, background: color } }).png().toBuffer() });
    const firstImage = await makeImage("braids.png", "#7f9f59"), secondImage = await makeImage("workspace.png", "#d6ae68");
    let reject = true;
    await owner.route(`${base}/api/enrollment/media`, async (route) => {
      if (route.request().method() === "POST" && reject) { reject = false; await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Temporary photo failure" }) }); }
      else await route.continue();
    });
    await page.getByLabel("Listing photos (public)", { exact: true }).setInputFiles([firstImage, secondImage]);
    await expect(page.getByText("Temporary photo failure", { exact: true })).toBeVisible();
    const uploaded = page.waitForResponse((r) => r.url() === `${base}/api/enrollment/media` && r.status() === 201);
    await page.getByRole("button", { name: "Retry upload", exact: true }).click();
    const urls = (await (await uploaded).json()).photos as string[];
    await expect(page.getByRole("group", { name: "Listing photos", exact: true }).getByRole("img")).toHaveCount(2);
    await page.getByRole("button", { name: "Use photo 2 as cover", exact: true }).click();
    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.getByRole("button", { name: "Close dialog", exact: true }).click();
    await page.getByRole("button", { name: "Post a free listing", exact: true }).click();
    await page.getByRole("button", { name: "Restore draft", exact: true }).click();
    await expect(page.getByLabel("Item or service name", { exact: true })).toHaveValue(listingName);
    await expect(page.getByRole("img", { name: "Listing photo 1", exact: true })).toHaveAttribute("src", urls[1]);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 }); await fits(page);
      const box = await dialog.boundingBox(); assert.ok(box && box.x >= 0 && box.width <= width, "Modal fits viewport");
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await dialog.screenshot({ path: `${screenshots}/student-details-mobile.png` });
    await page.getByRole("button", { name: "Continue to review", exact: true }).click();
    await expect(page.getByRole("region", { name: "Your listing preview", exact: true }).getByRole("img")).toHaveAttribute("src", urls[1]);
    await page.getByLabel("Your WhatsApp or contact number", { exact: true }).fill("0712345678");
    await page.getByLabel("Safe meeting point / hostel landmark", { exact: true }).fill("Main hostel gate beside the campus shop");
    await page.getByRole("checkbox", { name: /I agree to publish/ }).check();
    await dialog.screenshot({ path: `${screenshots}/student-review-mobile.png` });
    const saved = page.waitForResponse((r) => r.url() === `${base}/api/businesses` && r.request().method() === "POST");
    await page.getByRole("button", { name: "Submit free student listing", exact: true }).click();
    const savedResponse = await saved; assert.equal(savedResponse.status(), 201, await savedResponse.text());
    business = (await savedResponse.json()).business;
    assert.ok(business); assert.equal(business.coverPhoto, urls[1]); assert.equal(business.services[0].photo, urls[1]);
    assert.equal((await prisma.businessMedia.findUnique({ where: { url: urls[1] } }))?.businessId, business.id);
    await expect(page.getByRole("heading", { name: "Your listing is on its way." })).toBeVisible();
    const pendingPublic = await owner.request.get(`/api/businesses/${business.slug}?public=1`);
    assert.equal(pendingPublic.status(), 404, "Public preview must not expose pending listings even to an owner");
    console.log("PASS student modal: upload retry, cover selection, draft restore, review and owned photo persistence");

    const signedIn = await admin.request.post("/api/auth/login", { headers: { Origin: base }, data: harness.admin });
    assert.equal(signedIn.status(), 200);
    const approved = await admin.request.post("/api/admin/actions", { headers: { Origin: base }, data: { action: "approve_listing", targetId: business.id } });
    assert.equal(approved.status(), 200, await approved.text());
    await publicPage.goto(`/b/${business.slug}`);
    const publicCover = publicPage.getByRole("img", { name: `${listingName} storefront in ${business.zone}, Moi University Kesses`, exact: true });
    await expect(publicCover).toHaveAttribute("src", urls[1]);
    assert.ok(await publicCover.evaluate((img) => (img as HTMLImageElement).naturalWidth > 0));

    await page.goto(`/dashboard/${business.slug}?tab=photos`);
    await expect(page.getByRole("button", { name: "Save photos", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Use photo 2 as cover", exact: true }).click();
    await expect(page.getByText("You have unsaved changes", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save photos", exact: true })).toBeInViewport();
    assert.equal((await visitor.request.get(`/api/businesses/${business.slug}`)).status(), 200);
    assert.equal((await (await visitor.request.get(`/api/businesses/${business.slug}`)).json()).coverPhoto, urls[1], "Unsaved cover is not published");
    await page.getByRole("button", { name: "Discard", exact: true }).click();
    await expect(page.getByRole("button", { name: "Save photos", exact: true })).toBeDisabled();
    await page.getByRole("button", { name: "Use photo 2 as cover", exact: true }).click();
    let rejectSave = true;
    await owner.route(`${base}/api/businesses/${business.slug}`, async (route) => {
      if (route.request().method() === "PATCH" && rejectSave) { rejectSave = false; await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Temporary save failure" }) }); }
      else await route.continue();
    });
    await page.getByRole("button", { name: "Save photos", exact: true }).click();
    await expect(page.getByText("Couldn’t save changes", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save photos", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Save photos", exact: true }).click();
    await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
    await page.screenshot({ path: `${screenshots}/gallery-saved-mobile.png`, fullPage: true });
    await publicPage.evaluate(() => window.dispatchEvent(new Event("focus")));
    await expect(publicCover).toHaveAttribute("src", urls[0]);
    console.log("PASS dashboard: explicit save, visible mobile action, discard, failed-save retry and already-open public profile refresh");

    // A product-only image must remain discoverable after the gallery is cleared.
    await page.getByRole("button", { name: "Remove listing photo 1", exact: true }).click();
    await page.getByRole("button", { name: "Remove listing photo 1", exact: true }).click();
    await page.getByRole("button", { name: "Save photos", exact: true }).click();
    await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
    await publicPage.reload();
    await expect(publicCover).toHaveAttribute("src", urls[1]);
    const publicData = await (await owner.request.get(`/api/businesses/${business.slug}?public=1`)).json();
    assert.equal(publicData.ownerEmail, undefined, "Explicit public reads must strip private account details");
    await publicPage.goto("/market");
    const card = publicPage.getByRole("article").filter({ has: publicPage.getByRole("heading", { name: listingName, exact: true }) });
    await expect(card.locator("img")).toHaveAttribute("src", urls[1]);
    assert.ok(await card.locator("img").evaluate((img) => (img as HTMLImageElement).naturalWidth > 0));

    await page.goto(`/dashboard/${business.slug}?tab=services`);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const replacementUpload = page.waitForResponse((r) => r.url() === `${base}/api/uploads` && r.status() === 201);
    await page.getByLabel("Product / service photo (optional)", { exact: true }).setInputFiles(firstImage);
    const replacement = (await (await replacementUpload).json()).photos[0];
    await expect(page.getByRole("button", { name: "Save item", exact: true })).toBeEnabled();
    await expect(page.getByRole("button", { name: "Save item", exact: true })).toBeInViewport();
    await page.getByRole("button", { name: "Save item", exact: true }).click();
    await expect(page.getByText("Item and photo saved. Your public listing is up to date.", { exact: true })).toBeVisible();
    await publicPage.goto(`/b/${business.slug}`);
    await expect(publicCover).toHaveAttribute("src", replacement);
    await expect(publicPage.getByRole("region", { name: "Products & services", exact: true }).getByRole("img", { name: listingName, exact: true })).toHaveAttribute("src", replacement);
    console.log("PASS product photo edits appear in the public card, hero and catalogue");

    await page.goto(`/dashboard/${business.slug}?tab=details`);
    await expect(page.getByRole("button", { name: "Save business information", exact: true })).toBeDisabled();
    await page.getByLabel("Description", { exact: true }).fill("Updated student braiding appointments. Available on campus every afternoon.");
    await expect(page.getByRole("button", { name: "Save business information", exact: true })).toBeInViewport();
    await page.getByRole("button", { name: "Save business information", exact: true }).click();
    await expect(page.getByText("All changes saved", { exact: true })).toBeVisible();
    for (const width of [320, 390, 768, 1440]) { await page.setViewportSize({ width, height: 950 }); await fits(page); }
    await page.screenshot({ path: `${screenshots}/details-saved-desktop.png`, fullPage: true });
    assert.deepEqual(errors, []);
    console.log(`PASS responsive editing and clean browser runtime; screenshots: ${screenshots}`);
  } catch (error) {
    await page.screenshot({ path: `${screenshots}/failure.png` }).catch(() => {});
    console.error((await page.locator("body").innerText().catch(() => "")).slice(-2000));
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
