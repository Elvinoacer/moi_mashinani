import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const context = JSON.parse(readFileSync("/tmp/moimashinani-test-context.json", "utf8"));
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";

async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { ZONES } = await import("../src/lib/constants");
  const tag = randomUUID();
  const ids: string[] = [];
  let businessId: string | undefined;
  let accountId: string | undefined;
  async function request(path: string, body: unknown, status = 200, cookie = "") {
    const response = await fetch(context.baseUrl + path, {
      method: "POST",
      headers: { Origin: context.baseUrl, "Content-Type": "application/json", "X-Forwarded-For": tag, ...(cookie ? { Cookie: cookie } : {}) },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    assert.equal(response.status, status, JSON.stringify(data));
    return data;
  }
  const housing = { query: `Housing test ${tag}: room near Mabs for KES 4,000`, zone: "mabs", housingIntent: "LOOKING", contactPhone: "0712345678", contactConsent: true, safetyAcknowledged: true };
  try {
    await request("/api/demand", { ...housing, safetyAcknowledged: false }, 400);
    await request("/api/demand", { ...housing, contactConsent: false }, 400);
    await request("/api/demand", { ...housing, contactPhone: undefined }, 400);
    await request("/api/demand", { ...housing, housingIntent: "OTHER" }, 400);
    await request("/api/demand", { ...housing, category: "phone-laptop-repair" }, 400);
    await request("/api/demand", { ...housing, zone: "invented-area" }, 400);

    const looking = await request("/api/demand", housing, 201);
    ids.push(looking.id);
    const vacancy = await request("/api/demand", { ...housing, housingIntent: "VACANCY", zone: "chs" }, 201);
    ids.push(vacancy.id);
    for (const post of [looking, vacancy]) {
      assert.equal(post.category, "hostels-rooms");
      assert.equal(post.contactPhone, undefined);
      assert.deepEqual(post.handoffs, []);
      const stored = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: post.id } });
      assert.equal(stored.housingIntent, post.housingIntent);
      assert.ok(stored.manageTokenHash && stored.manageTokenHash !== post.manageToken);
      await request(`/api/demand/${post.id}/respond`, {}, 400);
      const reply = await request(`/api/demand/${post.id}/respond`, { safetyAcknowledged: true });
      assert.ok(reply.url.startsWith("https://wa.me/254712345678?"));
      assert.match(reply.safetyNotice, /Scams can happen/);
      assert.match(new URL(reply.url).searchParams.get("text")!, /Inspect the property/);
    }
    // No lead quota applies even after the business free allowance would end.
    for (let i = 0; i < 4; i++) await request(`/api/demand/${looking.id}/respond`, { safetyAcknowledged: true });

    const publicPosts = await (await fetch(context.baseUrl + "/api/demand")).json();
    for (const id of ids) {
      const post = publicPosts.find((item: { id: string }) => item.id === id);
      assert.equal(post.canRespond, true);
      assert.equal(post.contactPhone, undefined);
      assert.equal(post.manageTokenHash, undefined);
      assert.equal(post.manageToken, undefined);
    }
    // Existing consent stays private to verified business owners, including old housing requests.
    const legacy = await prisma.serviceRequest.create({ data: { id: `legacy_${tag}`, query: "Looking for a room", category: "hostels-rooms", contactPhone: "+254712345678", contactConsent: true } });
    ids.push(legacy.id);
    await request(`/api/demand/${legacy.id}/respond`, { safetyAcknowledged: true }, 401);
    const ordinary = await request("/api/demand", { query: `Charger test ${tag}`, zone: "chebarus", category: "phone-laptop-repair", contactPhone: "0712345678", contactConsent: true }, 201);
    ids.push(ordinary.id);
    assert.equal(ordinary.housingIntent, undefined);
    await request(`/api/demand/${ordinary.id}/respond`, { safetyAcknowledged: true }, 401);

    const { newSession } = await import("../src/lib/auth");
    const { Store } = await import("../src/lib/store");
    const admin = await prisma.account.findUniqueOrThrow({ where: { email: context.admin.email } });
    const adminCookie = `mm_session=${await newSession(admin.id)}`;
    const adminFeed = await (await fetch(context.baseUrl + "/api/demand", { headers: { Cookie: adminCookie } })).json();
    assert.equal(adminFeed.find((item: { id: string }) => item.id === looking.id).canRespond, true);
    const account = await prisma.account.create({ data: { name: "Housing regression owner", email: `housing-${tag}@test.invalid`, emailVerifiedAt: new Date(), role: "BUSINESS" } });
    accountId = account.id;
    const cookie = `mm_session=${await newSession(account.id)}`;
    const business = await Store.createBusiness({ name: `Housing regression ${tag}`, primaryCategory: "phone-laptop-repair", zone: "chebarus", phone: "+254712345678", ownerId: account.id, isClaimed: true, verificationLevel: "L2", status: "ACTIVE" });
    businessId = business.id;
    for (let i = 0; i < 3; i++) await request(`/api/demand/${ordinary.id}/respond`, { businessId }, 200, cookie);
    await request(`/api/demand/${ordinary.id}/respond`, { businessId }, 402, cookie);
    await request(`/api/demand/${vacancy.id}/respond`, { safetyAcknowledged: true, businessId }, 200, cookie);
    assert.equal(await prisma.businessEvent.count({ where: { businessId, type: "merchant_reply" } }), 3);
    await prisma.business.update({ where: { id: businessId }, data: { verificationLevel: "L0" } });
    await request(`/api/demand/${ordinary.id}/respond`, { businessId }, 403, cookie);

    const zones = await (await fetch(context.baseUrl + "/api/zones")).json();
    for (const zone of ZONES) assert.ok(zones.some((item: { slug: string; name: string }) => item.slug === zone.slug && item.name === zone.name), zone.slug);

    let closed = await fetch(context.baseUrl + "/api/demand", { method: "PATCH", headers: { Origin: context.baseUrl, "Content-Type": "application/json" }, body: JSON.stringify({ id: vacancy.id, manageToken: "incorrect" }) });
    assert.equal(closed.status, 403);
    closed = await fetch(context.baseUrl + "/api/demand", { method: "PATCH", headers: { Origin: context.baseUrl, "Content-Type": "application/json" }, body: JSON.stringify({ id: vacancy.id, manageToken: vacancy.manageToken }) });
    assert.equal(closed.status, 200);
    await request(`/api/demand/${vacancy.id}/respond`, { safetyAcknowledged: true }, 404);
    await prisma.serviceRequest.update({ where: { id: looking.id }, data: { createdAt: new Date(Date.now() - 8 * 864e5) } });
    await request(`/api/demand/${looking.id}/respond`, { safetyAcknowledged: true }, 404);
    console.log("PASS housing: anonymous two-way posting and replies, safety/consent validation, privacy, no lead charges, legacy consent, business auth/verification/quota, locations, close and expiry");
  } finally {
    await prisma.serviceRequest.deleteMany({ where: { id: { in: ids } } });
    if (businessId) {
      await prisma.businessEvent.deleteMany({ where: { businessId } });
      await prisma.business.delete({ where: { id: businessId } });
    }
    if (accountId) await prisma.account.delete({ where: { id: accountId } });
    await prisma.$disconnect();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
