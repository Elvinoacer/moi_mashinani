import { randomBytes } from "node:crypto";
import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma/client";
import { hashToken } from "./auth";
import { ApiError } from "./api";
import { whatsappUrl } from "./whatsapp";
import { LIVE_HOURS } from "./campus-value";
import { applicationUrl } from "./mail";
export async function createMerchantAction(
  tx: Prisma.TransactionClient,
  business: { id: string; ownerId: string | null; isClaimed?: boolean },
  kind: "OPEN" | "REQUEST" | "BOOKING",
  resourceId?: string,
) {
  if (!business.ownerId || business.isClaimed === false) return undefined;
  const token = randomBytes(32).toString("hex");
  await tx.merchantAction.create({
    data: {
      tokenHash: hashToken(token),
      businessId: business.id,
      ownerId: business.ownerId,
      kind,
      resourceId,
      expiresAt: new Date(Date.now() + (kind === "OPEN" ? 12 : 24) * 3600000),
    },
  });
  return `/merchant/action/${token}`;
}
export async function merchantActionPreview(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token))
    throw new ApiError(404, "Action link unavailable.");
  const action = await prisma.merchantAction.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!action || action.usedAt || action.expiresAt <= new Date())
    throw new ApiError(410, "This link expired or was already used.");
  const business = await prisma.business.findUnique({
    where: { id: action.businessId },
  });
  if (
    !business ||
    business.ownerId !== action.ownerId ||
    !business.isClaimed ||
    business.status !== "ACTIVE"
  )
    throw new ApiError(403, "This listing can no longer use the link.");
  return { action, business };
}
export async function consumeMerchantAction(token: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "MerchantAction" WHERE "tokenHash" = ${hashToken(token)} FOR UPDATE`;
    const action = await tx.merchantAction.findUnique({
      where: { tokenHash: hashToken(token) },
    });
    if (!action || action.usedAt || action.expiresAt <= new Date())
      throw new ApiError(410, "This link expired or was already used.");
    await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${action.businessId} FOR UPDATE`;
    const business = await tx.business.findUnique({
      where: { id: action.businessId },
    });
    if (
      !business ||
      business.ownerId !== action.ownerId ||
      business.status !== "ACTIVE" ||
      !business.isClaimed
    )
      throw new ApiError(403, "This listing can no longer use the link.");
    let url: string | undefined;
    if (action.kind === "OPEN") {
      if (business.isTemporarilyClosed)
        throw new ApiError(
          409,
          "Reopen your listing from the dashboard first.",
        );
      await tx.business.update({
        where: { id: business.id },
        data: {
          availabilityConfirmedAt: new Date(),
          availableNowUntil: new Date(Date.now() + LIVE_HOURS * 3600000),
        },
      });
    } else if (action.kind === "REQUEST") {
      if (business.verificationLevel !== "L2" || business.isTemporarilyClosed)
        throw new ApiError(403, "An active verified seller is required.");
      await tx.$queryRaw`SELECT "id" FROM "ServiceRequest" WHERE "id" = ${action.resourceId || ""} FOR UPDATE`;
      const request = await tx.serviceRequest.findUnique({
        where: { id: action.resourceId || "" },
      });
      if (
        !request ||
        request.closedAt ||
        request.createdAt.getTime() <= Date.now() - 7 * 864e5 ||
        !request.contactConsent ||
        !request.contactPhone
      )
        throw new ApiError(410, "The student request is no longer available.");
      const refCode = `#MM-${request.id.slice(-4).toUpperCase()}`;
      url = whatsappUrl(
        request.contactPhone,
        `Hi! I run ${business.name}. I saw your Moi Mashinani request (${refCode}): ${request.query}. My price list: ${applicationUrl()}/b/${business.slug}. What price and pickup time work for you?`,
      );
    } else if (action.kind === "BOOKING") {
      await tx.$queryRaw`SELECT "id" FROM "BookingIntent" WHERE "id" = ${action.resourceId || ""} FOR UPDATE`;
      const booking = await tx.bookingIntent.findUnique({
        where: { id: action.resourceId || "" },
      });
      if (
        !booking ||
        booking.businessId !== business.id ||
        booking.status !== "NEW" ||
        !booking.contactPhone ||
        business.isTemporarilyClosed
      )
        throw new ApiError(410, "The booking is no longer awaiting a reply.");
      await tx.bookingIntent.update({
        where: { id: booking.id },
        data: { status: "CONFIRMED" },
      });
      const refCode = `#MM-${booking.id.slice(-4).toUpperCase()}`;
      url = whatsappUrl(
        booking.contactPhone,
        `Hi ${booking.studentName}! ${business.name} has accepted your request (${refCode}) for ${booking.serviceName} on ${booking.day} at ${booking.time}. Let’s confirm the price and details. Found through Moi Mashinani.`,
      );
    } else throw new ApiError(400, "Unknown merchant action.");
    await tx.merchantAction.update({
      where: { id: action.id },
      data: { usedAt: new Date() },
    });
    await tx.businessEvent.create({
      data: {
        businessId: business.id,
        type: action.kind === "OPEN" ? "open_confirmed" : "merchant_reply",
      },
    });
    if (action.kind === "REQUEST" || action.kind === "BOOKING") {
      await tx.$executeRaw`
        UPDATE "Business" SET "metrics" = jsonb_set("metrics"::jsonb, '{whatsapp}',
          to_jsonb(COALESCE(("metrics"->>'whatsapp')::int, 0) + 1)), "updatedAt" = NOW() WHERE "id" = ${business.id}`;
    }
    return {
      done: true,
      url,
      message:
        action.kind === "OPEN"
          ? "Your open status is confirmed for four hours."
          : "Reply ready. Send the message in WhatsApp.",
    };
  });
}
