import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
const context = JSON.parse(
  readFileSync("/tmp/moimashinani-test-context.json", "utf8"),
);
process.env.DATABASE_URL = context.databaseUrl;
process.env.DATABASE_IP_FAMILY = "";
const base = context.baseUrl;
async function main() {
  const { prisma } = await import("../src/lib/prisma");
  const { Store } = await import("../src/lib/store");
  const { hashPassword, newSession } = await import("../src/lib/auth");
  const tag = randomUUID().slice(0, 8);
  const password = "campus audit password 2026";
  const owner = await prisma.account.create({
    data: {
      email: `audit-${tag}@test.invalid`,
      name: "Audit owner",
      role: "BUSINESS",
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(password),
    },
  });
  const field = await prisma.account.create({
    data: {
      email: `field-${tag}@test.invalid`,
      name: "Audit ambassador",
      role: "AMBASSADOR",
      emailVerifiedAt: new Date(),
      passwordHash: await hashPassword(password),
    },
  });
  const cookie = `mm_session=${await newSession(owner.id)}`;
  const fieldCookie = `mm_session=${await newSession(field.id)}`;
  const phone = `+25471${Math.floor(1000000 + Math.random() * 8999999)}`;
  const business = await Store.createBusiness({
    name: `Audit campus shop ${tag}`,
    primaryCategory: "phone-laptop-repair",
    zone: "stage",
    servesZones: ["stage"],
    ownerId: owner.id,
    ownerEmail: owner.email,
    ownerPhone: phone,
    phone,
    whatsapp: phone,
    status: "ACTIVE",
    verificationLevel: "L2",
    isClaimed: true,
    studentDiscount: "KES 20 off repairs",
    services: [
      { id: "one", name: "Phone repair", priceFrom: 150 },
      { id: "two", name: "Charger", priceFrom: 200 },
      { id: "three", name: "Screen protector", priceFrom: 80 },
    ],
  });
  const fixture = {
    base,
    cookie,
    fieldCookie,
    slug: business.slug,
    businessId: business.id,
    phone,
    ownerEmail: owner.email,
    password,
  };
  const { writeFileSync } = await import("node:fs");
  writeFileSync("/tmp/mm-audit-browser.json", JSON.stringify(fixture), {
    mode: 0o600,
  });
  let passed = 0;
  function check(value: unknown, label: string) {
    assert.ok(value, label);
    passed++;
    console.log(`PASS ${label}`);
  }
  async function req(
    path: string,
    method = "GET",
    body?: unknown,
    auth = "",
    status = 200,
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Origin: base,
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(auth ? { Cookie: auth } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(60000),
    });
    const data = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${path}: ${JSON.stringify(data)}`,
    );
    return data;
  }
  try {
    const phoneLogin = await req("/api/auth/login", "POST", {
      identifier: phone,
      password,
    });
    check(
      phoneLogin.user.id === owner.id,
      "owner phone + password signs in after account acceptance",
    );
    await req("/api/ambassador", "GET", undefined, cookie, 403);
    await req("/api/admin/ambassadors", "GET", undefined, fieldCookie, 403);
    check(true, "merchant and ambassador roles cannot enter admin tools");
    await req(
      "/api/demand",
      "POST",
      {
        query: "Phone repair",
        zone: "stage",
        category: "phone-laptop-repair",
        contactPhone: "0712345678",
      },
      "",
      400,
    );
    const posted = await req(
      "/api/demand",
      "POST",
      {
        query: `Need phone repair ${tag} under KES 500`,
        zone: "stage",
        category: "phone-laptop-repair",
        contactPhone: "0712345678",
        contactConsent: true,
      },
      "",
      201,
    );
    const board = await req("/api/demand");
    check(
      board.some((r: { id: string }) => r.id === posted.id) &&
        !JSON.stringify(board).includes("contactPhone") &&
        !JSON.stringify(board).includes("manageToken"),
      "public requests are visible with contact phone and management token redacted",
    );
    const notification = await prisma.notification.findFirst({
      where: {
        accountId: owner.id,
        eventKey: `request/${posted.id}/${business.id}`,
      },
    });
    check(
      notification?.path === "/requests",
      "matching active verified seller gets a durable request notification",
    );
    await req(
      `/api/demand/${posted.id}/respond`,
      "POST",
      { businessId: business.id },
      "",
      401,
    );
    const reply = await req(
      `/api/demand/${posted.id}/respond`,
      "POST",
      { businessId: business.id },
      cookie,
    );
    check(
      reply.url.startsWith("https://wa.me/254712345678") &&
        decodeURIComponent(reply.url).includes(business.slug),
      "verified owner can generate a WhatsApp response with trust link",
    );
    await req(
      "/api/demand",
      "PATCH",
      { id: posted.id, manageToken: "wrong" },
      "",
      403,
    );
    await req("/api/demand", "PATCH", {
      id: posted.id,
      manageToken: posted.manageToken,
    });
    await req(
      `/api/demand/${posted.id}/respond`,
      "POST",
      { businessId: business.id },
      cookie,
      404,
    );
    check(
      !(await req("/api/demand")).some(
        (r: { id: string }) => r.id === posted.id,
      ),
      "anonymous request receipt closes the request and stops replies",
    );
    const expired = await prisma.serviceRequest.create({
      data: {
        id: `expired-${tag}`,
        query: "Old repair request",
        zone: "stage",
        createdAt: new Date(Date.now() - 8 * 864e5),
      },
    });
    check(
      !(await req("/api/demand")).some(
        (r: { id: string }) => r.id === expired.id,
      ),
      "seven-day requests expire out of the board",
    );
    const noContact = await req(
      "/api/demand",
      "POST",
      { query: `Need charger ${tag}`, zone: "stage" },
      "",
      201,
    );
    await req(
      `/api/demand/${noContact.id}/respond`,
      "POST",
      { businessId: business.id },
      cookie,
      409,
    );
    check(
      true,
      "student requests can omit contact details without exposing an unusable chat link",
    );
    await req(
      `/api/businesses/${business.slug}/toggle-available`,
      "POST",
      { enabled: true, liveStatus: "x".repeat(41) },
      cookie,
      400,
    );
    await req(
      `/api/businesses/${business.slug}/toggle-available`,
      "POST",
      { enabled: true, liveStatus: "Generator ON · printing open" },
      cookie,
    );
    const live = await req("/api/businesses?availableNow=true");
    check(
      live.results.some(
        (b: { id: string; liveStatus: string }) =>
          b.id === business.id && b.liveStatus.includes("Generator"),
      ),
      "40-character live broadcasts appear in available-now discovery",
    );
    await req(
      `/api/businesses/${business.slug}/toggle-available`,
      "POST",
      { enabled: false },
      cookie,
    );
    await prisma.business.update({
      where: { id: business.id },
      data: {
        availableNowUntil: new Date(Date.now() - 1000),
        liveStatus: "Expired",
      },
    });
    check(
      !(await req("/api/businesses?availableNow=true")).results.some(
        (b: { id: string }) => b.id === business.id,
      ),
      "expired live broadcast is removed from discovery",
    );
    await req("/api/events", "POST", {
      businessId: business.id,
      type: "whatsapp",
      zone: "talai",
    });
    const leads = await req(
      `/api/businesses/${business.slug}/leads`,
      "GET",
      undefined,
      cookie,
    );
    check(
      leads.some(
        (e: { type: string; zone: string }) =>
          e.type === "whatsapp" && e.zone === "talai",
      ),
      "customer activity records timestamp and selected campus zone",
    );
    await req(
      `/api/businesses/${business.slug}/leads`,
      "GET",
      undefined,
      "",
      401,
    );
    await req(
      `/api/businesses/${business.slug}/products`,
      "PATCH",
      { ...business.services[0], inStock: false },
      cookie,
      409,
    );
    await req(
      `/api/businesses/${business.slug}`,
      "PATCH",
      { services: [{ ...business.services[0], inStock: false }] },
      cookie,
      409,
    );
    check(
      true,
      "Pro stock entitlement applies to both product endpoint and bulk profile updates",
    );
    const payment = await Store.createPayment({
      apiRef: `audit-pro-${tag}`,
      businessId: business.id,
      businessName: business.name,
      planId: "PRO",
      weeks: 1,
      amountKes: 250,
      method: "INTASEND_CHECKOUT",
      provider: "INTASEND",
      currency: "KES",
    });
    await Store.confirmVerifiedPayment(payment.id, {
      invoiceId: `pro-invoice-${tag}`,
      state: "COMPLETE",
    });
    const pro = await Store.getBusinessById(business.id);
    await Store.confirmVerifiedPayment(payment.id, {
      invoiceId: `pro-invoice-${tag}`,
      state: "COMPLETE",
    });
    check(
      (await Store.getBusinessById(business.id))?.proEndsAt === pro?.proEndsAt,
      "KES 250 Pro activation is a calendar month and replay-safe",
    );
    await req(
      `/api/businesses/${business.slug}/products`,
      "PATCH",
      { ...business.services[0], inStock: false },
      cookie,
    );
    check(
      (await req(`/api/businesses/${business.slug}`)).services[0].inStock ===
        false,
      "Pro seller stock changes are reflected publicly",
    );
    const blast = await Store.createPayment({
      apiRef: `audit-blast-${tag}`,
      businessId: business.id,
      businessName: business.name,
      planId: "DEAL_BLAST",
      weeks: 1,
      amountKes: 30,
      method: "INTASEND_CHECKOUT",
      provider: "INTASEND",
      currency: "KES",
    });
    await Store.confirmVerifiedPayment(blast.id, {
      invoiceId: `blast-invoice-${tag}`,
      state: "COMPLETE",
    });
    const blasted = await Store.getBusinessById(business.id);
    await Store.confirmVerifiedPayment(blast.id, {
      invoiceId: `blast-invoice-${tag}`,
      state: "COMPLETE",
    });
    check(
      (await Store.getBusinessById(business.id))?.dealBlastEndsAt ===
        blasted?.dealBlastEndsAt &&
        Date.parse(blasted!.dealBlastEndsAt!) > Date.now(),
      "KES 30 deal blast activates for 24 hours exactly once",
    );
    const receiptPayment = await Store.createPayment({
      apiRef: `receipt-${tag}`,
      businessId: business.id,
      businessName: business.name,
      planId: "DEAL_BLAST",
      weeks: 1,
      amountKes: 30,
      method: "INTASEND_CHECKOUT",
      provider: "INTASEND",
      currency: "KES",
    });
    await req(
      `/api/payments/${receiptPayment.id}/verify`,
      "POST",
      { receipt: "SHORT" },
      cookie,
      400,
    );
    await req(
      `/api/payments/${receiptPayment.id}/verify`,
      "POST",
      { receipt: "TEST123456" },
      cookie,
      503,
    );
    check(
      (await Store.getPaymentById(receiptPayment.id))?.submittedReceipt ===
        "TEST123456" &&
        (await Store.getBusinessById(business.id))?.dealBlastEndsAt ===
          blasted?.dealBlastEndsAt,
      "manual receipt is saved for review without activating another package",
    );
    await prisma.paymentRecord.update({where:{id:receiptPayment.id},data:{state:'FAILED'}});
    const image = await sharp({
      create: { width: 120, height: 80, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(image)], { type: "image/png" }),
      "student-id.png",
    );
    const upload = await fetch(base + "/api/enrollment/proof", {
      method: "POST",
      headers: { Origin: base },
      body: form,
    });
    assert.equal(upload.status, 201);
    const proof = await upload.json();
    const stagingCookie = upload.headers.get("set-cookie")!.split(";")[0];
    const privateImage = await fetch(
      `${base}/api/enrollment/proof?id=${proof.proofId}`,
    );
    check(
      privateImage.status === 403,
      "student ID is never served anonymously",
    );
    const stagingImage = await fetch(
      `${base}/api/enrollment/proof?id=${proof.proofId}`,
      { headers: { Cookie: stagingCookie } },
    );
    check(
      stagingImage.ok &&
        stagingImage.headers.get("cache-control") === "private, no-store",
      "private student ID preview is cookie-bound and never publicly cached",
    );
    await req(
      `/api/businesses/${business.slug}/verification`,
      "POST",
      { proofId: proof.proofId },
      cookie,
      403,
    );
    await req(
      `/api/businesses/${business.slug}/verification`,
      "POST",
      { proofId: proof.proofId },
      cookie + "; " + stagingCookie,
    );
    const tasks = await req(
      "/api/ambassador?zone=stage",
      "GET",
      undefined,
      fieldCookie,
    );
    check(
      tasks.tasks.some((t: { id: string }) => t.id === business.id),
      "free visit request creates a real ambassador task",
    );
    await req(
      "/api/ambassador",
      "PATCH",
      { businessId: business.id, evidence: "Visited campus workshop" },
      fieldCookie,
      400,
    );
    await req(
      "/api/ambassador",
      "PATCH",
      {
        businessId: business.id,
        evidence: "Visited workshop and checked owner identity",
        identityChecked: true,
        locationChecked: true,
        ownerConsent: true,
      },
      fieldCookie,
    );
    const done = await req(
      "/api/ambassador?zone=stage",
      "GET",
      undefined,
      fieldCookie,
    );
    check(
      !done.tasks.some((t: { id: string }) => t.id === business.id) &&
        done.completed >= 1,
      "field checklist consumes visit task and records today’s progress",
    );
    const trust = await req(`/api/businesses/${business.slug}/trust`);
    check(
      trust.level === "L2" &&
        trust.lastCheckedAt &&
        trust.openScamReports === 0,
      "shareable public trust evidence uses real verification date and report count",
    );
    const draft = {
      ownerEmail: `enroll-${tag}@test.invalid`,
      ownerName: "Hostel Seller",
      name: `Hostel seller ${tag}`,
      phone: "0712345678",
      primaryCategory: "phone-laptop-repair",
      zone: "stage",
      landmark: "Hostel meeting point",
      serviceModes: ["comes_to_you"],
      description:
        "Campus products available for pickup at our hostel meeting point.",
      sellerType: "COMRADE",
      verificationVisitRequested: true,
      services: business.services,
      referralCode: field.id,
    };
    await req("/api/businesses", "POST", { ...draft, services: [] }, "", 400);
    const enrolled = await req("/api/businesses", "POST", draft, "", 201);
    check(
      enrolled.business.status === "PENDING" &&
        enrolled.business.verificationLevel === "L0" &&
        enrolled.business.ambassadorId === field.id,
      "hostel seller can request field verification without a signboard; referral tracked, badge awaits evidence",
    );
    const redirects = await fetch(`${base}/pro/${business.slug}`, {
      redirect: "manual",
    });
    check(
      redirects.status === 307 &&
        redirects.headers.get("location")?.includes("tab=billing"),
      "legacy Pro URL leads into the unified merchant checkout",
    );
    console.log(
      `${passed} campus value-loop checks passed. Browser fixture saved locally.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
