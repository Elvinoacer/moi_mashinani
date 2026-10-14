import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { prisma } from "@/lib/prisma";
import { requireBusinessAccess } from "@/lib/auth";
import { ApiError, apiError } from "@/lib/api";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await props.params;
    const business = await Store.getBusinessBySlug(slug);
    if (!business) throw new ApiError(404, "Business not found");
    await requireBusinessAccess(req, business);
    return NextResponse.json(
      await prisma.businessEvent.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
