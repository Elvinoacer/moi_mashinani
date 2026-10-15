import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { chromium, expect as baseExpect } from "@playwright/test";
import sharp from "sharp";
const expect = baseExpect.configure({ timeout: 90000 });
const context = JSON.parse(
  readFileSync("/tmp/moimashinani-test-context.json", "utf8"),
);
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";
process.env.APP_URL = context.baseUrl;
async function main() {
  const fixture = JSON.parse(
    readFileSync("/tmp/mm-habit-fixture.json", "utf8"),
  );
  const { prisma } = await import("../src/lib/prisma");
  const { createMerchantAction } = await import("../src/lib/merchant-actions");
  const { requestPhoneCode } = await import("../src/lib/phone-auth");
  const dropTitle = `Browser dinner drop ${randomUUID().slice(0, 8)}`;
  const seededDrop = await fetch(fixture.base + "/api/deals", {
    method: "POST",
    headers: {
      Origin: fixture.base,
      Cookie: fixture.cookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      businessId: fixture.businessId,
      title: dropTitle,
      priceKes: 100,
      endsAt: new Date(Date.now() + 3600000).toISOString(),
      dropZone: "talai",
      dropAt: new Date(Date.now() + 7200000).toISOString(),
      deliveryFeeKes: 0,
    }),
  });
  assert.equal(
    seededDrop.status,
    201,
    "Create a fresh drop fixture for this browser run",
  );
  const browser = await chromium.launch({ headless: true });
  const errors: string[] = [];
  mkdirSync("/tmp/mm-habit-browser", { recursive: true });
  const guest = await browser.newContext({
    baseURL: fixture.base,
    viewport: { width: 390, height: 844 },
  });
  const page = await guest.newPage();
  page.setDefaultTimeout(90000);
  page.setDefaultNavigationTimeout(120000);
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nearby prices & sellers" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Broadcast a request" }),
    ).toBeEnabled();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Home overflows at ${width}px`,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("textbox", { name: "Your instant request" })
      .fill("Need a comrade meal under KES 100");
    await page.getByRole("button", { name: "Broadcast a request" }).click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByLabel("What do you need?")).toHaveValue(
      "Need a comrade meal under KES 100",
    );
    await modal.getByLabel("Category").selectOption("food-cafes");
    await modal.getByLabel("Campus zone").selectOption("stage");
    await modal
      .getByRole("button", { name: "Post request", exact: true })
      .click();
    await expect(
      modal.getByRole("heading", { name: "Your request is on the board" }),
    ).toBeVisible();
    await expect(
      modal.getByRole("link", { name: /^WhatsApp Habit Kitchen/ }).first(),
    ).toBeVisible();
    await page.screenshot({
      path: "/tmp/mm-habit-browser/request-390.png",
      fullPage: true,
    });
    await modal.getByRole("button", { name: "Done", exact: true }).click();
    console.log(
      "PASS mobile request broadcasts without account and offers immediate WhatsApp escalation",
    );
    await page.goto("/deals");
    await page.getByLabel("Your delivery zone").selectOption("talai");
    await page
      .getByRole("button", { name: "Under KES 100", exact: true })
      .click();
    const drop = page
      .locator("article")
      .filter({ has: page.locator(`a[href="/b/${fixture.slug}"]`) })
      .filter({ hasText: dropTitle });
    await expect(
      drop.getByRole("heading", {
        name: dropTitle,
        exact: true,
      }),
    ).toBeVisible();
    await expect(drop.getByText(/Free zone delivery/)).toBeVisible();
    await page.screenshot({
      path: "/tmp/mm-habit-browser/deals-390.png",
      fullPage: true,
    });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Deals fit mobile",
    );
    await guest.route("https://wa.me/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<h1>WhatsApp order handoff</h1>",
      }),
    );
    await drop.getByRole("button", { name: "Join drop on WhatsApp" }).click();
    await expect(
      page.getByRole("heading", { name: "WhatsApp order handoff" }),
    ).toBeVisible();
    console.log(
      "PASS timed deal budget filter and anonymous delivery-drop WhatsApp handoff",
    );
    const owner = await browser.newContext({
      baseURL: fixture.base,
      viewport: { width: 390, height: 844 },
    });
    await owner.addCookies([
      {
        name: "mm_session",
        value: fixture.cookie.split("=")[1],
        url: fixture.base,
      },
    ]);
    const merchant = await owner.newPage();
    merchant.setDefaultTimeout(90000);
    merchant.setDefaultNavigationTimeout(120000);
    merchant.on("pageerror", (error) => errors.push(error.message));
    await merchant.goto(`/dashboard/${fixture.slug}`);
    const tools = merchant.getByRole("region", { name: "Daily campus tools" });
    await expect(
      tools.getByRole("heading", {
        name: "Publish a flash deal or delivery drop",
      }),
    ).toBeVisible();
    await tools.getByLabel("Deal title").fill("Browser lunch offer");
    await tools.getByLabel("Price (KES)", { exact: true }).fill("90");
    const end = new Date(Date.now() + 3 * 3600000 + 3600000)
      .toISOString()
      .slice(0, 16);
    await tools.getByLabel("Order cutoff").fill(end);
    await tools.getByRole("button", { name: "Publish deal free" }).click();
    await expect(tools.getByRole("status")).toContainText(
      "Your flash deal is live",
    );
    await merchant.screenshot({
      path: "/tmp/mm-habit-browser/merchant-390.png",
      fullPage: true,
    });
    assert.ok(
      await merchant.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Merchant daily tools fit mobile",
    );
    const signboard = await owner.request.get(
      `/api/businesses/${fixture.slug}/signboard`,
    );
    assert.equal(signboard.status(), 200);
    assert.match(await signboard.text(), /Scan for prices/);
    console.log(
      "PASS merchant creates a free deal and downloads a branded QR signboard",
    );
    const business = await prisma.business.findUniqueOrThrow({
      where: { id: fixture.businessId },
    });
    const action = await createMerchantAction(prisma, business, "OPEN");
    await page.goto(action!);
    await page.getByRole("button", { name: "Confirm I am open now" }).click();
    await expect(page.getByRole("status")).toContainText(
      "confirmed for four hours",
    );
    await page.reload();
    await expect(
      page.getByRole("heading", { name: "This action link is unavailable" }),
    ).toBeVisible();
    console.log(
      "PASS unauthenticated action confirms open status once and rejects replay",
    );
    let code = "";
    const phone = `+25471${Math.floor(1000000 + Math.random() * 8999999)}`;
    const challengeId = await requestPhoneCode(
      phone,
      "Browser student",
      async (_phone, message) => {
        code = message.match(/\d{6}/)![0];
      },
    );
    await guest.route("**/api/auth/phone/request", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ challengeId, expiresIn: 300 }),
      }),
    );
    await page.goto("/login");
    await page.getByLabel("Your phone", { exact: true }).fill(phone);
    await page.getByRole("button", { name: "Send SMS code" }).click();
    await page.getByLabel("SMS code", { exact: true }).fill(code);
    await page.getByRole("button", { name: "Verify & sign in" }).click();
    await page.waitForURL("**/dashboard");
    console.log(
      "PASS SMS-code UI establishes a real account session through the verify endpoint",
    );
    await page.goto("/market");
    await page
      .getByRole("button", { name: "Post a hustle or declutter item" })
      .click();
    await expect(
      page.getByRole("heading", { name: "One item or hostel service" }),
    ).toBeVisible();
    await page
      .getByLabel("Item or service name")
      .fill(`Browser declutter ${randomUUID().slice(0, 8)}`);
    await page.getByLabel("Price (KES)", { exact: true }).fill("500");
    await page
      .getByLabel("Condition / service details")
      .fill("A used hostel table ready for inspection at the gate.");
    await page
      .getByLabel("Safe meeting point / hostel landmark")
      .fill("Hostel gate");
    const image = await sharp({
      create: { width: 200, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    await page
      .getByLabel("Private student ID (required for review)")
      .setInputFiles({ name: "id.png", mimeType: "image/png", buffer: image });
    await expect(
      page.getByText(
        "Student ID uploaded privately. It will never appear on your public listing.",
      ),
    ).toBeVisible();
    await page.getByRole("checkbox", { name: /I agree to publish/ }).check();
    await page
      .getByRole("button", { name: "Submit free student listing" })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Your student listing is saved for review",
      }),
    ).toBeVisible();
    await page.screenshot({
      path: "/tmp/mm-habit-browser/market-390.png",
      fullPage: true,
    });
    console.log(
      "PASS one-item student posting with private ID awaits actual identity review",
    );
    assert.deepEqual(errors, [], "No uncaught browser errors");
    console.log("7 desktop/mobile habit browser journeys passed");
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
