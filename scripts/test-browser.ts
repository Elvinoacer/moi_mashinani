import assert from "node:assert/strict";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  chromium,
  expect as baseExpect,
  type Page,
  type BrowserContext,
} from "@playwright/test";

const expect = baseExpect.configure({ timeout: 60000 });
const context = JSON.parse(
  readFileSync("/tmp/moimashinani-test-context.json", "utf8"),
);
const base = context.baseUrl;
const ownerEmail = `browser-${randomUUID().slice(0, 8)}@test.invalid`;
const ownerPassword = "browser owner password 2026";
const shopName = `Browser Visit Shop ${randomUUID().slice(0, 5)}`;
const addressId = randomUUID().slice(0, 8);
const testHeaders = {
  "X-Forwarded-For": `2001:db8::${addressId.slice(0, 4)}:${addressId.slice(4)}`,
};
const errors: string[] = [];
async function configureTestOrigin(browserContext: BrowserContext) {
  if (!context.originUrl || context.originUrl === base) return;
  await browserContext.route(`${base}/api/**`, async (route) => {
    const response = await route.fetch({
      headers: { ...route.request().headers(), origin: context.originUrl },
    });
    await route.fulfill({ response });
  });
}
function track(page: Page) {
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(90000);
  page.on("pageerror", (error) => errors.push(error.message));
}
function tokenFromMail() {
  const mail = JSON.parse(readFileSync(context.mailPath, "utf8")) as Array<{
    to: string[];
    message: string;
  }>;
  const latest = mail
    .filter(
      (message) =>
        message.to.includes(ownerEmail) &&
        message.message.includes("/verify?token="),
    )
    .at(-1)!;
  const text = latest.message.replace(/=\r?\n/g, "");
  return text.match(/\/verify\?token=([a-f0-9]{64})/)![1];
}
async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  });
  mkdirSync("/tmp/moimashinani-browser", { recursive: true });
  try {
    const adminContext = await browser.newContext({
      baseURL: base,
      extraHTTPHeaders: testHeaders,
      viewport: { width: 1440, height: 1000 },
    });
    const admin = await adminContext.newPage();
    await configureTestOrigin(adminContext);
    track(admin);
    await admin.goto("/login?next=/admin/enroll");
    await admin.getByLabel("Owner phone or email").fill(context.admin.email);
    await admin
      .getByLabel("Password", { exact: true })
      .fill(context.admin.password);
    await admin.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(
      admin.getByRole("heading", { name: "Enroll a business", exact: true }),
    ).toBeVisible({ timeout: 90000 });
    await admin.getByLabel("Owner name", { exact: true }).fill("Browser Owner");
    await admin.getByLabel("Recovery email", { exact: true }).fill(ownerEmail);
    await admin.getByLabel("Business name", { exact: true }).fill(shopName);
    await admin
      .getByLabel("Business WhatsApp", { exact: true })
      .fill("0712345678");
    await admin
      .getByRole("combobox", { name: "Category", exact: true })
      .selectOption("phone-laptop-repair");
    for (let i = 1; i <= 3; i++) {
      await admin.getByRole("button", { name: "Add custom item" }).click();
      await admin.getByLabel(`Product ${i} name`).fill("Core item " + i);
      await admin.getByLabel(`Product ${i} price`).fill(String(i * 100));
    }
    await admin
      .getByRole("button", { name: "Preview listing", exact: true })
      .click();
    await admin
      .getByLabel("Nearby landmark", { exact: true })
      .fill("Across the campus gate");
    await admin
      .getByRole("checkbox", { name: /Request a free ambassador visit/ })
      .check();
    for (const width of [320, 360, 390, 430, 768]) {
      await admin.setViewportSize({ width, height: 844 });
      assert.ok(
        await admin.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        `Enrollment overflows at ${width}px`,
      );
    }
    await admin
      .getByLabel(
        "I visited this location and checked the shop or student identity.",
      )
      .check();
    await admin
      .getByLabel("The owner agreed to publish this listing and its prices.")
      .check();
    const enrollmentResponse = admin.waitForResponse(
      (response) =>
        response.url().endsWith("/api/admin/enroll") &&
        response.request().method() === "POST",
    );
    await admin
      .getByRole("button", {
        name: "Save listing & request verification",
        exact: true,
      })
      .click();
    const enrollment = await (await enrollmentResponse).json();
    assert.ok(enrollment.invitation.sent);
    await expect(
      admin.getByRole("heading", { name: `${shopName}: listing saved` }),
    ).toBeVisible();
    const business = enrollment.business;
    await admin.screenshot({
      path: "/tmp/moimashinani-browser/enrollment-success.png",
      fullPage: true,
    });
    console.log(
      "PASS browser admin login, two-step field enrollment and emailed invitation",
    );
    const ownerContext = await browser.newContext({
      baseURL: base,
      extraHTTPHeaders: testHeaders,
      viewport: { width: 1280, height: 900 },
    });
    const owner = await ownerContext.newPage();
    await configureTestOrigin(ownerContext);
    track(owner);
    await owner.goto(`/verify?token=${tokenFromMail()}`);
    await owner.getByLabel("Password", { exact: true }).fill(ownerPassword);
    await owner
      .getByLabel("Confirm password", { exact: true })
      .fill(ownerPassword);
    await owner
      .getByRole("button", { name: "Verify & open my account", exact: true })
      .click();
    await owner.waitForURL(`**/dashboard/${business.slug}`, { timeout: 90000 });
    await expect(
      owner.getByRole("heading", { name: shopName, exact: true }),
    ).toBeVisible({ timeout: 45000 });
    await owner.getByRole("button", { name: "details", exact: true }).click();
    await owner
      .getByLabel("Tagline", { exact: true })
      .fill("Browser-tested owner update");
    await owner
      .getByRole("button", { name: "Save business information", exact: true })
      .click();
    await expect(
      owner.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    const profile = await (
      await ownerContext.request.get(`/api/businesses/${business.slug}`)
    ).json();
    assert.equal(profile.tagline, "Browser-tested owner update");
    console.log(
      "PASS browser owner email verification, automatic login and persistent profile editing",
    );
    await owner.getByRole("button", { name: "hours", exact: true }).click();
    await owner
      .getByLabel("Monday opening time", { exact: true })
      .fill("09:00");
    await owner
      .getByRole("button", { name: "Save opening hours", exact: true })
      .click();
    await expect(
      owner.getByText("Changes saved.", { exact: true }),
    ).toBeVisible();
    await owner.screenshot({
      path: "/tmp/moimashinani-browser/owner-hours.png",
      fullPage: true,
    });
    await owner.getByRole("button", { name: "Prices", exact: true }).click();
    await owner.getByLabel("Name", { exact: true }).fill("Charging cable");
    await owner
      .getByLabel("Starting price (KSh, optional)", { exact: true })
      .fill("120");
    await owner.getByRole("button", { name: "Add item", exact: true }).click();
    await expect(
      owner.getByText("Charging cable", { exact: true }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Remove Charging cable", exact: true })
      .click();
    await expect(
      owner.getByText("Charging cable", { exact: true }),
    ).not.toBeVisible();
    await owner
      .getByRole("button", { name: "My shop & prices", exact: true })
      .click();
    await owner
      .getByRole("button", { name: "Broadcast for 4 hours", exact: true })
      .click();
    await expect(
      owner.getByRole("button", { name: "End live update", exact: true }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Mark temporarily closed", exact: true })
      .click();
    await expect(
      owner.getByRole("button", { name: "Reopen shop", exact: true }),
    ).toBeVisible();
    await owner
      .getByRole("button", { name: "Reopen shop", exact: true })
      .click();
    await expect(
      owner.getByRole("button", {
        name: "Mark temporarily closed",
        exact: true,
      }),
    ).toBeVisible();
    console.log(
      "PASS browser owner hours, product CRUD, availability and temporary closure controls",
    );

    const customerContext = await browser.newContext({
      baseURL: base,
      extraHTTPHeaders: testHeaders,
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await customerContext.route("https://wa.me/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<p>WhatsApp handoff test</p>",
      }),
    );
    await configureTestOrigin(customerContext);
    const customer = await customerContext.newPage();
    track(customer);
    await customer.goto(`/b/${business.slug}`);
    await expect(
      customer.getByRole("heading", { name: shopName, exact: true }),
    ).toBeVisible({ timeout: 90000 });
    await customer
      .getByRole("button", {
        name: "Order / inquire via WhatsApp",
        exact: true,
      })
      .click();
    await customer
      .getByLabel("Your name", { exact: true })
      .fill("Browser Student");
    await customer
      .getByLabel("Your phone / WhatsApp", { exact: true })
      .fill("0712345678");
    const bookingSaved = customer.waitForResponse(
      (r) =>
        r.url().endsWith("/api/bookings") &&
        r.request().method() === "POST" &&
        r.status() === 201,
    );
    await customer
      .getByRole("button", {
        name: "Send order / book via WhatsApp",
        exact: true,
      })
      .click();
    await bookingSaved;
    await expect(
      customer.getByRole("heading", {
        name: "Your WhatsApp inquiry is ready",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      customer.getByRole("link", { name: "Continue on WhatsApp", exact: true }),
    ).toHaveAttribute("href", /wa\.me\/254712345678/);
    await customer.screenshot({
      path: "/tmp/moimashinani-browser/customer-booking.png",
      fullPage: true,
    });
    console.log(
      "PASS mobile customer profile, booking submission and WhatsApp handoff",
    );
    await owner
      .getByRole("button", { name: "Customer leads", exact: true })
      .click();
    await owner
      .getByRole("button", { name: "Refresh", exact: true })
      .last()
      .click();
    await expect(
      owner.getByText("Browser Student", { exact: true }),
    ).toBeVisible();
    await owner
      .getByLabel("Status for Browser Student's booking", { exact: true })
      .selectOption("CONFIRMED");
    await expect(
      owner.getByText("Booking status updated.", { exact: true }),
    ).toBeVisible();
    await owner.screenshot({
      path: "/tmp/moimashinani-browser/owner-bookings.png",
      fullPage: true,
    });
    console.log(
      "PASS browser customer request reaches owner inbox and can be confirmed",
    );
    await owner.goto(`/promote/${business.slug}`);
    await expect(
      owner.getByRole("heading", { name: shopName, exact: true }),
    ).toBeVisible();
    await owner.getByRole("radio", { name: /7-day category top spot/ }).check();
    await owner
      .getByRole("button", {
        name: "Continue to secure M-Pesa checkout",
        exact: true,
      })
      .click();
    await expect(
      owner
        .getByRole("alert")
        .filter({ hasText: "Payments are not configured." }),
    ).toHaveText(
      "Payments are not configured. Please contact the administrator.",
    );
    assert.ok(
      owner.url().includes(`/dashboard/${business.slug}`),
      "Configuration failure keeps owner on checkout",
    );
    await owner.screenshot({
      path: "/tmp/moimashinani-browser/checkout-configuration.png",
      fullPage: true,
    });
    console.log(
      "PASS browser promotion pricing, checkout request and recoverable missing-provider configuration",
    );
    await customer.getByRole("button", { name: "Done", exact: true }).click();
    await customer.goto(`/dashboard/${business.slug}`);
    await expect(
      customer.getByRole("heading", {
        name: "Sign in to your account",
        exact: true,
      }),
    ).toBeVisible();
    await owner.goto("/admin");
    await expect(
      owner.getByRole("heading", {
        name: "Account access required",
        exact: true,
      }),
    ).toBeVisible();
    console.log("PASS browser anonymous/owner role access gates");
    await admin.goto("/admin");
    await expect(
      admin.getByRole("heading", {
        name: "Business enrollment & admin console",
        exact: true,
      }),
    ).toBeVisible({ timeout: 60000 });
    const ownerPrivate = await (
      await adminContext.request.get("/api/auth/me")
    ).json();
    assert.ok(
      ownerPrivate.businesses.some(
        (b: { id: string; emailVerifiedAt?: string }) =>
          b.id === business.id && b.emailVerifiedAt,
      ),
    );
    await admin.getByRole("button", { name: /All listings/ }).click();
    await admin.getByLabel("Find a business", { exact: true }).fill(shopName);
    await admin
      .getByRole("button", { name: "Suspend listing", exact: true })
      .click();
    await expect(
      admin.getByRole("button", { name: "Restore listing", exact: true }),
    ).toBeVisible();
    await admin
      .getByRole("button", { name: "Restore listing", exact: true })
      .click();
    await expect(
      admin.getByRole("button", { name: "Suspend listing", exact: true }),
    ).toBeVisible();
    console.log("PASS browser admin listing suspension and restoration");
    await admin.screenshot({
      path: "/tmp/moimashinani-browser/admin-console.png",
      fullPage: true,
    });
    assert.deepEqual(
      errors,
      [],
      `Browser runtime errors: ${errors.join("; ")}`,
    );
    writeFileSync(
      "/tmp/moimashinani-browser/results.json",
      JSON.stringify(
        { passed: 10, shopName, slug: business.slug, errors },
        null,
        2,
      ),
    );
    console.log(
      "All 10 browser journeys passed with no uncaught browser errors.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
