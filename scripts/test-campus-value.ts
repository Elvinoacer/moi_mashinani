import { test } from "node:test";
import assert from "node:assert/strict";
import { comparisonItems, comparisonPrice } from "../src/lib/catalog-plan";
import { orderMessage, whatsappUrl } from "../src/lib/whatsapp";
test("campus comparisons exclude unrelated prices and sold-out items", () => {
  const business = {
    services: [
      { id: "1", name: "Printing", priceFrom: 5 },
      { id: "2", name: "Charger", priceFrom: 300 },
      { id: "3", name: "Charger sale", priceFrom: 50, inStock: false },
      { id: "4", name: "Charger repair" },
    ],
  };
  assert.equal(comparisonPrice(business, "charger"), 300);
  assert.equal(comparisonPrice(business), 5);
  assert.equal(comparisonPrice(business, "gas"), Infinity);
  assert.deepEqual(
    comparisonItems(business, "charger").map((i) => i.id),
    ["2", "4"],
  );
});
test("WhatsApp handoff includes item, price, source, time and zone without an invalid target", () => {
  const message = orderMessage({
    businessName: "Kevin Phones",
    serviceName: "HP charger",
    price: 1200,
    day: "2026-10-14",
    time: "2 PM",
    zone: "Stage",
    name: "Comrade",
    note: "Deliver to gate",
  });
  assert.ok(
    message.includes("Moi Mashinani") &&
      message.includes("KES 1,200") &&
      message.includes("Stage") &&
      message.includes("2 PM"),
  );
  assert.equal(
    new URL(whatsappUrl("0712345678", message)).pathname,
    "/254712345678",
  );
  assert.equal(
    whatsappUrl("0112345678", message).startsWith("https://wa.me/254112345678"),
    true,
  );
  assert.equal(whatsappUrl("123", message), "");
});
