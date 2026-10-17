import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { chromium, expect as baseExpect, type Page } from "@playwright/test";
import sharp from "sharp";
import type { Business } from "../src/lib/types";

const expect = baseExpect.configure({ timeout: 60000 });
const context = JSON.parse(readFileSync("/tmp/moimashinani-test-context.json", "utf8"));
const database = new URL(context.databaseUrl);
assert.ok(["localhost", "127.0.0.1"].includes(database.hostname) && database.pathname.startsWith("/moimashinani_e2e_"), "Use the disposable local workflow harness");
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";
const base = context.baseUrl;
const tag = randomUUID().slice(0, 8);
const email = `product-photos-${tag}@test.invalid`;
const screenshots = "/tmp/moimashinani-enrollment-products";

async function fitsViewport(page: Page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "Page fits viewport");
}

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const browser = await chromium.launch({ headless: true });
  const owner = await browser.newContext({ baseURL: base, viewport: { width: 390, height: 844 } });
  const errors: string[] = [];
  const page = await owner.newPage();
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync(screenshots, { recursive: true });
  // Public reads use the exact bytes written by the harness's local R2 fixture.
  await owner.route("https://r2.test.invalid/**", async (route) => {
    const key = new URL(route.request().url()).pathname.slice(1);
    const path = createHash("sha256").update(key).digest("hex");
    await route.fulfill({ contentType: "image/webp", body: readFileSync(`/tmp/moimashinani-test-images/${path}.webp`) });
  });
  try {
    await page.goto("/onboard");
    await page.getByLabel("Business name", { exact: true }).fill(`Campus Essentials ${tag}`);
    await page.getByLabel("Business WhatsApp", { exact: true }).fill("0712345678");
    await page.getByLabel("Owner name", { exact: true }).fill("Product Photo Owner");
    await page.getByLabel("Owner email (required)", { exact: true }).fill(email);
    await page.getByRole("button", { name: "Business category", exact: true }).click();
    await page.getByRole("combobox", { name: "Search business categories" }).fill("phone laptop repair");
    await page.getByRole("option").first().click();
    const names = ["Campus backpack", "Phone stand", "Notebook", "Charging cable", "Adapter", "Travel mug"];
    for (const [index, name] of names.entries()) {
      await page.getByRole("button", { name: "Add custom item", exact: true }).click();
      await page.getByLabel(`Product ${index + 1} name`, { exact: true }).fill(name);
      await page.getByLabel(`Product ${index + 1} price`, { exact: true }).fill(String((index + 1) * 100));
    }
    const png = await sharp({ create: { width: 480, height: 360, channels: 3, background: "#a9c899" } }).png().toBuffer();
    const image = { name: "product.png", mimeType: "image/png", buffer: png };
    await page.getByText("Add product photo (optional)", { exact: true }).first().click();
    let rejectUpload = true;
    await owner.route(`${base}/api/enrollment/media`, async (route) => {
      if (route.request().method() === "POST" && rejectUpload) {
        rejectUpload = false;
        await route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: "Temporary test upload failure" }) });
      } else await route.continue();
    });
    await page.getByLabel("Product 1 photo (optional)", { exact: true }).setInputFiles(image);
    await expect(page.getByText("Temporary test upload failure", { exact: true })).toBeVisible();
    const retried = page.waitForResponse((r) => r.url() === `${base}/api/enrollment/media` && r.request().method() === "POST" && r.status() === 201);
    await page.getByRole("button", { name: "Retry upload", exact: true }).click();
    const firstUrl = (await (await retried).json()).photos[0] as string;
    await expect(page.getByRole("img", { name: names[0], exact: true })).toHaveAttribute("src", firstUrl);
    assert.equal(await prisma.enrollmentMedia.count({ where: { url: firstUrl } }), 1);

    const replacement = page.waitForResponse((r) => r.url() === `${base}/api/enrollment/media` && r.request().method() === "POST" && r.status() === 201);
    await page.getByLabel("Product 1 photo (optional)", { exact: true }).setInputFiles(image);
    const productUrl = (await (await replacement).json()).photos[0] as string;
    await expect(page.getByRole("img", { name: names[0], exact: true })).toHaveAttribute("src", productUrl);
    assert.equal(await prisma.enrollmentMedia.count({ where: { url: firstUrl } }), 0, "replacing a photo releases the old asset");

    await page.getByText("Add product photo (optional)", { exact: true }).first().click();
    const temporary = page.waitForResponse((r) => r.url() === `${base}/api/enrollment/media` && r.request().method() === "POST" && r.status() === 201);
    await page.getByLabel("Product 2 photo (optional)", { exact: true }).setInputFiles(image);
    const temporaryUrl = (await (await temporary).json()).photos[0] as string;
    await expect(page.getByRole("img", { name: names[1], exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Remove photo for product 2", exact: true }).click();
    await expect(page.getByRole("img", { name: names[1], exact: true })).toHaveCount(0);
    assert.equal(await prisma.enrollmentMedia.count({ where: { url: temporaryUrl } }), 0, "removing a photo frees staged storage");

    await page.getByRole("button", { name: "Save draft", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Restore draft", exact: true }).click();
    await expect(page.getByRole("img", { name: names[0], exact: true })).toHaveAttribute("src", productUrl);
    await expect(page.getByLabel("Product 6 name", { exact: true })).toHaveValue(names[5]);
    await fitsViewport(page);
    await page.screenshot({ path: `${screenshots}/registration-mobile.png`, fullPage: true });
    console.log("PASS optional per-product upload, retry, replacement, removal and draft restoration");

    await page.getByRole("button", { name: "Continue to review", exact: true }).click();
    await expect(page.getByRole("img", { name: names[0], exact: true })).toHaveAttribute("src", productUrl);
    await page.getByLabel("Nearby landmark", { exact: true }).fill("Across the campus gate");
    await page.getByRole("checkbox", { name: /Request a free ambassador visit/ }).check();
    const saved = page.waitForResponse((r) => r.url() === `${base}/api/businesses` && r.request().method() === "POST");
    await page.getByRole("button", { name: "Submit listing for review", exact: true }).click();
    const savedResponse = await saved;
    assert.equal(savedResponse.status(), 201, await savedResponse.text());
    const business = (await savedResponse.json()).business as Business;
    assert.equal(business.services[0].photo, productUrl);
    assert.ok(business.services.slice(1).every((item) => !item.photo), "remaining photos are optional");
    assert.equal(await prisma.enrollmentMedia.count({ where: { url: productUrl } }), 0);
    assert.equal((await prisma.businessMedia.findUnique({ where: { url: productUrl } }))?.businessId, business.id);
    const mail = JSON.parse(readFileSync(context.mailPath, "utf8")) as { to: string[]; message: string }[];
    const invitation = mail.findLast((m) => m.to.includes(email));
    const verificationUrl = invitation?.message.match(/http:\/\/[^\s]+\/verify\?token=[a-f0-9]+/)?.[0];
    assert.ok(verificationUrl, "invitation captured locally");
    const verified = await owner.request.post("/api/auth/verify", { headers: { Origin: base }, data: { token: new URL(verificationUrl).searchParams.get("token"), password: "product photo owner 2026" } });
    assert.equal(verified.status(), 200, await verified.text());
    const admin = await browser.newContext({ baseURL: base });
    const signedIn = await admin.request.post("/api/auth/login", { headers: { Origin: base }, data: { email: context.admin.email, password: context.admin.password } });
    assert.equal(signedIn.status(), 200, await signedIn.text());
    const approved = await admin.request.post("/api/admin/actions", { headers: { Origin: base }, data: { action: "approve_listing", targetId: business.id } });
    assert.equal(approved.status(), 200, await approved.text());
    await admin.close();
    const stock = await owner.request.patch(`/api/businesses/${business.slug}/products`, { headers: { Origin: base }, data: { ...business.services[1], priceTo: 350, unit: "piece", note: "Adjustable desk stand", inStock: false } });
    assert.equal(stock.status(), 200, await stock.text());
    console.log("PASS enrollment persists images, transfers ownership and publishes after acceptance and review");

    await page.goto(`/b/${business.slug}`);
    const catalogue = page.getByRole("region", { name: "Products & services", exact: true });
    await expect(catalogue.getByRole("img", { name: names[0], exact: true })).toBeVisible();
    assert.ok(await catalogue.getByRole("img", { name: names[0], exact: true }).evaluate((img) => (img as HTMLImageElement).naturalWidth > 0), "product image decodes");
    await expect(catalogue.getByRole("listitem")).toHaveCount(6);
    await expect(catalogue.getByText("Out of stock", { exact: true })).toBeVisible();
    await expect(catalogue.getByText("KES 200 – 350", { exact: false })).toBeVisible();
    await expect(catalogue.getByRole("button", { name: "Ask about Phone stand", exact: true })).toBeDisabled();
    const filter = page.getByRole("searchbox", { name: "Filter items and prices", exact: true });
    await filter.fill("adjustable");
    await expect(catalogue.getByRole("listitem")).toHaveCount(1);
    await filter.fill("no matching product");
    await expect(catalogue.getByText(/No items match/)).toBeVisible();
    await catalogue.getByRole("button", { name: "Clear search", exact: true }).click();
    await expect(catalogue.getByRole("listitem")).toHaveCount(6);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 950 });
      await fitsViewport(page);
      await catalogue.screenshot({ path: `${screenshots}/catalogue-${width}.png` });
    }
    await catalogue.getByRole("button", { name: "Ask about Campus backpack", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    console.log("PASS responsive profile catalogue, decoded photos, prices, stock, search and item inquiry");

    const noPhoto = await owner.request.patch(`/api/businesses/${business.slug}/products`, { headers: { Origin: base }, data: { ...business.services[0], photo: "" } });
    assert.equal(noPhoto.status(), 200, await noPhoto.text());
    await page.reload();
    await expect(catalogue.getByRole("listitem")).toHaveCount(6);
    await expect(catalogue.getByRole("img")).toHaveCount(0);
    assert.deepEqual(errors, []);
    console.log(`PASS catalogue without product photos; screenshots: ${screenshots}`);
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
