import { publicListing } from "@/lib/campus-value";
import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { getCurrentUser, requireBusinessAccess } from "@/lib/auth";
import { ApiError, apiError, assertSameOrigin, jsonBody } from "@/lib/api";
import { businessInput, publicBusiness } from "@/lib/business-input";
import {
  cleanRemovedMedia,
  hostedMediaUrl,
  mediaReferences,
} from "@/lib/media-storage";
export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await props.params;
    const business =
      (await Store.getBusinessBySlug(slug)) ||
      (await Store.getBusinessById(slug));
    if (!business) throw new ApiError(404, "Business not found");
    const user = await getCurrentUser(req);
    const canManage =
      req.nextUrl.searchParams.get("public") !== "1" &&
      user &&
      (user.role === "ADMIN" ||
        (user.id === business.ownerId && business.isClaimed));
    if (!publicListing(business, Date.now()) && !canManage)
      throw new ApiError(404, "Business not found");
    return NextResponse.json(canManage ? business : publicBusiness(business), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> },
) {
  try {
    assertSameOrigin(req);
    const { slug } = await props.params;
    const business =
      (await Store.getBusinessBySlug(slug)) ||
      (await Store.getBusinessById(slug));
    if (!business) throw new ApiError(404, "Business not found");
    const user = await requireBusinessAccess(req, business);
    const body = await jsonBody(req);
    const fields = businessInput(body, true);
    if (!Object.keys(fields).length)
      throw new ApiError(400, "No editable business details were supplied");
    const locationCandidate = { ...business, ...fields };
    if (
      (!locationCandidate.landmark?.trim() ||
        locationCandidate.landmark === "Location shown on map") &&
      !locationCandidate.mapPin
    )
      throw new ApiError(
        400,
        "Keep a nearby landmark or a map pin so students can find this business.",
      );
    const before = mediaReferences(business);
    const proposed = mediaReferences({ ...business, ...fields });
    if (proposed.some((url) => !before.includes(url) && !hostedMediaUrl(url)))
      throw new ApiError(400, "Use a photo uploaded through MoiMashinani");
    // Changes to paid tiers, ownership, verification and moderation are never accepted here.
    const updated = await Store.updateBusiness(business.id, fields, user.id);
    const mediaCleanup = updated
      ? await cleanRemovedMedia(business.id)
      : undefined;
    return NextResponse.json({ ...updated, mediaCleanup });
  } catch (error) {
    return apiError(error);
  }
}
