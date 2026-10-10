import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';
import { getCurrentUser, requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { businessInput, publicBusiness } from '@/lib/business-input';
import { cleanRemovedMedia } from '@/lib/media-storage';
export async function GET(req:NextRequest,props:{params:Promise<{slug:string}>}) {
  try {
    const {slug} = await props.params;
    const business = await Store.getBusinessBySlug(slug) || await Store.getBusinessById(slug);
    if (!business) throw new ApiError(404,'Business not found');
    const user = await getCurrentUser(req);
    const canManage = user && (user.role === 'ADMIN' || user.id === business.ownerId);
    if (business.status !== 'ACTIVE' && !canManage) throw new ApiError(404,'Business not found');
    return NextResponse.json(canManage ? business : publicBusiness(business),{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}
export async function PATCH(req:NextRequest,props:{params:Promise<{slug:string}>}) {
  try {
    assertSameOrigin(req);
    const {slug} = await props.params;
    const business = await Store.getBusinessBySlug(slug) || await Store.getBusinessById(slug);
    if (!business) throw new ApiError(404,'Business not found');
    const user = await requireBusinessAccess(req,business);
    const body = await jsonBody(req);
    const fields = businessInput(body,true);
    if (!Object.keys(fields).length) throw new ApiError(400,'No editable business details were supplied');
    // Changes to paid tiers, ownership, verification and moderation are never accepted here.
    const updated = await Store.updateBusiness(business.id,fields,user.id);
    const mediaCleanup = updated ? await cleanRemovedMedia(business.id) : undefined;
    return NextResponse.json({...updated,mediaCleanup});
  } catch(error) { return apiError(error); }
}
