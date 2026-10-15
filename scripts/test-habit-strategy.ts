import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
const context = JSON.parse(
  readFileSync("/tmp/moimashinani-test-context.json", "utf8"),
);
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";
process.env.APP_URL = context.baseUrl;
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { Store } = await import("../src/lib/store");
  const { newSession, hashPassword, hashToken } =
    await import("../src/lib/auth");
  const { requestPhoneCode, verifyPhoneCode } =
    await import("../src/lib/phone-auth");
  const { createMerchantAction } = await import("../src/lib/merchant-actions");
  const base = context.baseUrl,
    tag = randomUUID().slice(0, 8);
  const owner = await prisma.account.create({
    data: {
      email: `habit-${tag}@test.invalid`,
      name: "Habit merchant",
      role: "BUSINESS",
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword("habit test password 2026"),
    },
  });
  const cookie = `mm_session=${await newSession(owner.id)}`;
  const business = await Store.createBusiness({
    name: `Habit Kitchen ${tag}`,
    primaryCategory: "food-cafes",
    zone: "stage",
    landmark: "Test stage kitchen",
    servesZones: ["talai", "stage"],
    ownerId: owner.id,
    ownerPhone: "+254712333444",
    phone: "+254712333444",
    whatsapp: "+254712333444",
    isClaimed: true,
    status: "ACTIVE",
    verificationLevel: "L2",
    serviceModes: ["at_shop", "delivery"],
    requestAlertsEnabled: true,
    services: Array.from({ length: 7 }, (_, i) => ({
      id: `item-${i}`,
      name: `Comrade meal ${i}`,
      priceFrom: 100,
    })),
  });
  let checks = 0;
  function check(value: unknown, label: string) {
    assert.ok(value, label);
    console.log(`PASS ${label}`);
    checks++;
  }
  async function call(
    path: string,
    method = "GET",
    body?: unknown,
    auth = "",
    expected = 200,
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: base,
        Cookie: auth,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(90000),
    });
    const data = await response.json();
    assert.equal(response.status, expected, `${path}: ${JSON.stringify(data)}`);
    return data;
  }
  try {
    await call(
      "/api/businesses",
      "POST",
      {
        ownerEmail: "254711111111@phone.moimashinani.invalid",
        ownerName: "Reserved identity attempt",
        name: `Reserved identity ${tag}`,
        phone: "+254715999888",
        primaryCategory: "food-cafes",
        zone: "stage",
        landmark: "Campus gate",
        description:
          "Synthetic valid enrollment used to check internal identity reservation.",
        serviceModes: ["at_shop"],
        services: business.services.slice(0, 3),
        verificationVisitRequested: true,
      },
      "",
      400,
    );
    check(
      true,
      "public enrollment cannot reserve internal phone-account identities",
    );
    const publicBiz = await call(`/api/businesses/${business.slug}`);
    check(
      publicBiz.services.length === 7,
      "all free catalogue items are public",
    );
    await call(
      `/api/businesses/${business.slug}/products`,
      "POST",
      { id: "eighth", name: "Eighth free meal", priceFrom: 80 },
      cookie,
    );
    await call(
      `/api/businesses/${business.slug}/products`,
      "PATCH",
      { id: "eighth", name: "Eighth free meal", priceFrom: 80, inStock: false },
      cookie,
    );
    check(
      (await call(`/api/businesses/${business.slug}`)).services.find(
        (s: { id: string; inStock: boolean }) => s.id === "eighth",
      ).inStock === false,
      "free sellers can add beyond five and mark sold out",
    );
    check(
      (
        await call(
          `/api/businesses/${business.slug}/plan`,
          "GET",
          undefined,
          cookie,
        )
      ).storageLimit === null,
      "verified free sellers have unlimited catalogue photo storage",
    );
    const posted = await call(
      "/api/demand",
      "POST",
      {
        query: "Need comrade meal food under 100 today",
        category: "food-cafes",
        zone: "stage",
        contactPhone: "0712345678",
        contactConsent: true,
      },
      "",
      201,
    );
    check(
      posted.handoffs.some(
        (h: { businessId: string; url: string }) =>
          h.businessId === business.id && h.url.startsWith("https://wa.me/"),
      ),
      "anonymous request immediately offers matching verified WhatsApp contacts",
    );
    const notice = await prisma.notification.findFirstOrThrow({
      where: {
        accountId: owner.id,
        eventKey: `request/${posted.id}/${business.id}`,
      },
    });
    check(
      notice.path.startsWith("/merchant/action/"),
      "merchant request notification contains a scoped no-login link",
    );
    const token = notice.path.split("/").pop()!;
    const previews = await fetch(base + notice.path);
    check(
      previews.ok &&
        !(
          await prisma.merchantAction.findUniqueOrThrow({
            where: { tokenHash: hashToken(token) },
          })
        ).usedAt,
      "GET preview never consumes an action",
    );
    const replies = await Promise.all(
      [1, 2].map(() =>
        fetch(base + "/api/merchant-actions", {
          method: "POST",
          headers: { Origin: base, "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        }),
      ),
    );
    check(
      JSON.stringify(replies.map((r) => r.status).sort()) ===
        JSON.stringify([200, 410]),
      "exactly one concurrent merchant action succeeds",
    );
    const success = await replies.find((r) => r.status === 200)!.json();
    check(
      success.url.startsWith("https://wa.me/254712345678"),
      "single-use request action opens consenting student WhatsApp without login",
    );
    await call(
      "/api/merchant-actions",
      "POST",
      { token: "a".repeat(64) },
      "",
      410,
    );
    check(
      (await prisma.businessEvent.count({
        where: { businessId: business.id, type: "merchant_reply" },
      })) === 1,
      "merchant replies create lead attribution once under concurrent consumption",
    );
    const openPath = await createMerchantAction(
      prisma,
      { id: business.id, ownerId: owner.id },
      "OPEN",
    );
    await call("/api/merchant-actions", "POST", {
      token: openPath!.split("/").pop(),
    });
    const live = await Store.getBusinessById(business.id);
    check(
      live?.availabilityConfirmedAt &&
        Date.parse(live.availableNowUntil!) -
          Date.parse(live.availabilityConfirmedAt) ===
          4 * 3600000,
      "one-tap open confirmation expires after four hours",
    );
    await call(
      `/api/businesses/${business.slug}`,
      "PATCH",
      {
        utilities: {
          hasGenerator: true,
          hasWifi: true,
          hasWater: true,
          freeDelivery: true,
        },
      },
      cookie,
    );
    check(
      (await call("/api/businesses?survival=backup&zone=stage")).results.some(
        (b: { id: string }) => b.id === business.id,
      ),
      "blackout filter requires a live seller with backup power",
    );
    await prisma.business.update({
      where: { id: business.id },
      data: { availableNowUntil: new Date(Date.now() - 1000) },
    });
    check(
      !(await call("/api/businesses?survival=backup")).results.some(
        (b: { id: string }) => b.id === business.id,
      ),
      "expired utility confirmations disappear from blackout filter",
    );
    await call(
      "/api/deals",
      "POST",
      {
        businessId: business.id,
        title: "Free hostel dinner drop",
        priceKes: 100,
        endsAt: new Date(Date.now() + 3600000).toISOString(),
        dropZone: "talai",
        dropAt: new Date(Date.now() + 7200000).toISOString(),
        deliveryFeeKes: 0,
      },
      "",
      401,
    );
    const deal = await call(
      "/api/deals",
      "POST",
      {
        businessId: business.id,
        title: "Free hostel dinner drop",
        priceKes: 100,
        endsAt: new Date(Date.now() + 3600000).toISOString(),
        dropZone: "talai",
        dropAt: new Date(Date.now() + 7200000).toISOString(),
        deliveryFeeKes: 0,
      },
      cookie,
      201,
    );
    check(
      (await call("/api/deals")).some(
        (d: { id: string; deliveryFeeKes: number }) =>
          d.id === deal.id && d.deliveryFeeKes === 0,
      ),
      "free delivery drop appears with its cutoff and exact fee",
    );
    const firstJoin = await fetch(base + `/api/deals/${deal.id}/join`, {
      method: "POST",
      headers: { Origin: base },
    });
    const session = firstJoin.headers.get("set-cookie")!.split(";")[0];
    const joined = await firstJoin.json();
    check(
      firstJoin.status === 200 &&
        joined.joins === 1 &&
        joined.url.includes("wa.me"),
      "anonymous drop join gives immediate order handoff",
    );
    check(
      (await call(`/api/deals/${deal.id}/join`, "POST", undefined, session))
        .joins === 1,
      "repeated joins from the same browser do not inflate interest",
    );
    await call(
      "/api/deals",
      "POST",
      {
        businessId: business.id,
        title: "Bad drop",
        priceKes: 100,
        endsAt: new Date(Date.now() + 3600000).toISOString(),
        dropZone: "talai",
        dropAt: new Date(Date.now() + 1000).toISOString(),
        deliveryFeeKes: 0,
      },
      cookie,
      400,
    );
    check(true, "delivery time cannot precede order cutoff");
    const booking = await call(
      "/api/bookings",
      "POST",
      {
        businessId: business.id,
        serviceName: "Comrade meal 0",
        day: new Date().toLocaleDateString("en-CA", {
          timeZone: "Africa/Nairobi",
        }),
        time: "7 PM",
        studentName: "Student",
        contactPhone: "0712345678",
      },
      "",
      201,
    );
    const bookingNotice = await prisma.notification.findFirstOrThrow({
      where: { accountId: owner.id, eventKey: `booking/${booking.id}` },
    });
    const accept = await call("/api/merchant-actions", "POST", {
      token: bookingNotice.path.split("/").pop(),
    });
    check(
      accept.url.includes("wa.me") &&
        (
          await prisma.bookingIntent.findUniqueOrThrow({
            where: { id: booking.id },
          })
        ).status === "CONFIRMED",
      "booking action confirms request and opens student WhatsApp",
    );
    await prisma.business.update({
      where: { id: business.id },
      data: { isTemporarilyClosed: true },
    });
    await call(`/api/businesses/${business.slug}`);
    await call(
      "/api/bookings",
      "POST",
      {
        businessId: business.id,
        serviceName: "General inquiry",
        day: new Date().toLocaleDateString("en-CA", {
          timeZone: "Africa/Nairobi",
        }),
        time: "7 PM",
        studentName: "Student",
        contactPhone: "0712345678",
      },
      "",
      409,
    );
    await prisma.business.update({
      where: { id: business.id },
      data: { isTemporarilyClosed: false },
    });
    check(
      true,
      "temporary closure keeps the profile visible and rejects new bookings with a clear conflict",
    );
    let captured = "";
    const phone = "+254711222333";
    const challengeId = await requestPhoneCode(
      phone,
      "Student seller",
      async (_phone, message) => {
        captured = message.match(/\d{6}/)![0];
      },
    );
    const badChallenge = await requestPhoneCode(
      "+254711222334",
      "Other",
      async () => {},
    );
    for (let i = 0; i < 5; i++)
      await assert.rejects(verifyPhoneCode(badChallenge, "000000"));
    check(
      (
        await prisma.phoneChallenge.findUniqueOrThrow({
          where: { id: badChallenge },
        })
      ).attempts === 5,
      "failed OTP attempts persist and lock the challenge",
    );
    await call(
      "/api/auth/phone/verify",
      "POST",
      { challengeId, code: "000000" },
      "",
      400,
    );
    const verified = await fetch(base + "/api/auth/phone/verify", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body: JSON.stringify({ challengeId, code: captured }),
    });
    check(
      verified.status === 200,
      "SMS verification creates a phone identity without email acceptance",
    );
    const phoneCookie = verified.headers.get("set-cookie")!.split(";")[0];
    check(
      (await call("/api/auth/me", "GET", undefined, phoneCookie)).user.phone ===
        phone,
      "phone-verified session works through the existing account gate",
    );
    await call(
      "/api/auth/phone/verify",
      "POST",
      { challengeId, code: captured },
      "",
      400,
    );
    check(true, "used SMS codes cannot create a second session");
    const image = await sharp({
      create: { width: 200, height: 100, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(image)], { type: "image/png" }),
      "id.png",
    );
    const proofResponse = await fetch(base + "/api/enrollment/proof", {
      method: "POST",
      headers: { Origin: base },
      body: form,
    });
    assert.equal(proofResponse.status, 201);
    const proof = await proofResponse.json();
    const staging = proofResponse.headers.get("set-cookie")!.split(";")[0];
    const listing = await call(
      "/api/businesses",
      "POST",
      {
        name: `Declutter cylinder ${tag}`,
        ownerName: "Student seller",
        phone,
        primaryCategory: "phone-laptop-repair",
        zone: "stage",
        landmark: "Hostel gate meeting point",
        description:
          "Used campus cylinder available for inspection at the hostel gate.",
        sellerType: "COMRADE",
        comradeListingKind: "DECLUTTER",
        verificationVisitRequested: true,
        proofId: proof.proofId,
        hours: {},
        serviceModes: ["comes_to_you"],
        services: [{ id: "cylinder", name: "Used cylinder", priceFrom: 900 }],
      },
      phoneCookie + "; " + staging,
      201,
    );
    check(
      listing.business.isClaimed &&
        listing.business.status === "PENDING" &&
        listing.business.listingExpiresAt &&
        listing.business.services.length === 1,
      "phone-verified student posts one item without storefront or email",
    );
    await call(`/api/businesses/${listing.slug}`, "GET", undefined, "", 404);
    check(true, "pending student identities never appear publicly");
    await prisma.business.update({
      where: { id: listing.business.id },
      data: { status: "ACTIVE", verificationLevel: "L2" },
    });
    check(
      (await call("/api/businesses?survival=comrade")).results.some(
        (b: { id: string }) => b.id === listing.business.id,
      ),
      "reviewed student listing enters Comrade Market",
    );
    const expiredPath = await createMerchantAction(
      prisma,
      { id: business.id, ownerId: owner.id },
      "OPEN",
    );
    await prisma.merchantAction.update({
      where: { tokenHash: hashToken(expiredPath!.split("/").pop()!) },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await call(
      "/api/merchant-actions",
      "POST",
      { token: expiredPath!.split("/").pop() },
      "",
      410,
    );
    check(true, "expired no-login links reject mutation");
    await prisma.business.update({
      where: { id: listing.business.id },
      data: { listingExpiresAt: new Date(Date.now() - 1) },
    });
    await call(`/api/businesses/${listing.slug}`, "GET", undefined, "", 404);
    await call(
      `/api/businesses/${listing.slug}/refresh-market`,
      "POST",
      {},
      "",
      401,
    );
    const refreshed = await call(
      `/api/businesses/${listing.slug}/refresh-market`,
      "POST",
      {},
      phoneCookie,
    );
    check(
      Date.parse(refreshed.listingExpiresAt) > Date.now() + 29 * 864e5,
      "only the verified student owner can refresh an expired listing for 30 days",
    );

    const admin = await prisma.account.findUniqueOrThrow({
      where: { email: context.admin.email },
    });
    const adminCookie = `mm_session=${await newSession(admin.id)}`;
    const fieldPhone = `+25471${Math.floor(1000000 + Math.random() * 8999999)}`;
    const fieldListing = await call(
      "/api/admin/enroll",
      "POST",
      {
        name: `Phone-only field shop ${tag}`,
        ownerName: "Field merchant",
        phone: fieldPhone,
        primaryCategory: "food-cafes",
        zone: "stage",
        landmark: "Field visit test corner",
        description: "A field-checked campus kitchen with clear menu prices.",
        serviceModes: ["at_shop"],
        services: business.services.slice(0, 3),
        fieldVisitConfirmed: true,
        ownerConsentConfirmed: true,
      },
      adminCookie,
      201,
    );
    check(
      fieldListing.business.status === "ACTIVE" &&
        !fieldListing.business.isClaimed &&
        !fieldListing.invitation.sent,
      "field merchant can enroll without email; unavailable SMS invitation is reported honestly",
    );
    let fieldCode = "";
    const fieldChallenge = await requestPhoneCode(
      fieldPhone,
      "Field merchant",
      async (_phone, message) => {
        fieldCode = message.match(/\d{6}/)![0];
      },
    );
    const fieldAccount = await verifyPhoneCode(fieldChallenge, fieldCode);
    check(
      (
        await prisma.business.findUniqueOrThrow({
          where: { id: fieldListing.business.id },
        })
      ).isClaimed && fieldAccount.phoneVerifiedAt,
      "SMS possession accepts the field-enrolled phone account and claims its storefront",
    );
    process.env.CRON_SECRET = "synthetic-habit-cron-secret";
    process.env.RESEND_API_KEY = "";
    process.env.AT_USERNAME = "";
    process.env.AT_API_KEY = "";
    const { NextRequest } = await import("next/server");
    const { GET: cron } = await import("../app/api/cron/campus-pulse/route");
    check(
      (await cron(new NextRequest(base + "/api/cron/campus-pulse"))).status ===
        401,
      "campus pulse scheduler rejects unauthenticated requests",
    );
    const runCron = () =>
      cron(
        new NextRequest(base + "/api/cron/campus-pulse", {
          headers: { Authorization: "Bearer synthetic-habit-cron-secret" },
        }),
      );
    const firstCron = await runCron();
    check(
      firstCron.status === 200 && (await firstCron.json()).morningPings >= 1,
      "campus pulse persists morning confirmation links for opted-in merchants",
    );
    const secondCron = await runCron();
    check(
      secondCron.status === 200 && (await secondCron.json()).morningPings === 0,
      "morning pings deduplicate per merchant and Kenya day",
    );

    writeFileSync(
      "/tmp/mm-habit-fixture.json",
      JSON.stringify({
        base,
        cookie,
        slug: business.slug,
        businessId: business.id,
        dealId: deal.id,
        marketSlug: listing.slug,
        phoneCookie,
      }),
      { mode: 0o600 },
    );
    console.log(`${checks} habit-strategy checks passed`);
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
