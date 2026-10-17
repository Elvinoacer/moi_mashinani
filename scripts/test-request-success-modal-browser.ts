import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const baseURL = process.env.TEST_BASE_URL || "http://127.0.0.1:3000";

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [320, 390, 768, 1366]) {
      const context = await browser.newContext({
        baseURL,
        viewport: { width, height: 800 },
      });
      const page = await context.newPage();

      // Exercise the real modal UI without creating requests in a database.
      await page.route("**/api/demand", async (route) => {
        if (route.request().method() === "POST") {
          await route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify({
              id: `layout-request-${width}`,
              manageToken: "test-receipt-token",
              handoffs: [],
            }),
          });
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: "[]",
        });
      });

      await page.goto("/requests");
      await page
        .getByRole("button", { name: "Post a request", exact: true })
        .first()
        .click();
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await dialog
        .getByLabel(/Describe what you need/i)
        .fill("Need a reliable laptop charger under KES 1,000");
      await dialog
        .getByRole("button", { name: "Publish request" })
        .click();

      await expect(
        dialog.getByRole("heading", { name: "Your request is live" }),
      ).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Turn on reply alerts" }),
      ).toBeVisible();

      const dimensions = await dialog.evaluate((element) => {
        const prompt = element.querySelector<HTMLElement>(
          'aside[aria-label="Live Request Alert"]',
        );
        const headline = prompt?.querySelector<HTMLElement>("h3");
        const button = prompt?.querySelector<HTMLButtonElement>("button");
        if (!prompt || !headline || !button)
          throw new Error("Notification prompt is missing");
        return {
          dialogScrollWidth: element.scrollWidth,
          dialogClientWidth: element.clientWidth,
          prompt: prompt.getBoundingClientRect().toJSON(),
          headline: headline.getBoundingClientRect().toJSON(),
          button: button.getBoundingClientRect().toJSON(),
        };
      });
      assert.ok(
        dimensions.dialogScrollWidth <= dimensions.dialogClientWidth + 1,
        `Dialog must not overflow horizontally at ${width}px`,
      );
      assert.ok(
        dimensions.headline.width >= 135,
        `Alert heading must have readable width at ${width}px`,
      );
      assert.ok(
        dimensions.button.top >= dimensions.headline.bottom,
        `Alert action must not sit beside/crush headline at ${width}px`,
      );
      assert.ok(
        dimensions.button.right <= dimensions.prompt.right + 1 &&
          dimensions.button.left >= dimensions.prompt.left - 1,
        `Alert action must fit inside its card at ${width}px`,
      );

      await dialog.getByRole("button", { name: "Done" }).click();
      await expect(dialog).toHaveCount(0);
      console.log(`PASS request success modal responsive at ${width}px`);
      await context.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
