import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { rankBusinesses } from '@/lib/rank';
import { requireAdmin } from '@/lib/auth';
import { apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { publicBusiness } from '@/lib/business-input';
import { enrollBusiness } from '@/lib/enrollment';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const zone = searchParams.get('zone') || 'all';
  const category = searchParams.get('category') || undefined;
  const availableNowOnly = searchParams.get('availableNow') === 'true';
  const verifiedOnly = searchParams.get('verified') === 'true';
  const hasDiscountsOnly = searchParams.get('discount') === 'true';
  const sort = searchParams.get('sort') || 'best_match';
  const sessionId = searchParams.get('sessionId') || 'session_client';

  let businesses = await Store.getBusinesses();

  // If filtering for admin or special requests
  const statusFilter = searchParams.get('status');
  if (statusFilter && statusFilter !== 'ACTIVE') {
    await requireAdmin(req);
    if (statusFilter !== 'all') {
      businesses = businesses.filter((b) => b.status === statusFilter);
    }
    return NextResponse.json({ results: businesses, total: businesses.length });
  }

  businesses = businesses.filter(b => b.status === 'ACTIVE');

  // Pre-filters
  if (availableNowOnly) {
    const now = Date.now();
    businesses = businesses.filter(
      (b) => !b.isTemporarilyClosed && b.availableNowUntil && new Date(b.availableNowUntil).getTime() > now
    );
  }

  if (verifiedOnly) {
    businesses = businesses.filter((b) => b.verificationLevel === 'L2');
  }

  if (hasDiscountsOnly) {
    businesses = businesses.filter((b) => Boolean(b.studentDiscount));
  }

  // Hidden saved products must not influence public search after Pro expires.
  businesses = businesses.map(publicBusiness);

  // Run official ranking engine
  const ranked = rankBusinesses(businesses, q, zone, category, undefined, sessionId);

  // If explicit sort selected
  let finalCandidates = ranked;
  if (sort === 'nearest') {
    finalCandidates = [...ranked].sort((a, b) => b.proximity - a.proximity);
  } else if (sort === 'newest') {
    finalCandidates = [...ranked].sort(
      (a, b) => new Date(b.business.createdAt).getTime() - new Date(a.business.createdAt).getTime()
    );
  }

  const results = finalCandidates.map((c) => ({
    ...publicBusiness(c.business),
    effectiveTier: c.effectiveTier,
    relevanceScore: c.relevance,
    proximityScore: c.proximity,
    totalRankScore: c.totalScore,
  }));

  return NextResponse.json({
    results,
    total: results.length,
    query: q,
    zone,
    category,
  });
  } catch(error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req,'public-enrollment',5,3600);
    const result = await enrollBusiness(await jsonBody(req));
    return NextResponse.json({...result,slug:result.business?.slug},{status:201});
  } catch(error) { return apiError(error); }
}
