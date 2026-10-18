import assert from "node:assert/strict";
import { test } from "node:test";
import {
  DEFAULT_RANK_CONFIG,
  getEffectiveTier,
  rankBusinesses,
  RANK_ROTATION_MS,
  sortRankedBusinesses,
} from "../src/lib/rank";
import type { Business, Tier } from "../src/lib/types";

const NOW = new Date("2026-10-18T09:00:00Z");
const END = "2026-11-18T09:00:00Z";

function business(id: string, tier: Tier = "NONE", changes: Partial<Business> = {}): Business {
  return {
    id, name: `Campus shop ${id}`, slug: id, tagline: "", description: "",
    primaryCategory: "printing-cyber", extraCategories: [], tags: [],
    serviceModes: ["at_shop"], phone: "+254712345678", whatsapp: "+254712345678",
    campus: "Moi University", zone: "kesses-centre", servesZones: [], landmark: "Main gate",
    hours: {}, services: [{ id: "printing", name: "Printing", priceFrom: 5 }],
    priceLevel: 1, photos: [], coverPhoto: "", activeTier: tier,
    tierEndsAt: tier === "NONE" ? undefined : END,
    status: "ACTIVE", verificationLevel: "L1", isClaimed: true, profileStrength: 70,
    metrics: { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0,
      impressions: 0, lastWeekViews: 0, lastWeekCalls: 0, lastWeekWhatsapp: 0 },
    createdAt: "2026-09-01T00:00:00Z", updatedAt: "2026-09-01T00:00:00Z",
    ...changes,
  };
}

function crowdedMarket() {
  return [
    ...Array.from({ length: 200 }, (_, i) => business(`featured-${i}`, "FEATURED", {
      profileStrength: i % 2 ? 5 : 100, verificationLevel: i % 2 ? "L0" : "L2",
    })),
    ...Array.from({ length: 200 }, (_, i) => business(`pro-${i}`, "NONE", { proEndsAt: END })),
    ...Array.from({ length: 200 }, (_, i) => business(`recommended-${i}`, "RECOMMENDED", {
      profileStrength: i % 2 ? 5 : 100, verificationLevel: i % 2 ? "L0" : "L2",
    })),
    ...Array.from({ length: 200 }, (_, i) => business(`free-${i}`)),
  ];
}

test("600 paying businesses all reach visible slots, including low-completeness profiles", (t) => {
  const market = crowdedMarket();
  const appearances = new Map<string, number>();
  // 400 Featured/Pro × 2 tickets + 200 Recommended × 1 ticket. Three
  // shared slots advance through the complete ring in at most 334 refreshes.
  const windows = Math.ceil(1000 / 3);
  for (let window = 0; window < windows; window++) {
    const now = new Date(NOW.getTime() + window * RANK_ROTATION_MS);
    const ranked = rankBusinesses(market, "", "all", undefined, undefined, "same-visitor", now);
    assert.equal(ranked.length, market.length);
    assert.equal(new Set(ranked.map((candidate) => candidate.business.id)).size, market.length);
    const visible = ranked.slice(0, 8);
    assert.equal(visible.filter((candidate) => candidate.effectiveTier === "NONE").length, 2);
    assert.ok(visible.slice(0, 3).every((candidate) => candidate.effectiveTier === "FEATURED"));
    for (const candidate of visible.slice(0, 6)) {
      const id = candidate.business.id;
      appearances.set(id, (appearances.get(id) || 0) + 1);
    }
  }
  const paying = market.filter((item) => getEffectiveTier(item, NOW) !== "NONE");
  assert.equal(paying.filter((item) => !appearances.has(item.id)).length, 0);
  const average = (prefix: string) => paying.filter((item) => item.id.startsWith(prefix))
    .reduce((sum, item) => sum + appearances.get(item.id)!, 0) / 200;
  assert.ok(average("featured-") > average("recommended-"));
  assert.ok(average("pro-") > average("recommended-"));
  t.diagnostic(`All 600 paid businesses surfaced across ${windows} rotation windows; average visible placements: Featured ${average("featured-").toFixed(2)}, Pro ${average("pro-").toFixed(2)}, Recommended ${average("recommended-").toFixed(2)}.`);
});

test("recommended-only pools share visible placements equally across a complete cycle", () => {
  const market = Array.from({ length: 300 }, (_, i) => business(`recommended-${i}`, "RECOMMENDED"));
  const appearances = new Map<string, number>();
  for (let window = 0; window < 50; window++) {
    const ranked = rankBusinesses(market, "", "all", undefined, undefined, "visitor", new Date(NOW.getTime() + window * RANK_ROTATION_MS));
    for (const { business: item } of ranked.slice(0, 6))
      appearances.set(item.id, (appearances.get(item.id) || 0) + 1);
  }
  assert.equal(appearances.size, 300);
  assert.ok([...appearances.values()].every((count) => count === 1));
});

