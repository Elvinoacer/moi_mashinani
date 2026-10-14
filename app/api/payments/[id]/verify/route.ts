import { withNotificationDelivery } from "@/lib/notification-response";
import { NextRequest, NextResponse } from "next/server";
import { Store } from "@/lib/store";
import { requireBusinessAccess } from "@/lib/auth";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { IntaSendError, publicPayment } from "@/lib/intasend";
import { prisma } from "@/lib/prisma";
import { queueAdmins } from "@/lib/notifications";
import { reconcilePayment } from "@/lib/payment-service";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  try {
    assertSameOrigin(req);
    const { id } = await props.params;
    const payment = await Store.getPaymentById(id);
    if (!payment) throw new ApiError(404, "Payment not found");
    const business = await Store.getBusinessById(payment.businessId);
    if (!business) throw new ApiError(404, "Business not found");
    const user = await requireBusinessAccess(req, business);
    const body = req.headers.get("content-type")?.includes("application/json")
      ? await jsonBody(req)
      : {};
    const receipt = textField(
      body.receipt,
      "M-Pesa reference",
      10,
    ).toUpperCase();
    if (receipt && !/^[A-Z0-9]{10}$/.test(receipt))
      throw new ApiError(
        400,
        "Enter the 10-character M-Pesa transaction reference.",
      );
    if (receipt && payment.submittedReceipt !== receipt)
      await prisma.$transaction(async (tx) => {
        await tx.paymentRecord.update({
          where: { id },
          data: { submittedReceipt: receipt },
        });
        await tx.businessAudit.create({
          data: {
            businessId: business.id,
            action: "PAYMENT_REFERENCE_SUBMITTED",
            actorId: user.id,
            details: `${id}: ${receipt}. Awaiting provider confirmation.`,
          },
        });
        await queueAdmins(tx, `payment/${id}/receipt/${receipt}`, {
          kind: "PAYMENT",
          title: "Merchant submitted an M-Pesa reference",
          body: `${business.name}: ${receipt}. Verify against the provider; no package has been granted by this submission.`,
          path: `/dashboard/${business.slug}?tab=billing&payment=${id}`,
          button: "Review payment",
        });
      });
    const verified = await reconcilePayment(
      { ...payment, submittedReceipt: receipt || payment.submittedReceipt },
      Store,
    );
    return withNotificationDelivery(
      NextResponse.json(publicPayment(verified), {
        headers: { "Cache-Control": "private, no-store" },
      }),
    );
  } catch (error) {
    return error instanceof IntaSendError
      ? NextResponse.json({ error: error.message }, { status: error.status })
      : apiError(error);
  }
}
