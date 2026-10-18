import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import type { Business } from "../src/lib/types";

// Routes are exercised with an in-memory Store stub. No database or provider is
// contacted, even when the developer has production connection settings saved.
process.env.DATABASE_URL ||= "postgresql://test:test@127.0.0.1:1/discovery_test";

function fixture(index: number): Business {
  return {
    id: `listing-${index}`, name: `Shop ${index}`, slug: `shop-${index}`,
    tagline: "Campus printing", description: "Print your coursework",
    primaryCategory: "printing-cyber", extraCategories: [], tags: [],
    serviceModes: ["at_shop"], phone: "+254712345678", whatsapp: "+254712345678",
    campus: "Moi University", zone: "kesses-centre", servesZones: [], landmark: "Gate",
    hours: {}, services: [{ id: "print", name: "Printing", priceFrom: 100 - index }],
    priceLevel: 1, photos: [], coverPhoto: "", activeTier: index < 20 ? "FEATURED" : index < 40 ? "RECOMMENDED" : "NONE",
    tierEndsAt: "2099-01-01T00:00:00Z", status: "ACTIVE", verificationLevel: "L1",
    isClaimed: true, profileStrength: 70,
    ownerEmail: "private@example.invalid", claimCode: "private-claim",
    metrics: { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0,
      impressions: 0, lastWeekViews: 0, lastWeekCalls: 0, lastWeekWhatsapp: 0 },
    createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z",
  };
}

test("discovery API rotates privately, returns the complete pool, and never bills a fetch as exposure", async (t) => {
  const { Store } = await import("../src/lib/store");
  const { GET } = await import("../app/api/businesses/route");
  t.mock.method(Store, "getBusinesses", async () => Array.from({ length: 60 }, (_, index) => fixture(index)));
  const record = t.mock.method(Store, "recordImpressions", async () => {});

  const response = await GET(new NextRequest("https://discovery.test/api/businesses"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const cookie = response.cookies.get("mashinani_discovery");
  assert.ok(cookie?.value);
  assert.ok(response.headers.get("set-cookie")?.includes("HttpOnly"));
  const body = await response.json();
  assert.equal(body.total, 60);
  assert.equal(body.results.length, 60);
  assert.equal(body.results[0].ownerEmail, undefined);
  assert.equal(body.results[0].claimCode, undefined);
  assert.equal(body.results.slice(0, 10).filter((item: { effectiveTier: string }) => item.effectiveTier === "NONE").length, 4);
  assert.equal(record.mock.callCount(), 0);

  const repeat = await GET(new NextRequest("https://discovery.test/api/businesses?sort=price", {
    headers: { Cookie: `mashinani_discovery=${cookie!.value}` },
  }));
  assert.equal(repeat.headers.get("set-cookie"), null);
  const sorted = await repeat.json();
  assert.equal(sorted.results.slice(0, 10).filter((item: { effectiveTier: string }) => item.effectiveTier === "NONE").length, 4);
  const organic = sorted.results.filter((item: { effectiveTier: string }) => item.effectiveTier === "NONE");
  assert.equal(organic[0].id, "listing-59");
  assert.equal(record.mock.callCount(), 0);
});
