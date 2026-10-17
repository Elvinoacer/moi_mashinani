import { survivalMatch } from "@/lib/campus-value";
import { hasPro } from "@/lib/catalog-plan";
import { whatsappUrl } from "@/lib/whatsapp";
import { computeRelevance } from "@/lib/rank";
import { randomBytes } from "node:crypto";
import { withNotificationDelivery } from "@/lib/notification-response";
import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashToken, requireAdmin } from "@/lib/auth";
import {
  apiError,
  ApiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { phoneField } from "@/lib/business-input";
import { ZONES, CATEGORIES } from "@/lib/constants";
import { rateLimit } from "@/lib/rate-limit";
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const requests = await Store.getServiceRequests();
    const live = requests.filter(
      (r) => !r.closedAt && Date.parse(r.createdAt) > Date.now() - 7 * 864e5,
    );
    return NextResponse.json(
      user?.role === "ADMIN"
        ? requests
        : live.map(({ contactPhone, ...safe }) => ({
            ...safe,
            canRespond: Boolean(contactPhone && safe.contactConsent),
          })),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "demand", 10);
    const body = await jsonBody(req);
    const zone = textField(body.zone, "Zone", 100) || "all";
    const category = textField(body.category, "Category", 100);
    if (zone !== "all" && !ZONES.some((z) => z.slug === zone))
      throw new ApiError(400, "Unknown zone");
    if (category && !CATEGORIES.some((c) => c.slug === category))
      throw new ApiError(400, "Unknown category");
    if (body.contactPhone && body.contactConsent !== true)
      throw new ApiError(
        400,
        "Allow verified sellers to respond on WhatsApp, or leave your phone blank.",
      );
    const manageToken = randomBytes(32).toString("hex");
    const created = await Store.createServiceRequest(
      {
        query: textField(body.query, "Service needed", 500, true),
        zone,
        category,
        contactPhone: body.contactPhone
          ? phoneField(body.contactPhone)
          : undefined,
        contactConsent: body.contactConsent === true,
      },
      hashToken(manageToken),
    );
    const { contactPhone, ...safe } = created;
    void contactPhone;
    const now = Date.now();
    const refCode = `#MM-${created.id.slice(-4).toUpperCase()}`;
    const tierWeight = (b: Awaited<ReturnType<typeof Store.getBusinesses>>[number]) => {
      const tierActive = !b.tierEndsAt || Date.parse(b.tierEndsAt) > now;
      if (hasPro(b, now)) return 3;
      if (tierActive && b.activeTier === "FEATURED") return 2;
      if (tierActive && b.activeTier === "RECOMMENDED") return 1;
      return 0;
    };
    const handoffs = (await Store.getBusinesses())
      .filter(
        (b) =>
          survivalMatch(b, "all", now) &&
          b.verificationLevel === "L2" &&
          (zone === "all" || b.zone === zone || b.servesZones.includes(zone)) &&
          (category
            ? b.primaryCategory === category ||
              b.extraCategories.includes(category)
            : computeRelevance(b, created.query) >= 0.25),
      )
      .sort((a, b) => {
        const diff = tierWeight(b) - tierWeight(a);
        if (diff !== 0) return diff;
        return (
          computeRelevance(b, created.query) -
          computeRelevance(a, created.query)
        );
      })
      .slice(0, 5)
      .map((b) => ({
        name: b.name,
        businessId: b.id,
        isPro: tierWeight(b) > 0,
        url: whatsappUrl(
          b.whatsapp || b.phone,
          `I posted this request on Moi Mashinani (${refCode}): ${created.query}. Zone: ${zone}. Can you help with the price and availability?`,
        ),
      }))
      .filter((b) => b.url);
    return withNotificationDelivery(
      NextResponse.json({ ...safe, manageToken, handoffs }, { status: 201 }),
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const body = await jsonBody(req);
    const id = textField(body.id, "Request ID", 100, true);
    const token = textField(body.manageToken, "Request receipt", 64, true);
    const result = await prisma.serviceRequest.updateMany({
      where: { id, manageTokenHash: hashToken(token) },
      data: { closedAt: new Date() },
    });
    if (!result.count)
      throw new ApiError(
        403,
        "Use the browser where you posted this request to close it.",
      );
    return NextResponse.json({ closed: true });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await requireAdmin(req);
    const body = await jsonBody(req);
    const id = textField(body.id, "Request ID", 100, true);
    const result = await prisma.serviceRequest.deleteMany({ where: { id } });
    if (!result.count) throw new ApiError(404, "Demand request not found");
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
