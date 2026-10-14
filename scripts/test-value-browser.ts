import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { chromium, expect as baseExpect, type Page } from "@playwright/test";
const expect = baseExpect.configure({ timeout: 60000 });
const fixture = JSON.parse(readFileSync("/tmp/mm-audit-browser.json", "utf8"));
const base = fixture.base;
const errors: string[] = [];
function track(page: Page) {
  page.setDefaultTimeout(60000);
  page.setDefaultNavigationTimeout(120000);
  page.on("pageerror", (e) => errors.push(e.message));
}
async function main() {
  const browser = await chromium.launch({ headless: true });
  mkdirSync("/tmp/mm-audit-browser", { recursive: true });
  try {
    const student = await browser.newContext({
      baseURL: base,
      viewport: { width: 360, height: 800 },
    });
    await student.route("https://wa.me/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<h1>WhatsApp handoff test</h1>",
      }),
    );
    const page = await student.newPage();
    track(page);
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Nearby prices & sellers" }),
    ).toBeVisible();
    await page
      .getByRole("combobox", { name: "Your campus zone" })
      .selectOption("stage");
    await page.waitForFunction(
      () => localStorage.getItem("mm-campus-zone") === "stage",
    );
    await page.reload();
    await expect(
      page.getByRole("combobox", { name: "Your campus zone" }),
    ).toHaveValue("stage");
    console.log("PASS campus zone survives a reload");
    for (const width of [320, 360, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Home overflows at ${width}px`,
      );
    }
    await page.setViewportSize({ width: 360, height: 800 });
    await page.screenshot({
      path: "/tmp/mm-audit-browser/home-360.png",
      fullPage: true,
    });
    await page.goto("/requests");
    await page
      .getByRole("button", { name: "Post a request", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    assert.ok(
      box && box.height <= 800 * 0.85 + 2 && box.y > 0,
      "Request modal must be a bottom sheet",
    );
    await page
      .getByLabel("What do you need?")
      .fill("Need a phone charger under KES 300 tomorrow");
    await page
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption("phone-laptop-repair");
    await page.getByLabel("Your WhatsApp (optional)").fill("0712345678");
    await page.getByRole("checkbox", { name: /Allow active/ }).check();
    await page
      .getByRole("button", { name: "Post request", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Your request is on the board" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Done", exact: true }).click();
    await expect(
      page.getByText("Need a phone charger under KES 300 tomorrow", {
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Found it · close request" })
      .click();
    await expect(
      page.getByText("Need a phone charger under KES 300 tomorrow", {
        exact: true,
      }),
    ).toHaveCount(0);
    console.log("PASS anonymous mobile request posting, consent and closure");
    await page.goto(`/b/${fixture.slug}`);
    await expect(
      page.getByRole("navigation", { name: "Contact seller" }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Mobile quick navigation" }),
    ).toHaveCount(0);
    await expect(
      page.getByRole("heading", { name: "Comrade trust shield" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "WhatsApp", exact: true })
      .last()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByLabel("Your name", { exact: true }).fill("Test Comrade");
    await page.getByLabel("Your phone / WhatsApp").fill("0712345678");
    await page.getByLabel("Delivery / campus zone").selectOption("stage");
    await page
      .getByLabel("Extra note (optional)")
      .fill("Please bring to hostel gate");
    let logFinished = false;
    await page.route("**/api/bookings", async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.continue();
        logFinished = true;
      } else await route.continue();
    });
    const popupPromise = page.waitForEvent("popup");
    await page
      .getByRole("button", { name: "Send order / book via WhatsApp" })
      .click();
    const popup = await popupPromise;
    await popup.waitForURL("https://wa.me/**");
    assert.ok(
      !logFinished,
      "WhatsApp must open before the analytics request completes",
    );
    const text = decodeURIComponent(popup.url());
    assert.ok(
      text.includes("Moi Mashinani") &&
        text.includes("Stage") &&
        text.includes("Test Comrade"),
      "WhatsApp message must include source, zone and name",
    );
    await expect(
      page.getByRole("heading", { name: "Your WhatsApp inquiry is ready" }),
    ).toBeVisible();
    await page.screenshot({
      path: "/tmp/mm-audit-browser/whatsapp-sheet-360.png",
    });
    await popup.close();
    console.log(
      "PASS immediate WhatsApp handoff while the booking log is delayed",
    );
    await page.goto("/onboard");
    await page.getByRole("button", { name: "Hostel / mobile hustle" }).click();
    await page
      .getByLabel("Business name", { exact: true })
      .fill("Audit hostel hustle");
    await page
      .getByLabel("Business WhatsApp", { exact: true })
      .fill("0712345678");
    await page
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption("phone-laptop-repair");
    await page.getByLabel("Owner name", { exact: true }).fill("Test Owner");
    await page
      .getByLabel("Recovery email", { exact: true })
      .fill("preview@test.invalid");
    for (let i = 1; i <= 3; i++) {
      await page.getByRole("button", { name: "Add custom item" }).click();
      await page
        .getByLabel(`Product ${i} name`, { exact: true })
        .fill("Core item " + i);
      await page
        .getByLabel(`Product ${i} price`, { exact: true })
        .fill(String(i * 100));
    }
    await page
      .getByRole("button", { name: "Preview listing", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Instant listing preview" }),
    ).toBeVisible();
    await expect(
      page.getByLabel(
        "Student ID (private; only you and reviewers can see it)",
      ),
    ).toBeVisible();
    await page
      .getByRole("checkbox", { name: /Request a free ambassador visit/ })
      .check();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Onboarding must fit a 360px viewport",
    );
    await page.screenshot({
      path: "/tmp/mm-audit-browser/onboarding-360.png",
      fullPage: true,
    });
    console.log(
      "PASS two-step hostel onboarding, three prices and private-ID/free-visit choice",
    );
    const ownerContext = await browser.newContext({
      baseURL: base,
      viewport: { width: 390, height: 844 },
    });
    await ownerContext.addCookies([
      {
        name: "mm_session",
        value: fixture.cookie.split("=")[1],
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const owner = await ownerContext.newPage();
    track(owner);
    await owner.goto(`/dashboard/${fixture.slug}`);
    await expect(
      owner.getByRole("button", { name: "My shop & prices", exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByRole("heading", { name: "Live campus status" }),
    ).toBeVisible();
    await owner
      .getByLabel("What’s happening now? (40 characters)")
      .fill("Charger delivery to hostels");
    await owner.getByRole("button", { name: "Broadcast for 4 hours" }).click();
    await expect(
      owner.getByRole("button", { name: "End live update" }),
    ).toBeVisible();
    const broadcast = await (
      await ownerContext.request.get(`/api/businesses/${fixture.slug}`)
    ).json();
    assert.equal(broadcast.liveStatus, "Charger delivery to hostels");
    await owner
      .getByRole("button", { name: "Customer leads", exact: true })
      .click();
    await expect(
      owner.getByRole("heading", { name: "Recent customer activity" }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Boost & upgrade", exact: true })
      .click();
    await expect(
      owner.getByText("24-hour deal blast", { exact: true }),
    ).toBeVisible();
    await expect(
      owner.getByText("KES 30", { exact: true }).first(),
    ).toBeVisible();
    await expect(
      owner.getByText("KES 250", { exact: true }).first(),
    ).toBeVisible();
    assert.ok(
      await owner.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Merchant dashboard must fit a 390px viewport",
    );
    await owner.screenshot({
      path: "/tmp/mm-audit-browser/dashboard-390.png",
      fullPage: true,
    });
    console.log(
      "PASS unified dashboard tabs, live status and micro-package prices",
    );
    // Polling and hosted checkout are mocked so this browser check cannot send an STK request.
    const mock = {
      id: "audit-poll",
      businessId: fixture.businessId,
      planId: "PRO",
      phone: "254712345678",
      amountKes: 250,
      state: "PENDING",
      createdAt: new Date().toISOString(),
    };
    let polls = 0;
    await owner.route("**/api/payments?businessId=*", (route) =>
      route.fulfill({ json: [mock] }),
    );
    await owner.route("**/api/payments/audit-poll/verify", (route) => {
      polls++;
      return route.fulfill({
        json:
          polls >= 2
            ? { ...mock, state: "COMPLETE", receiptNumber: "TEST-RECEIPT" }
            : mock,
      });
    });
    await owner.goto(`/dashboard/${fixture.slug}?tab=billing`);
    await expect(
      owner.getByRole("heading", {
        name: "Payment confirmed — package activated",
      }),
    ).toBeVisible();
    assert.ok(
      polls >= 2,
      "Pending payment must poll provider verification automatically",
    );
    console.log("PASS automatic payment polling reaches confirmed state");
    const fieldContext = await browser.newContext({
      baseURL: base,
      viewport: { width: 360, height: 800 },
    });
    await fieldContext.addCookies([
      {
        name: "mm_session",
        value: fixture.fieldCookie.split("=")[1],
        domain: "127.0.0.1",
        path: "/",
      },
    ]);
    const field = await fieldContext.newPage();
    track(field);
    await field.goto("/ambassador");
    await expect(
      field.getByRole("heading", { name: "Campus field checklist" }),
    ).toBeVisible();
    await expect(
      field.getByRole("progressbar", { name: "Today's zone progress" }),
    ).toBeVisible();
    const action = await field
      .getByRole("button", { name: "Quick enroll shop / hustle" })
      .boundingBox();
    assert.ok(
      action && action.height >= 52,
      "Outdoor field action must have a 52px touch target",
    );
    await field.screenshot({
      path: "/tmp/mm-audit-browser/field-360.png",
      fullPage: true,
    });
    console.log(
      "PASS appointed ambassador field view and outdoor touch targets",
    );
    // Earlier retry fixtures may add deals. Make the sparse-deals case explicit.
    const harness = JSON.parse(
      readFileSync("/tmp/moimashinani-test-context.json", "utf8"),
    );
    const adminContext = await browser.newContext({ baseURL: base });
    const signedIn = await adminContext.request.post("/api/auth/login", {
      data: harness.admin,
    });
    assert.equal(signedIn.status(), 200);
    const listingData = await (
      await adminContext.request.get("/api/businesses?status=all")
    ).json();
    const auditDeals = listingData.results.filter(
      (b: { name: string; status:string; studentDiscount?: string }) =>
        b.status === "ACTIVE" && b.studentDiscount,
    );
    auditDeals.splice(0, 5);
    for (const b of auditDeals)
      await adminContext.request.patch(`/api/businesses/${b.slug}`, {
        data: { studentDiscount: "" },
      });
    await page.goto("/deals");
    await expect(
      page.getByRole("heading", { name: "Budget comrade picks under KES 300" }),
    ).toBeVisible();
    await page.screenshot({
      path: "/tmp/mm-audit-browser/deals-360.png",
      fullPage: true,
    });
    for (const b of auditDeals)
      await adminContext.request.patch(`/api/businesses/${b.slug}`, {
        data: { studentDiscount: b.studentDiscount },
      });
    await adminContext.close();
    await page.goto("/c/tutors-academics");
    await expect(
      page.getByRole("button", { name: "Post a request", exact: true }),
    ).toBeVisible();
    console.log("PASS budget deals backfill and category request recovery");
    assert.deepEqual(
      errors,
      [],
      "Browser must have no uncaught runtime errors",
    );
    writeFileSync(
      "/tmp/mm-audit-browser/results.json",
      JSON.stringify(
        {
          passed: 10,
          consoleErrors: errors,
          screenshots: "/tmp/mm-audit-browser",
        },
        null,
        2,
      ),
    );
    console.log("10 browser journeys passed at mobile and desktop widths.");
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
