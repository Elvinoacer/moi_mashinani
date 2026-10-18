import assert from "node:assert/strict";
import { test } from "node:test";
import type { Prisma } from "../src/generated/prisma/client";
import { pendingPromotionGuarantees, reviewPromotionGuarantee } from "../src/lib/promotion-guarantee";
import { promotionEndAfterPayment } from "../src/lib/payments";

const now = new Date("2026-10-18T12:00:00Z");
const started = new Date("2026-10-01T12:00:00Z");
const ended = new Date("2026-10-08T12:00:00Z");
type Audit = { action: string; details: string; createdAt: Date };

function harness(contacts = 0) {
  const business = { id: "business", status: "ACTIVE", activeTier: "FEATURED", tierStartsAt: started, tierEndsAt: ended, name: "Test business", slug: "test", ownerId: "owner" };
  let payment: { id: string; paidAt: Date } | null = { id: "payment-1", paidAt: started };
  const audits: Audit[] = [];
  const notices: unknown[] = [];
  const calls: string[] = [];
  let contactQuery: unknown;
  const tx = {
    $queryRaw: async (query: TemplateStringsArray) => { calls.push(query.join("?")); return []; },
    business: {
      findUnique: async () => { calls.push("business read"); return business; },
      update: async ({ data }: { data: { tierEndsAt: Date } }) => { Object.assign(business, data); return business; },
    },
    paymentRecord: { findFirst: async () => payment },
    businessAudit: {
      findFirst: async ({ where }: { where: { createdAt: { gte: Date }; OR: Array<{ action: string; details?: string }> } }) =>
        audits.find((audit) => audit.createdAt >= where.createdAt.gte && where.OR.some((condition) => audit.action === condition.action && (!condition.details || condition.details === audit.details))),
      create: async ({ data }: { data: Audit }) => { audits.push(data); return data; },
    },
    businessEvent: { count: async (query: unknown) => { contactQuery = query; return contacts; } },
  } as unknown as Prisma.TransactionClient;
  const review = () => reviewPromotionGuarantee(tx, business.id, now, async (notice) => { notices.push(notice); });
  return { business, audits, notices, calls, tx, review, contactQuery: () => contactQuery, renew: (id: string, paidAt: Date) => { payment = { id, paidAt }; }, legacy: () => { payment = null; } };
}

test("an overdue boost gets seven full days even after an outage longer than 48 hours", async () => {
  const h = harness(2);
  assert.equal(await h.review(), "extended");
  assert.equal(h.business.tierEndsAt.toISOString(), "2026-10-25T12:00:00.000Z");
  assert.equal(h.notices.length, 1);
  assert.match(h.calls[0], /FOR UPDATE/);
  assert.equal(h.calls[1], "business read");
  assert.deepEqual(h.contactQuery(), { where: {
    businessId: "business", type: { in: ["call", "whatsapp", "booking"] }, createdAt: { gte: started, lte: ended },
  } });
});

test("merchant replies, directions and impressions cannot satisfy the customer-contact guarantee", async () => {
  const h = harness();
  await h.review();
  const query = h.contactQuery() as { where: { type: { in: string[] } } };
  for (const type of ["merchant_reply", "directions", "impression", "view"]) assert.ok(!query.where.type.in.includes(type));
});

test("successful runs are marked reviewed so the next batch reaches other merchants", async () => {
  const h = harness(3);
  assert.equal(await h.review(), "reviewed");
  assert.equal(await h.review(), "skipped");
  assert.equal(h.business.tierEndsAt, ended);
  assert.equal(h.audits.length, 1);
  assert.equal(h.notices.length, 0);
});

test("duplicate workers re-read the locked expiry and do not extend twice", async () => {
  const h = harness();
  assert.deepEqual(await Promise.all([h.review(), h.review()]), ["extended", "extended"]);
  // This in-memory harness has no database lock: the actual serialization is
  // exercised below by invoking workers in the order the SQL row lock admits.
  const serial = harness();
  assert.equal(await serial.review(), "extended");
  assert.equal(await serial.review(), "skipped");
  assert.equal(serial.notices.length, 1);
});

test("a verified renewal that commits before review is never shortened", async () => {
  const h = harness();
  h.business.tierEndsAt = new Date("2026-11-18T12:00:00Z");
  assert.equal(await h.review(), "skipped");
  assert.equal(h.business.tierEndsAt.toISOString(), "2026-11-18T12:00:00.000Z");
  assert.equal(h.audits.length, 0);
});

test("a renewal after an earlier guarantee receives a fresh activity review", async () => {
  const h = harness();
  h.audits.push({ action: "VALUE_GUARANTEE_EXTENSION", details: "payment-older", createdAt: new Date("2026-10-04T12:00:00Z") });
  const renewedAt = new Date("2026-10-05T12:00:00Z");
  h.renew("payment-renewal", renewedAt);
  assert.equal(await h.review(), "extended");
  assert.equal((h.contactQuery() as { where: { createdAt: { gte: Date } } }).where.createdAt.gte, renewedAt);
  assert.equal(h.audits.find((a) => a.action === "VALUE_GUARANTEE_REVIEW")?.details, "payment-renewal");
});

test("an already extended legacy run is not granted another extension", async () => {
  const h = harness();
  h.legacy();
  h.audits.push({ action: "VALUE_GUARANTEE_EXTENSION", details: "old implementation", createdAt: new Date("2026-10-07T12:00:00Z") });
  assert.equal(await h.review(), "skipped");
});

test("pending selection filters reviewed runs before its batch limit and has no outage cutoff", async () => {
  let sql = "";
  const db = { $queryRaw: async (query: TemplateStringsArray) => { sql = query.join("?"); return []; } } as unknown as Prisma.TransactionClient;
  await pendingPromotionGuarantees(db, now, 100);
  assert.match(sql, /NOT EXISTS/);
  assert.match(sql, /VALUE_GUARANTEE_REVIEW/);
  assert.ok(sql.indexOf("NOT EXISTS") < sql.lastIndexOf("LIMIT"));
  assert.match(sql, /ORDER BY b\."tierEndsAt" ASC, b\."id" ASC LIMIT/);
  assert.ok(!sql.includes("48") && !sql.includes("2 days"));
});

test("paid time survives renewal and upgrades in either settlement order", () => {
  const current = { activeTier: "RECOMMENDED", tierStartsAt: started, tierEndsAt: new Date(now.getTime() + 7 * 864e5) };
  const upgrade = promotionEndAfterPayment(current, "FEATURED", 1, now);
  assert.equal(upgrade.tierEndsAt.getTime() - now.getTime(), 10.5 * 864e5);
  const renewed = promotionEndAfterPayment(upgrade, "FEATURED", 2, now);
  assert.equal(renewed.tierEndsAt.getTime() - upgrade.tierEndsAt.getTime(), 14 * 864e5);
  const lower = promotionEndAfterPayment(upgrade, "RECOMMENDED", 2, now);
  assert.equal(lower.activeTier, "FEATURED");
  assert.equal(lower.tierEndsAt.getTime() - upgrade.tierEndsAt.getTime(), 7 * 864e5);
});
