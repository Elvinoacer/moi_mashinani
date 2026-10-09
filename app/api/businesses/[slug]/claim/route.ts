import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({error:'Ask the administrator to enroll your business and send an email verification invitation. Claim codes are no longer supported.'},{status:410});
}
