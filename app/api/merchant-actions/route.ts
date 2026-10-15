import { NextRequest, NextResponse } from "next/server";
import { apiError, assertSameOrigin, jsonBody, textField } from "@/lib/api";
import { consumeMerchantAction } from "@/lib/merchant-actions";
import { rateLimit } from "@/lib/rate-limit";
export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "merchant-action", 30);
    const body = await jsonBody(req);
    return NextResponse.json(
      await consumeMerchantAction(
        textField(body.token, "Action token", 64, true),
      ),
      {
        headers: {
          "Cache-Control": "private, no-store",
          "Referrer-Policy": "no-referrer",
        },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}
