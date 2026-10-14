import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
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
    const text = `Hi! I run ${business.name}. I saw your request on Moi Mashinani: ${request.query}. Here is my business and price list: ${new URL("/b/" + business.slug, req.url).href}. How can I help?`;
    return NextResponse.json(
      {
        url: `https://wa.me/${request.contactPhone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
