import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { queueNotice } from "@/lib/notifications";
import { publicBusiness } from "@/lib/business-input";
import { Store } from "@/lib/store";
import { enrollBusiness } from "@/lib/enrollment";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { ENROLLMENT_MEDIA_COOKIE } from "@/lib/enrollment-media";
import { withNotificationDelivery } from "@/lib/notification-response";
async function fieldUser(req: NextRequest) {
  const user = await requireUser(req);
  if (!["ADMIN", "AMBASSADOR"].includes(user.role))
    throw new ApiError(
      403,
      "An appointed field ambassador account is required.",
    );
  return user;
}
export async function GET(req: NextRequest) {
  try {
    const user = await fieldUser(req);
    const zone = req.nextUrl.searchParams.get("zone") || "all";
    const tasks = await prisma.business.findMany({
      where: {
        verificationVisitRequested: true,
        status: { in: ["PENDING", "ACTIVE"] },
        ...(zone === "all" ? {} : { zone }),
      },
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    const proofs = await prisma.verificationProof.findMany({
      where: { businessId: { in: tasks.map((b) => b.id) } },
      select: { id: true, businessId: true },
    });
    const today = new Date(
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()) + "T00:00:00+03:00",
    );
    const audits = await prisma.businessAudit.findMany({
      where: {
        actorId: user.id,
        action: { in: ["FIELD_ENROLLED", "FIELD_VERIFIED"] },
        createdAt: { gte: today },
      },
      select: { businessId: true },
    });
    const ids = [...new Set(audits.map((a) => a.businessId))];
    const completed = await prisma.business.count({
      where: { id: { in: ids }, ...(zone === "all" ? {} : { zone }) },
    });
    const attributedBusinesses = await prisma.business.findMany({
      where: { ambassadorId: user.id },
      select: { id: true },
    });
    const attributedIds = attributedBusinesses.map((b) => b.id);
    const completedPayments = attributedIds.length
      ? await prisma.paymentRecord.findMany({
          where: { businessId: { in: attributedIds }, state: "COMPLETE" },
          orderBy: { createdAt: "asc" },
          select: { businessId: true, amountKes: true },
        })
      : [];
    const seenBusiness = new Set<string>();
    let attributedRevenueKes = 0;
    let commissionEarnedKes = 0;
    for (const p of completedPayments) {
      attributedRevenueKes += p.amountKes;
      const isFirst = !seenBusiness.has(p.businessId);
      seenBusiness.add(p.businessId);
      commissionEarnedKes += Math.round(p.amountKes * (isFirst ? 0.25 : 0.1));
    }
    return NextResponse.json(
      {
        referralCode: user.id,
        completed,
        enrolledCount: attributedIds.length,
        paidConversions: seenBusiness.size,
        attributedRevenueKes,
        commissionEarnedKes,
        tasks: tasks.map((b) => ({
          id: b.id,
          name: b.name,
          zone: b.zone,
          landmark: b.landmark,
          sellerType: b.sellerType,
          photos: b.photos,
          proofId: proofs.find((p) => p.businessId === b.id)?.id,
          status: b.status,
        })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await fieldUser(req);
    return withNotificationDelivery(
      NextResponse.json(
        await enrollBusiness(
          await jsonBody(req),
          true,
          user.id,
          req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value,
        ),
        { status: 201 },
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await fieldUser(req);
    const body = await jsonBody(req);
    const id = textField(body.businessId, "Business", 100, true);
    const evidence = textField(body.evidence, "Evidence", 500, true);
    if (
      evidence.length < 12 ||
      body.locationChecked !== true ||
      body.identityChecked !== true ||
      body.ownerConsent !== true
    )
      throw new ApiError(
        400,
        "Check location, shop/student identity and owner consent, then describe evidence.",
      );
    const business = await Store.getBusinessById(id);
    if (
      !business ||
      !business.verificationVisitRequested ||
      !["PENDING", "ACTIVE"].includes(business.status)
    )
      throw new ApiError(409, "This visit is no longer in the field queue.");
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${id} FOR UPDATE`;
      const current = await tx.business.findUnique({ where: { id } });
      if (
        !current?.verificationVisitRequested ||
        !["PENDING", "ACTIVE"].includes(current.status)
      )
        throw new ApiError(
          409,
          "Another field worker already completed this visit.",
        );
      await tx.business.update({
        where: { id },
        data: {
          verificationLevel: "L2",
          verificationVisitRequested: false,
          ambassadorId: user.id,
        },
      });
      await tx.businessAudit.create({
        data: {
          businessId: id,
          actorId: user.id,
          action: "FIELD_VERIFIED",
          details: evidence,
        },
      });
      await queueNotice(tx, current.ownerId, `field/${id}/${Date.now()}`, {
        kind: "VERIFICATION",
        title: "Your field verification is complete",
        body: "Identity and location were checked. A pending listing still needs ownership acceptance and administrator approval.",
        path: `/dashboard/${current.slug}`,
        button: "View your shop",
      });
    });
    const updated = await Store.getBusinessById(id);
    return withNotificationDelivery(
      NextResponse.json({ business: updated ? publicBusiness(updated) : null }),
    );
  } catch (error) {
    return apiError(error);
  }
}
