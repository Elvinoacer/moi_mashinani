import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { ApiError, apiError } from '@/lib/api';
import { deliverNotifications } from '@/lib/notifications';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(req:NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ApiError(503,'Configure CRON_SECRET');
    const expected = Buffer.from(`Bearer ${secret}`);const actual = Buffer.from(req.headers.get('authorization') || '');
    if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw new ApiError(401,'Unauthorized');
    return NextResponse.json(await deliverNotifications(50,45000),{headers:{'Cache-Control':'no-store'}});
  } catch (error) {return apiError(error);}
}
