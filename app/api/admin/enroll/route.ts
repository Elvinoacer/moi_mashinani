import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { apiError, assertSameOrigin, jsonBody } from '@/lib/api';
import { enrollBusiness } from '@/lib/enrollment';
export async function POST(req: NextRequest) {
  try { assertSameOrigin(req); await requireAdmin(req); return NextResponse.json(await enrollBusiness(await jsonBody(req),true),{status:201}); }
  catch(error) { return apiError(error); }
}
