import { randomBytes } from "node:crypto";
import { withNotificationDelivery } from "@/lib/notification-response";
import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashToken } from "@/lib/auth";
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
    return withNotificationDelivery(
      NextResponse.json({ ...safe, manageToken }, { status: 201 }),
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
