import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { apiError, ApiError } from '@/lib/api';
import { runPlanMaintenance } from '@/lib/plan-maintenance';
import { sendProPlanEmail } from '@/lib/mail';
export const runtime = 'nodejs';
export const maxDuration = 25;
export async function GET(req:NextRequest) {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret) throw new ApiError(503, 'Plan reminders require CRON_SECRET');
    const expected = Buffer.from(`Bearer ${secret}`);
    const actual = Buffer.from(req.headers.get('authorization') || '');
    if (actual.length !== expected.length || !timingSafeEqual(actual,expected)) throw new ApiError(401, 'Unauthorized');
    // cron-job.org allows 30 seconds. Persisted notices let later calls continue the batch safely.
    const signal = AbortSignal.timeout(20000);
    const result = await runPlanMaintenance(new Date(),
      (email,name,slug,end,stage,key) => sendProPlanEmail(email,name,slug,end,stage,key,fetch,signal),
      {batchSize:10,budgetMs:15000,signal});
    return NextResponse.json(result,{status:result.failed || result.cleanupFailed ? 503 : 200,headers:{'Cache-Control':'no-store'}});
  } catch (error) { return apiError(error); }
}
