import { withNotificationDelivery } from '@/lib/notification-response';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { enrollBusiness } from '@/lib/enrollment';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin(req);
    const result = await enrollBusiness(await jsonBody(req),true,admin.id);
    return withNotificationDelivery(NextResponse.json(result,{status:201}));
  }
  catch(error) { return apiError(error); }
}
