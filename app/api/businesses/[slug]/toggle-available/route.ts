import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  const business = Store.getBusinessBySlug(slug) || Store.getBusinessById(slug);

  if (!business) {
    return NextResponse.json({ error: 'Business not found' }, { status: 404 });
  }

  const updated = Store.toggleAvailableNow(business.id);
  return NextResponse.json(updated);
}
