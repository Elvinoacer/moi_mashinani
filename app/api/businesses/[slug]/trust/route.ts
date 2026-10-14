import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ApiError, apiError } from "@/lib/api";
export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await props.params;
    const business = await prisma.business.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        verificationLevel: true,
        sellerType: true,
        landmark: true,
      },
    });
    if (!business || business.status !== "ACTIVE")
      throw new ApiError(404, "Business not found");
    const [check, reports] = await Promise.all([
      prisma.businessAudit.findFirst({
        where: {
          businessId: business.id,
          action: {
            in: ["FIELD_ENROLLED", "FIELD_VERIFIED", "TOGGLE_VERIFIED"],
          },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      prisma.problemReport.count({
        where: { businessId: business.id, status: "OPEN", reason: "scam" },
      }),
    ]);
    return NextResponse.json(
      {
        level: business.verificationLevel,
        sellerType: business.sellerType,
        landmark: business.landmark,
        lastCheckedAt: check?.createdAt,
        openScamReports: reports,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
