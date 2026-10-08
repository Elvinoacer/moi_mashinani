import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { rankBusinesses } from '@/lib/rank';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  const zone = searchParams.get('zone') || 'all';
  const category = searchParams.get('category') || undefined;
  const availableNowOnly = searchParams.get('availableNow') === 'true';
  const verifiedOnly = searchParams.get('verified') === 'true';
  const hasDiscountsOnly = searchParams.get('discount') === 'true';
  const sort = searchParams.get('sort') || 'best_match';
  const sessionId = searchParams.get('sessionId') || 'session_client';

  let businesses = Store.getBusinesses();

  // If filtering for admin or special requests
  const statusFilter = searchParams.get('status');
  if (statusFilter) {
    if (statusFilter !== 'all') {
      businesses = businesses.filter((b) => b.status === statusFilter);
    }
    return NextResponse.json({ results: businesses, total: businesses.length });
  }

  // Pre-filters
  if (availableNowOnly) {
    const now = Date.now();
    businesses = businesses.filter(
      (b) => b.availableNowUntil && new Date(b.availableNowUntil).getTime() > now
    );
  }

  if (verifiedOnly) {
    businesses = businesses.filter((b) => b.verificationLevel === 'L2');
  }

  if (hasDiscountsOnly) {
    businesses = businesses.filter((b) => Boolean(b.studentDiscount));
  }

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
    ...c.business,
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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = Store.createBusiness(body);
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error('Error creating business:', err);
    return NextResponse.json({ error: 'Failed to create business' }, { status: 400 });
  }
}
