import { NextRequest, NextResponse } from "next/server";
import { firebaseMessaging } from "@/lib/firebase-admin";
import { prisma } from "@/lib/prisma";
import {
  ApiError,
  apiError,
  assertSameOrigin,
  jsonBody,
  textField,
} from "@/lib/api";
import { hashToken } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  mergePushPreferences,
  publicPushIdentity,
  setResolvedPushCookie,
} from "@/lib/public-push";

export async function GET(req: NextRequest) {
  try {
    const identity = await publicPushIdentity(req);
    return NextResponse.json(
      {
        eligible: true,
        authenticated: identity.authenticated,
        role: identity.role,
        accountId: identity.accountId,
        declined: identity.device?.declined || false,
        subscribed: Boolean(identity.device?.enabled && identity.device?.token),
        preferences: identity.preferences,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    assertSameOrigin(req);
    await rateLimit(req, "public-push-registration", 40);
    const identity = await publicPushIdentity(req);
    const body = await jsonBody(req);
    const action = textField(body.action, "Action", 30, true);
    if (!["register", "watch", "decline", "disable"].includes(action)) {
      throw new ApiError(400, "Unknown notification action");
    }

    const zone = textField(body.zone, "Zone", 60);
    const keyword = textField(body.keyword, "Search keyword", 80);
    const businessId = textField(body.businessId, "Business ID", 100);
    const requestId = textField(body.requestId, "Request ID", 100);
    const category = textField(body.category, "Category", 60);
    const source = textField(body.source, "Source", 40);

    const token =
      action === "register"
        ? textField(body.token, "Notification token", 4096, true)
        : action === "watch"
          ? identity.device?.token || null
          : null;

    if (token && !/^[A-Za-z0-9_:.-]{20,4096}$/.test(token)) {
      throw new ApiError(400, "Invalid notification token");
    }

    if (
      action === "register" &&
      (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY ||
        process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !==
          process.env.FIREBASE_PROJECT_ID)
    ) {
      throw new ApiError(503, "Firebase notifications are not configured");
    }

    if (action === "register" && token && token !== identity.device?.token) {
      try {
        await firebaseMessaging().send(
          { token, data: { validation: "registration" } },
          true,
        );
      } catch {
        throw new ApiError(
          400,
          "Firebase could not validate this device. Check notification setup or try again.",
        );
      }
    }

    const mergedPreferences = mergePushPreferences(identity.preferences, {
      zone,
      keyword,
      businessId,
      requestId,
      category,
      source,
    });
    const serializedPreferences = JSON.stringify(mergedPreferences);
    const bindingHash = hashToken(identity.binding);
    const enabled =
      action === "register"
        ? true
        : action === "watch"
          ? Boolean(identity.device?.enabled && token)
          : false;
    const declined = action === "decline";

    await prisma.$transaction(async (tx) => {
      if (token && action === "register") {
        await tx.pushDevice.updateMany({
          where: { token, bindingHash: { not: bindingHash } },
          data: { token: null, enabled: false },
        });
      }
      const data = {
        scopeBusinessId: null,
        accountId: identity.accountId,
        sessionHash: serializedPreferences,
        token,
        enabled,
        declined,
        lastSeenAt: new Date(),
        enrollmentUntil: null,
      };
      await tx.pushDevice.upsert({
        where: { bindingHash },
        create: { bindingHash, ...data },
        update: data,
      });
    });

    const response = NextResponse.json({
      success: true,
      subscribed: enabled && Boolean(token),
      preferences: mergedPreferences,
    });
    setResolvedPushCookie(response, identity.cookieType, identity.binding);
    return response;
  } catch (error) {
    return apiError(error);
  }
}
