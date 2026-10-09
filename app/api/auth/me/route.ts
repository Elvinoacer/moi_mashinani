import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Store } from '@/lib/store';
import { apiError } from '@/lib/api';
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    const businesses = user ? (await Store.getBusinesses()).filter(b => user.role === 'ADMIN' || b.ownerId === user.id) : [];
    return NextResponse.json({user,businesses},{headers:{'Cache-Control':'no-store'}});
  } catch(error) { return apiError(error); }
}
