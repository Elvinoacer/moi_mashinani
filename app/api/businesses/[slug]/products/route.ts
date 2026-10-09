import { NextRequest, NextResponse } from 'next/server';
import { Store, computeProfileStrength, mapPrismaBusiness } from '@/lib/store';
import { prisma } from '@/lib/prisma';
import { requireBusinessAccess } from '@/lib/auth';
import { ApiError, apiError, assertSameOrigin, jsonBody, textField } from '@/lib/api';
import { businessInput } from '@/lib/business-input';
import { productLimitError } from '@/lib/catalog-plan';
import { attachMedia, cleanRemovedMedia, mediaReferences } from '@/lib/media-storage';
import type { ServiceItem } from '@/lib/types';

async function mutate(req: NextRequest, props: {params: Promise<{slug:string}>}, method: 'POST' | 'PATCH' | 'DELETE') {
  try {
    assertSameOrigin(req);
    const {slug} = await props.params;
    const initial = await Store.getBusinessBySlug(slug);
    if (!initial) throw new ApiError(404, 'Business not found');
    const user = await requireBusinessAccess(req, initial);
    const body = await jsonBody(req);
    const item = method !== 'DELETE' ? businessInput({services:[body]} , true).services![0] : null;
    const id = item?.id || textField(body.id, 'Product ID', 100, true);
    const previous = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${initial.id} FOR UPDATE`;
      const business = await tx.business.findUniqueOrThrow({where:{id:initial.id}});
      const before = Array.isArray(business.services) ? business.services as unknown as ServiceItem[] : [];
      const existing = before.some(product => product.id === id);
      if (method === 'POST' && existing) throw new ApiError(409, 'This product already exists');
      if (method !== 'POST' && !existing) throw new ApiError(404, 'Product not found');
      let services = method === 'POST' ? [...before,item!] : method === 'PATCH' ? before.map(product => product.id === id ? item! : product) : before.filter(product => product.id !== id);
      if (method === 'PATCH' && body.publishFirst === true) services = [services.find(product => product.id === id)!,...services.filter(product => product.id !== id)];
      const error = productLimitError({proEndsAt:business.proEndsAt?.toISOString()}, before, services);
      if (error) throw new ApiError(409, error);
      await attachMedia(tx, business.id, mediaReferences(business), mediaReferences({...business,services}), user.id);
      const profileStrength = computeProfileStrength({...mapPrismaBusiness(business),services});
      await tx.business.update({where:{id:business.id},data:{services:JSON.parse(JSON.stringify(services)),profileStrength}});
      return mediaReferences(business);
    }, {maxWait:20000,timeout:30000});
    const updated = await Store.getBusinessById(initial.id);
    await cleanRemovedMedia(initial.id, previous, mediaReferences(updated!));
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}
export const POST = (req:NextRequest,props:{params:Promise<{slug:string}>}) => mutate(req,props,'POST');
export const PATCH = (req:NextRequest,props:{params:Promise<{slug:string}>}) => mutate(req,props,'PATCH');
export const DELETE = (req:NextRequest,props:{params:Promise<{slug:string}>}) => mutate(req,props,'DELETE');
