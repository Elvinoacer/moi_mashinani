import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError } from '@/lib/api';
import { getStorageUsage } from '@/lib/media-storage';
import { FREE_STORAGE_BYTES, FREE_PRODUCT_LIMIT, hasPro } from '@/lib/catalog-plan';

export async function GET(req: NextRequest, props: {params: Promise<{slug:string}>}) {
  try {
    const {slug} = await props.params;
    const business = await Store.getBusinessBySlug(slug);
    if (!business) throw new ApiError(404, 'Business not found');
    await requireBusinessAccess(req, business);
    const usage = await getStorageUsage(business.id);
    const pro = hasPro(business);
    return NextResponse.json({...usage,plan:pro ? 'PRO' : 'FREE',productCount:business.services.length,productLimit:pro ? null : FREE_PRODUCT_LIMIT,storageLimit:pro ? null : FREE_STORAGE_BYTES,proEndsAt:business.proEndsAt ?? null},{headers:{'Cache-Control':'private, no-store'}});
  } catch (error) { return apiError(error); }
}
