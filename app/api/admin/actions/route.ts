import { NextRequest, NextResponse } from 'next/server';
import { Store } from '@/lib/store';

export async function POST(req: NextRequest) {
  try {
    const { action, targetId, reason } = await req.json();

    if (action === 'approve_listing') {
      const updated = Store.updateBusiness(targetId, {
        status: 'ACTIVE',
        verificationLevel: 'L2',
      });
      return NextResponse.json({ success: true, business: updated });
    }

    if (action === 'reject_listing') {
      const updated = Store.updateBusiness(targetId, {
        status: 'REJECTED',
      });
      return NextResponse.json({ success: true, business: updated, reason });
    }

    if (action === 'suspend_listing') {
      const updated = Store.updateBusiness(targetId, {
        status: 'SUSPENDED',
      });
      return NextResponse.json({ success: true, business: updated });
    }

    if (action === 'restore_listing') {
      const updated = Store.updateBusiness(targetId, {
        status: 'ACTIVE',
      });
      return NextResponse.json({ success: true, business: updated });
    }

    if (action === 'toggle_verified') {
      const biz = Store.getBusinessById(targetId);
      if (!biz) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const nextLevel = biz.verificationLevel === 'L2' ? 'L1' : 'L2';
      const updated = Store.updateBusiness(targetId, { verificationLevel: nextLevel });
      return NextResponse.json({ success: true, business: updated });
    }

    if (action === 'resolve_report') {
      const success = Store.resolveReport(targetId, 'DISMISSED');
      return NextResponse.json({ success });
    }

    if (action === 'suspend_reported') {
      const success = Store.resolveReport(targetId, 'SUSPENDED');
      return NextResponse.json({ success });
    }

    return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });
  } catch (err) {
    console.error('Error handling admin action:', err);
    return NextResponse.json({ error: 'Admin action failed' }, { status: 500 });
  }
}
