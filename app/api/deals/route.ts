import { survivalMatch } from "@/lib/campus-value";
import { NextRequest, NextResponse } from "next/server";
import {
  apiError,
  ApiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { activeFlashDeals } from "@/lib/flash-deals";
import { prisma } from "@/lib/prisma";
import { Store } from "@/lib/store";
import { requireBusinessAccess } from "@/lib/auth";
import { ZONES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
import { withNotificationDelivery } from "@/lib/notification-response";
import {
  isEligibleBroadcastPlan,
  queueCampusBroadcast,
} from "@/lib/public-push";
export async function GET() {
  try {
    return NextResponse.json(await activeFlashDeals(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "create-deal", 20);
    const body = await jsonBody(req);
    const business = await Store.getBusinessById(
      textField(body.businessId, "Business", 100, true),
    );
    if (!business) throw new ApiError(404, "Business not found");
    await requireBusinessAccess(req, business);
    if (!survivalMatch(business, "all", Date.now()))
      throw new ApiError(409, "Publish deals from an active listing.");
    const title = textField(body.title, "Deal title", 150, true),
      endsAt = new Date(textField(body.endsAt, "End time", 40, true));
    if (
      !Number.isInteger(body.priceKes) ||
      Number(body.priceKes) < 0 ||
      Number(body.priceKes) > 10000000
    )
      throw new ApiError(400, "Enter a valid whole-shilling deal price");
    if (
      !Number.isFinite(endsAt.getTime()) ||
      endsAt <= new Date() ||
      endsAt.getTime() > Date.now() + 7 * 864e5
    )
      throw new ApiError(
        400,
        "A flash deal must end within the next seven days",
      );
    const dropZone = textField(body.dropZone, "Delivery zone", 100);
    let dropAt: Date | undefined;
    if (dropZone) {
      if (
        !ZONES.some((z) => z.slug === dropZone && z.slug !== "all") ||
        !business.serviceModes.includes("delivery") ||
        (business.zone !== dropZone && !business.servesZones.includes(dropZone))
      )
        throw new ApiError(
          400,
          "Choose a zone served by your delivery business",
        );
      dropAt = new Date(textField(body.dropAt, "Delivery time", 40, true));
      if (
        !Number.isFinite(dropAt.getTime()) ||
        dropAt <= new Date() ||
        dropAt < endsAt ||
        dropAt.getTime() > Date.now() + 7 * 864e5
      )
        throw new ApiError(
          400,
          "Delivery must be after order cutoff and within seven days",
        );
      if (
        !Number.isInteger(body.deliveryFeeKes) ||
        Number(body.deliveryFeeKes) < 0 ||
        Number(body.deliveryFeeKes) > 100000
      )
        throw new ApiError(400, "Enter the per-order delivery fee");
    } else if (body.dropAt || body.deliveryFeeKes !== undefined)
      throw new ApiError(400, "Choose a delivery zone for a drop");
    const broadcastEligible = isEligibleBroadcastPlan({
      proEndsAt: business.proEndsAt,
      featuredUntil: business.tierEndsAt,
      dealBlastEndsAt: business.dealBlastEndsAt,
      activeTier: business.activeTier,
    });
    const dropZoneName = dropZone
      ? ZONES.find((z) => z.slug === dropZone)?.name || dropZone
      : "";
    const { deal, matchedDevices } = await prisma.$transaction(async (tx) => {
      const createdDeal = await tx.flashDeal.create({
        data: {
          businessId: business.id,
          title,
          priceKes: Number(body.priceKes),
          endsAt,
          dropZone: dropZone || null,
          dropAt,
          deliveryFeeKes: dropZone ? Number(body.deliveryFeeKes) : null,
        },
      });
      let count = 0;
      if (broadcastEligible) {
        const res = await queueCampusBroadcast(tx, {
          excludeAccountId: business.ownerId,
          eventKey: `flash-deal/${createdDeal.id}`,
          content: {
            kind: "DEAL",
            title: `${business.name}: ${title}`,
            body: `KES ${Number(body.priceKes).toLocaleString("en-KE")}${dropZoneName ? ` · Delivery drop to ${dropZoneName}` : ""} — tap to claim before it ends.`,
            path: "/deals",
            button: "View flash deal",
          },
          filter: {
            zone: dropZone || business.zone,
            servesZones: business.servesZones,
            businessId: business.id,
            category: business.primaryCategory,
            text: `${business.name} ${title}`,
          },
        });
        count = res.matchedDevices;
      }
      return { deal: createdDeal, matchedDevices: count };
    });
    const response = NextResponse.json(
      { id: deal.id, broadcastEligible, matchedDevices },
      { status: 201 },
    );
    return broadcastEligible && matchedDevices > 0
      ? withNotificationDelivery(response)
      : response;
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await jsonBody(req);
    const deal = await prisma.flashDeal.findUnique({
      where: { id: textField(body.id, "Deal", 100, true) },
    });
    if (!deal) throw new ApiError(404, "Deal not found");
    const business = await Store.getBusinessById(deal.businessId);
    if (!business) throw new ApiError(404, "Business not found");
    await requireBusinessAccess(req, business);
    await prisma.flashDeal.update({
      where: { id: deal.id },
      data: { closedAt: new Date() },
    });
    return NextResponse.json({ closed: true });
  } catch (error) {
    return apiError(error);
  }
}
