import { NextRequest, NextResponse } from "next/server";
import { apiError, assertSameOrigin, jsonBody, textField } from "@/lib/api";
import { phoneField } from "@/lib/business-input";
import { rateLimit } from "@/lib/rate-limit";
import { requestPhoneCode } from "@/lib/phone-auth";
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "phone-code-ip", 10, 3600);
    const body = await jsonBody(req),
      phone = phoneField(body.phone);
    await rateLimit(req, "phone-code-recipient", 3, 900, phone);
    const challengeId = await requestPhoneCode(
      phone,
      textField(body.name, "Name", 120),
    );
    return NextResponse.json(
      { challengeId, expiresIn: 300 },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
