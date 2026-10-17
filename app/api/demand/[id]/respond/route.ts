import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Store } from "@/lib/store";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";

const FREE_MONTHLY_REQUEST_REPLIES = 3;

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "request-response", 30);
    const user = await requireUser(req);
    const { id } = await props.params;
    const body = await jsonBody(req);
    const business = await prisma.business.findFirst({
      where: {
        id: textField(body.businessId, "Business", 100, true),
        ownerId: user.id,
        isClaimed: true,
        status: "ACTIVE",
        verificationLevel: "L2",
        isTemporarilyClosed: false,
      },
    });
    if (!business)
      throw new ApiError(
        403,
        "Respond using an active, verified business that you own.",
      );
    const request = await prisma.serviceRequest.findUnique({ where: { id } });
    if (
      !request ||
      request.closedAt ||
      request.createdAt.getTime() < Date.now() - 7 * 864e5
    )
      throw new ApiError(404, "This request has ended.");
    if (!request.contactPhone || !request.contactConsent)
      throw new ApiError(409, "This student has not enabled WhatsApp replies.");

    const now = new Date();
    const isProActive = Boolean(business.proEndsAt && business.proEndsAt > now);
    const isBoostActive = Boolean(
      (business.activeTier === "RECOMMENDED" ||
        business.activeTier === "FEATURED") &&
        business.tierEndsAt &&
        business.tierEndsAt > now,
    );

    if (!isProActive && !isBoostActive) {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 864e5);
      const usedReplies = await prisma.businessEvent.count({
        where: {
          businessId: business.id,
          type: "merchant_reply",
          createdAt: { gte: thirtyDaysAgo },
        },
      });
      if (usedReplies >= FREE_MONTHLY_REQUEST_REPLIES) {
        throw new ApiError(
          402,
          `Free listings include ${FREE_MONTHLY_REQUEST_REPLIES} student request leads per month. Upgrade to Recommended (from KES 50/wk for Comrades or KES 100/wk) or Moi Mashinani Pro for unlimited instant student leads.`,
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.businessEvent.create({
        data: {
          businessId: business.id,
          type: "merchant_reply",
        },
      });
      await Store.recordEvent(business.id, "whatsapp", tx);
    });

    const refCode = `#MM-${request.id.slice(-4).toUpperCase()}`;
    const text = `Hi! I run ${business.name}. I saw your request on Moi Mashinani (${refCode}): ${request.query}. Here is my business and price list: ${new URL("/b/" + business.slug, req.url).href}. How can I help?`;
    return NextResponse.json(
      {
        url: `https://wa.me/${request.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
        refCode,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
