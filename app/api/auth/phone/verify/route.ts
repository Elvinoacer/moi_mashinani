import { NextRequest, NextResponse } from "next/server";
import { apiError, assertSameOrigin, jsonBody, textField } from "@/lib/api";
import { rateLimit } from "@/lib/rate-limit";
import { verifyPhoneCode } from "@/lib/phone-auth";
import { newSession, publicUser, setSessionCookie } from "@/lib/auth";
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "phone-code-verify", 30, 900);
    const body = await jsonBody(req);
    const account = await verifyPhoneCode(
      textField(body.challengeId, "Challenge", 100, true),
      textField(body.code, "Code", 6, true),
    );
    return setSessionCookie(
      NextResponse.json({ user: publicUser(account) }),
      await newSession(account.id),
    );
  } catch (error) {
    return apiError(error);
  }
}
