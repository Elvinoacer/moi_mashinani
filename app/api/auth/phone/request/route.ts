import { NextResponse } from "next/server";

// Old SMS clients must not trigger charges or create phone-only sessions.
export async function POST() {
  return NextResponse.json(
    { error: "SMS sign-in is retired. Use email and password instead." },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
