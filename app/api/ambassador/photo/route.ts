import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { publicBusiness } from "@/lib/business-input";
import { Store } from "@/lib/store";
import {
  ENROLLMENT_MEDIA_COOKIE,
  claimEnrollmentMedia,
} from "@/lib/enrollment-media";
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const user = await requireUser(req);
    if (!["ADMIN", "AMBASSADOR"].includes(user.role))
      throw new ApiError(403, "Field access required");
    const body = await jsonBody(req);
    const id = textField(body.businessId, "Business", 100, true);
    if (body.ownerConsent !== true)
      throw new ApiError(
        400,
        "Confirm owner consent before attaching a public field photo.",
      );
    const photo = textField(body.photo, "Signboard photo", 1500, true);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${id} FOR UPDATE`;
      const business = await tx.business.findUnique({ where: { id } });
      if (!business?.verificationVisitRequested || !business.ownerId)
        throw new ApiError(409, "This verification visit has ended");
      if (business.photos.length >= 8)
        throw new ApiError(
          409,
          "This gallery is full. Ask the owner to remove an unused photo first.",
        );
      await claimEnrollmentMedia(
        tx,
        req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value,
        [photo],
        business.ownerId,
        id,
      );
      const photos = [...business.photos, photo];
      await tx.business.update({
        where: { id },
        data: { photos, coverPhoto: business.coverPhoto || photo },
      });
      await tx.businessAudit.create({
        data: {
          businessId: id,
          actorId: user.id,
          action: "FIELD_PHOTO",
          details: "Shop/product photo captured with owner consent",
        },
      });
    });
    const business = await Store.getBusinessById(id);
    return NextResponse.json({
      business: business ? publicBusiness(business) : null,
    });
  } catch (error) {
    return apiError(error);
  }
}