test("ordering is stable while browsing, differs across visitors, and survives input reorder", () => {
  const market = crowdedMarket();
  const ids = (time: Date, session = "visitor", listings = market) => rankBusinesses(
    listings, "", "all", undefined, undefined, session, time, NOW,
  ).map(({ business: item }) => item.id);
  assert.deepEqual(ids(NOW), ids(new Date(NOW.getTime() + 30_000)));
  assert.deepEqual(ids(NOW), ids(NOW, "visitor", [...market].reverse()));
  assert.notDeepEqual(ids(NOW).slice(0, 6), ids(NOW, "another-visitor").slice(0, 6));
  assert.notDeepEqual(
    rankBusinesses(market, "", "all", undefined, undefined, "visitor", NOW).slice(0, 6).map((item) => item.business.id),
    rankBusinesses(market, "", "all", undefined, undefined, "visitor", new Date(NOW.getTime() + 864e5)).slice(0, 6).map((item) => item.business.id),
  );
});

test("live eligibility expires even when the presentation rotation is frozen", () => {
  const promo = business("promo", "FEATURED", { tierEndsAt: new Date(NOW.getTime() + 10_000).toISOString() });
  const later = new Date(NOW.getTime() + 20_000);
  assert.equal(rankBusinesses([promo], "", "all", undefined, undefined, "visitor", later, NOW)[0].effectiveTier, "NONE");
  assert.equal(getEffectiveTier(business("pro", "NONE", { proEndsAt: NOW.toISOString() }), NOW), "NONE");
  assert.equal(getEffectiveTier(business("future", "FEATURED", { tierStartsAt: END }), NOW), "NONE");
  assert.equal(getEffectiveTier(business("future-pro", "NONE", { proStartsAt: END, proEndsAt: END }), NOW), "NONE");
  assert.equal(getEffectiveTier(business("pro", "RECOMMENDED", { proEndsAt: END }), NOW), "FEATURED");
});

test("payment never overrides category, relevance, moderation, closure or listing expiry", () => {
  const market = [
    business("eligible", "RECOMMENDED"),
    business("wrong-category", "FEATURED", { primaryCategory: "food-cafes", services: [{ id: "food", name: "Lunch" }] }),
    business("suspended", "FEATURED", { status: "SUSPENDED" }),
    business("closed", "FEATURED", { isTemporarilyClosed: true }),
    business("expired-comrade", "FEATURED", { sellerType: "COMRADE", listingExpiresAt: NOW.toISOString() }),
  ];
  for (const category of [undefined, "printing-cyber"])
    assert.deepEqual(rankBusinesses(market, "printing", "all", category, undefined, "visitor", NOW).map((item) => item.business.id), ["eligible"]);
});

test("all explicit sorts retain bounded paid placement and sort organic cards correctly", () => {
  const market = crowdedMarket().map((item, index) => ({
    ...item, name: String(marketName(index)),
    zone: index % 2 ? "kesses-centre" : "soweto",
    createdAt: new Date(NOW.getTime() - index * 864e5).toISOString(),
    services: [{ id: "printing", name: "Printing", priceFrom: 1000 - index }],
  }));
  const ranked = rankBusinesses(market, "", "kesses-centre", undefined, undefined, "visitor", NOW);
  for (const sort of ["price", "nearest", "newest", "alphabetical"]) {
    const sorted = sortRankedBusinesses(ranked, sort);
    ranked.forEach((candidate, index) => {
      assert.equal(sorted[index].effectiveTier, candidate.effectiveTier);
      if (candidate.effectiveTier !== "NONE") assert.equal(sorted[index].business.id, candidate.business.id);
    });
    // All 200 organic cards remain reachable, including four on each full early page.
    for (let page = 0; page < 50; page++)
      assert.equal(sorted.slice(page * 10, page * 10 + 10).filter((item) => item.effectiveTier === "NONE").length, 4);
    const organic = sorted.filter((item) => item.effectiveTier === "NONE");
    for (let index = 1; index < organic.length; index++) {
      const previous = organic[index - 1], current = organic[index];
      if (sort === "price") assert.ok(previous.business.services[0].priceFrom! <= current.business.services[0].priceFrom!);
      if (sort === "nearest") assert.ok(previous.proximity >= current.proximity);
      if (sort === "newest") assert.ok(Date.parse(previous.business.createdAt) >= Date.parse(current.business.createdAt));
      if (sort === "alphabetical") assert.ok(previous.business.name.localeCompare(current.business.name) <= 0);
    }
  }
});

function marketName(index: number) { return `Shop ${String(1000 - index).padStart(4, "0")}`; }

test("small and all-paid pools fill all slots without losing or duplicating businesses", () => {
  for (const size of [0, 1, 3, 6, 12, 100]) {
    const market = Array.from({ length: size }, (_, i) => business(`featured-${i}`, "FEATURED"));
    const result = rankBusinesses(market, "", "all", undefined, DEFAULT_RANK_CONFIG, "visitor", NOW);
    assert.equal(result.length, size);
    assert.equal(new Set(result.map((item) => item.business.id)).size, size);
  }
});
