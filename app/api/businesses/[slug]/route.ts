import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const business = Store.getBusinessBySlug(slug) || Store.getBusinessById(slug);

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  return NextResponse.json(business);
}

export async function PATCH(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const business = Store.getBusinessBySlug(slug) || Store.getBusinessById(slug);

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  try {
    const body = await req.json();
    const updated = Store.updateBusiness(business.id, body);
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating business:', err);
    return NextResponse.json({ error: 'Failed to update business' }, { status: 400 });
  }
}
