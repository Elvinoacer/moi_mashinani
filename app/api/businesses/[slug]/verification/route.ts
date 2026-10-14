import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Store } from "@/lib/store";
import { requireBusinessAccess } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import {
  enrollmentMediaHash,
  ENROLLMENT_MEDIA_COOKIE,
} from "@/lib/enrollment-media";
import { withNotificationDelivery } from "@/lib/notification-response";
import { queueAdmins } from "@/lib/notifications";
async function access(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  const { slug } = await props.params;
  const business = await Store.getBusinessBySlug(slug);
  if (!business) throw new ApiError(404, "Business not found");
  await requireBusinessAccess(req, business);
  return business;
}
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const b = await access(req, props);
    const proof = await prisma.verificationProof.findUnique({
      where: { businessId: b.id },
      select: { id: true },
    });
    return NextResponse.json(
      { proofId: proof?.id },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(req);
    const b = await access(req, props);
    const body = await jsonBody(req);
    const proofId = textField(body.proofId, "Private student ID", 100);
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id"=${b.id} FOR UPDATE`;
      if (proofId) {
        const proof = await tx.verificationProof.findFirst({
          where: {
            id: proofId,
            businessId: null,
            sessionHash:
              enrollmentMediaHash(
                req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value,
              ) || "",
            createdAt: { gt: new Date(Date.now() - 864e5) },
          },
        });
        if (!proof)
          throw new ApiError(403, "Reupload the student ID in this browser.");
        await tx.verificationProof.deleteMany({ where: { businessId: b.id } });
        await tx.verificationProof.update({
          where: { id: proof.id },
          data: { businessId: b.id },
        });
      }
      await tx.business.update({
        where: { id: b.id },
        data: { verificationVisitRequested: true },
      });
      await queueAdmins(tx, `visit/${b.id}/${Date.now()}`, {
        kind: "VERIFICATION",
        title: "Free verification visit requested",
        body: b.name,
        path: "/ambassador",
        button: "Open field queue",
      });
    });
    return withNotificationDelivery(NextResponse.json({ requested: true }));
  } catch (error) {
    return apiError(error);
  }
}
