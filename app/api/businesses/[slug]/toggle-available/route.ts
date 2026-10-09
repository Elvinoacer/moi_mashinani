import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin } from '@/lib/api';
export async function POST(req:NextRequest,props:{params:Promise<{slug:string}>}) {
  try {
    assertSameOrigin(req);
    const {slug} = await props.params;
    const business = await Store.getBusinessBySlug(slug) || await Store.getBusinessById(slug);
    if (!business) throw new ApiError(404,'Business not found');
    await requireBusinessAccess(req,business);
    return NextResponse.json(await Store.toggleAvailableNow(business.id));
  } catch(error) { return apiError(error); }
}
