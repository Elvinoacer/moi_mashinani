import { test } from "node:test";
import assert from "node:assert/strict";
import {
  publicListing,
  campusContext,
  scheduledOpen,
  survivalMatch,
  availabilityLabel,
} from "../src/lib/campus-value";
import type { Business } from "../src/lib/types";
const base = {
  status: "ACTIVE",
  isTemporarilyClosed: false,
  verificationLevel: "L2",
  sellerType: "SHOPFRONT",
  hours: {},
  serviceModes: ["delivery"],
  utilities: {},
  services: [{ id: "1", name: "Meal" }],
} as Business;
test("opening hours use Nairobi, including yesterday’s overnight hours and closed days", () => {
  const hours = {
    Wednesday: { open: "21:00", close: "02:00" },
    Thursday: { open: "08:00", close: "20:00", closed: true },
  };
  assert.equal(scheduledOpen(hours, Date.parse("2026-10-14T22:30:00Z")), true); // Thursday 1:30 EAT
  assert.equal(scheduledOpen(hours, Date.parse("2026-10-14T23:00:00Z")), false); // exact close
  assert.equal(scheduledOpen(hours, Date.parse("2026-10-15T06:00:00Z")), false);
  assert.equal(
    scheduledOpen(
      { Thursday: { open: "08:00", close: "20:00", appointmentOnly: true } },
      Date.parse("2026-10-15T10:00:00Z"),
    ),
    false,
  );
});
test("breakfast, lunch, dinner and night context use Kenya time", () => {
  assert.match(
    campusContext(Date.parse("2026-10-15T05:00:00Z")).title,
    /morning/,
  );
  assert.match(
    campusContext(Date.parse("2026-10-15T10:00:00Z")).title,
    /Lunch/,
  );
  assert.match(
    campusContext(Date.parse("2026-10-15T16:00:00Z")).title,
    /Tonight/,
  );
  assert.match(campusContext(Date.parse("2026-10-15T20:00:00Z")).title, /Late/);
});
test("live utility claims expire independently of listed opening hours", () => {
  const now = Date.parse("2026-10-15T10:00:00Z");
  const b = {
    ...base,
    utilities: { hasGenerator: true },
    availableNowUntil: new Date(now + 1000).toISOString(),
    availabilityConfirmedAt: new Date(now - 7200000).toISOString(),
  };
  assert.equal(survivalMatch(b, "backup", now), true);
  assert.equal(survivalMatch(b, "backup", now + 1000), false);
  assert.equal(
    survivalMatch({ ...b, isTemporarilyClosed: true }, "backup", now),
    false,
  );
  assert.match(availabilityLabel(b, now), /Confirmed open 2h ago/);
  assert.equal(
    survivalMatch(
      { ...base, utilities: { freeDelivery: true } },
      "free-delivery",
      now,
    ),
    true,
  );
  assert.equal(
    survivalMatch(
      { ...base, serviceModes: ["at_shop"], utilities: { freeDelivery: true } },
      "free-delivery",
      now,
    ),
    false,
  );
});
test("vacant kejas require verification, actual vacancies, rent and no broker fee", () => {
  const b = {
    ...base,
    primaryCategory: "hostels-rooms",
    utilities: { vacantRooms: 2, rentKes: 3000, noBrokerFee: true },
  };
  assert.equal(survivalMatch(b, "hostels", 1), true);
  assert.equal(
    survivalMatch({ ...b, verificationLevel: "L1" }, "hostels", 1),
    false,
  );
  assert.equal(
    survivalMatch(
      { ...b, utilities: { ...b.utilities, vacantRooms: 0 } },
      "hostels",
      1,
    ),
    false,
  );
});
test("expired, unreviewed and sold-out student listings do not populate Comrade Market", () => {
  const b = {
    ...base,
    sellerType: "COMRADE",
    listingExpiresAt: new Date(1000).toISOString(),
  } as Business;
  assert.equal(survivalMatch(b, "comrade", 999), true);
  assert.equal(survivalMatch(b, "comrade", 1000), false);
  assert.equal(
    survivalMatch({ ...b, verificationLevel: "L0" }, "comrade", 999),
    false,
  );
  assert.equal(
    survivalMatch(
      { ...b, services: [{ id: "1", name: "Sold", inStock: false }] },
      "comrade",
      999,
    ),
    false,
  );
});

test("temporary closure keeps a storefront visible but removes it from live discovery", () => {
  const closed = { ...base, isTemporarilyClosed: true };
  assert.equal(publicListing(closed, 100), true);
  assert.equal(survivalMatch(closed, "all", 100), false);
});

test("legacy availability never invents an unrecorded confirmation time", () => {
  const now = Date.parse("2026-10-15T10:00:00Z");
  const b = {
    ...base,
    availableNowUntil: new Date(now + 3600000).toISOString(),
  };
  assert.equal(availabilityLabel(b, now), "Seller marked available");
});
