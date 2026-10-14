import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { requireBusinessAccess } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
export async function POST(
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
    await requireBusinessAccess(req, business);
    const body = req.headers.get("content-type")?.includes("application/json")
      ? await jsonBody(req)
      : {};
    if (body.enabled !== undefined && typeof body.enabled !== "boolean")
      throw new ApiError(400, "Invalid availability");
    const status =
      body.liveStatus !== undefined
        ? textField(body.liveStatus, "Live status", 40)
        : undefined;
    return NextResponse.json(
      await Store.toggleAvailableNow(
        business.id,
        4,
        status,
        body.enabled as boolean | undefined,
      ),
    );
  } catch (error) {
    return apiError(error);
  }
}
