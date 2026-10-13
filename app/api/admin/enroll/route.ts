import { withNotificationDelivery } from '@/lib/notification-response';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { enrollBusiness } from '@/lib/enrollment';
import { ENROLLMENT_MEDIA_COOKIE } from '@/lib/enrollment-media';
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin(req);
    const result = await enrollBusiness(await jsonBody(req),true,admin.id,req.cookies.get(ENROLLMENT_MEDIA_COOKIE)?.value);
    return withNotificationDelivery(NextResponse.json(result,{status:201}));
  }
  catch(error) { return apiError(error); }
}
