import { withNotificationDelivery } from "@/lib/notification-response";
import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { comparisonPrice } from "@/lib/catalog-plan";
import { survivalMatch } from "@/lib/campus-value";
import { rankBusinesses, sortRankedBusinesses } from "@/lib/rank";
import { randomUUID } from "node:crypto";
import { getCurrentUser, requireAdmin } from "@/lib/auth";
import { apiError, assertSameOrigin, jsonBody } from "@/lib/api";
import { publicBusiness } from "@/lib/business-input";
import { enrollBusiness } from "@/lib/enrollment";
import { rateLimit } from "@/lib/rate-limit";
import { normalizeEmail } from "@/lib/auth";
import { ENROLLMENT_MEDIA_COOKIE } from "@/lib/enrollment-media";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    const zone = searchParams.get("zone") || "all";
    const category = searchParams.get("category") || undefined;
    const availableNowOnly = searchParams.get("availableNow") === "true";
    const verifiedOnly = searchParams.get("verified") === "true";
    const hasDiscountsOnly = searchParams.get("discount") === "true";
    const sort = searchParams.get("sort") || "best_match";
    const existingSession = req.cookies.get("mashinani_discovery")?.value;
    const suppliedSession = searchParams.get("sessionId")?.slice(0, 128);
    const sessionId = suppliedSession || existingSession || randomUUID();

    let businesses = await Store.getBusinesses();

    // If filtering for admin or special requests
    const statusFilter = searchParams.get("status");
    if (statusFilter && statusFilter !== "ACTIVE") {
      await requireAdmin(req);
      if (statusFilter !== "all") {
        businesses = businesses.filter((b) => b.status === statusFilter);
      }
      return NextResponse.json({
        results: businesses,
        total: businesses.length,
      });
    }

    businesses = businesses.filter((b) => survivalMatch(b, searchParams.get("survival") || "all", Date.now()));

    // Pre-filters
    if (availableNowOnly) {
      const now = Date.now();
      businesses = businesses.filter(
        (b) =>
          !b.isTemporarilyClosed &&
          b.availableNowUntil &&
          new Date(b.availableNowUntil).getTime() > now,
      );
    }

    if (searchParams.get("delivery") === "true")
      businesses = businesses.filter((b) =>
        b.serviceModes.includes("delivery"),
      );
    if (verifiedOnly) {
      businesses = businesses.filter((b) => b.verificationLevel === "L2");
    }

    if (hasDiscountsOnly) {
      businesses = businesses.filter((b) => Boolean(b.studentDiscount));
    }

    // Rank public catalogue data without exposing owner or moderation fields.
    businesses = businesses.map(publicBusiness);

    const priceCap = searchParams.get("maxPrice");
    if (priceCap && /^\d+(?:\.\d{1,2})?$/.test(priceCap))
      businesses = businesses.filter(
        (b) => comparisonPrice(b, q) <= Number(priceCap),
      );
    // Run official ranking engine
    const ranked = rankBusinesses(
      businesses,
      q,
      zone,
      category,
      undefined,
      sessionId,
    );

    // Sorting must not turn hundreds of Featured listings into a permanent
    // wall above Recommended businesses and all organic results.
    const finalCandidates = sortRankedBusinesses(ranked, sort, q);

    const results = finalCandidates.map((c) => ({
      ...publicBusiness(c.business),
      effectiveTier: c.effectiveTier,
      relevanceScore: c.relevance,
      proximityScore: c.proximity,
      totalRankScore: c.totalScore,
    }));

    // A response is not an impression. Public cards report actual viewport
    // exposure through /api/events, including cards discovered after scrolling.
    const response = NextResponse.json({
      results,
      total: results.length,
      query: q,
      zone,
      category,
    });
    response.headers.set("Cache-Control", "private, no-store");
    if (!suppliedSession && !existingSession) {
      response.cookies.set("mashinani_discovery", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 86_400,
      });
    }
    return response;
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "public-enrollment", 30, 3600);
    const body = await jsonBody(req);
    const user = await getCurrentUser(req);
    await rateLimit(
      req,
      "public-enrollment-email",
      3,
      3600,
      user?.id || normalizeEmail(body.ownerEmail),
    );
    const result = await enrollBusiness(
      body,
      false,
      user?.id,
      req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value,
    );
    const response = NextResponse.json(
      { ...result, slug: result.business?.slug },
      { status: 201 },
    );
    return withNotificationDelivery(response);
  } catch (error) {
    return apiError(error);
  }
}
