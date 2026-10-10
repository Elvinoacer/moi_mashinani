import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError } from '@/lib/api';

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await props.params;
    const business = await Store.getBusinessBySlug(slug) || await Store.getBusinessById(slug);
    if (!business) throw new ApiError(404, 'Business not found');
    await requireBusinessAccess(req, business);
    return NextResponse.json(business.metrics, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiError(error); }
}
