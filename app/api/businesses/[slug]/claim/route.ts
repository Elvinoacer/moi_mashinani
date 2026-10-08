import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ slug: string }> }
) {
  const { slug } = await props.params;
  try {
    const { claimCode, phone } = await req.json();
    if (!claimCode || !phone) {
      return NextResponse.json({ error: 'Claim code and phone number are required' }, { status: 400 });
    }

    const success = Store.claimBusiness(slug, claimCode, phone);
    if (!success) {
      return NextResponse.json({ error: 'Invalid claim code or business not found' }, { status: 400 });
    }

    const business = Store.getBusinessBySlug(slug);
    return NextResponse.json({ success: true, business });
  } catch (err) {
    console.error('Error claiming business:', err);
    return NextResponse.json({ error: 'Failed to claim listing' }, { status: 500 });
  }
}
