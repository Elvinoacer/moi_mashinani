import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { requireBusinessAccess } from "@/lib/auth";
import { apiError, ApiError, assertSameOrigin } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "market-refresh", 20);
    const { slug } = await params,
      business = await Store.getBusinessBySlug(slug);
    if (!business) throw new ApiError(404, "Listing not found");
    const user = await requireBusinessAccess(req, business);
    if (
      business.sellerType !== "COMRADE" ||
      business.status !== "ACTIVE" ||
      business.verificationLevel !== "L2"
    )
      throw new ApiError(
        409,
        "Refresh a reviewed, active student listing. Pending identity checks cannot be bypassed.",
      );
    const updated = await Store.updateBusiness(
      business.id,
      { listingExpiresAt: new Date(Date.now() + 30 * 864e5).toISOString() },
      user.id,
      {
        actorId: user.id,
        action: "MARKET_REFRESHED",
        details: "Seller reconfirmed their student catalogue for 30 days",
      },
    );
    return NextResponse.json(updated, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
