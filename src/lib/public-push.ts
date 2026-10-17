import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./prisma";
import { getCurrentUser, hashToken } from "./auth";
import { PUSH_COOKIE, setPushCookie } from "./push-device";
import { hasPro } from "./catalog-plan";
import { safeNotificationPath, type NoticeContent } from "./notification-content";

export const PUBLIC_PUSH_COOKIE = "mm_campus_push";
export const PUBLIC_ALERTS_EMAIL = "campus-alerts@moimashinani.local";

export type CampusPushPreferences = {
  zone?: string;
  keywords?: string[];
  businessIds?: string[];
  requestIds?: string[];
  categories?: string[];
  source?: string;
  updatedAt?: string;
};

export function setPublicPushCookie(response: NextResponse, binding: string) {
  response.cookies.set(PUBLIC_PUSH_COOKIE, binding, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 86400,
  });
}

export function parsePushPreferences(
  raw?: string | null,
): CampusPushPreferences {
  if (!raw || !raw.startsWith("{")) return {};
  try {
    const parsed = JSON.parse(raw) as CampusPushPreferences;
    if (!parsed || typeof parsed !== "object") return {};
    return {
      zone: typeof parsed.zone === "string" ? parsed.zone.slice(0, 60) : undefined,
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords
            .filter((k): k is string => typeof k === "string" && k.trim().length > 0)
            .map((k) => k.trim().toLowerCase().slice(0, 80))
            .slice(0, 15)
        : [],
      businessIds: Array.isArray(parsed.businessIds)
        ? parsed.businessIds
            .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
            .slice(0, 20)
        : [],
      requestIds: Array.isArray(parsed.requestIds)
        ? parsed.requestIds
            .filter((r): r is string => typeof r === "string" && r.trim().length > 0)
            .slice(0, 20)
        : [],
      categories: Array.isArray(parsed.categories)
        ? parsed.categories
            .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
            .slice(0, 10)
        : [],
      source: typeof parsed.source === "string" ? parsed.source.slice(0, 40) : undefined,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    };
  } catch {
    return {};
  }
}

function uniquePush(list: string[] = [], item?: string, max = 15): string[] {
  const clean = item?.trim();
  if (!clean) return list.slice(0, max);
  const filtered = list.filter((entry) => entry.toLowerCase() !== clean.toLowerCase());
  return [clean, ...filtered].slice(0, max);
}

export function mergePushPreferences(
  existing: CampusPushPreferences,
  incoming: {
    zone?: string;
    keyword?: string;
    businessId?: string;
    requestId?: string;
    category?: string;
    source?: string;
  },
): CampusPushPreferences {
  const normalizedKeyword = incoming.keyword?.trim().toLowerCase().slice(0, 80);
  return {
    zone: incoming.zone?.trim() || existing.zone || "all",
    keywords: uniquePush(existing.keywords || [], normalizedKeyword, 15),
    businessIds: uniquePush(existing.businessIds || [], incoming.businessId, 20),
    requestIds: uniquePush(existing.requestIds || [], incoming.requestId, 20),
    categories: uniquePush(existing.categories || [], incoming.category, 10),
    source: incoming.source?.trim() || existing.source || "campus",
    updatedAt: new Date().toISOString(),
  };
}

export async function ensurePublicAlertsAccount(
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  return tx.account.upsert({
    where: { email: PUBLIC_ALERTS_EMAIL },
    create: {
      email: PUBLIC_ALERTS_EMAIL,
      name: "Campus Deal & Stock Alerts",
      role: "STUDENT",
      passwordHash: "system-unusable-account",
      emailVerifiedAt: null,
    },
    update: {},
  });
}

export async function publicPushIdentity(req: NextRequest) {
  const user = await getCurrentUser(req);
  if (user) {
    const rawBinding = req.cookies.get(PUSH_COOKIE)?.value;
    const validBinding =
      rawBinding && /^[a-f0-9]{64}$/.test(rawBinding) ? rawBinding : null;
    const device = validBinding
      ? await prisma.pushDevice.findUnique({
          where: { bindingHash: hashToken(validBinding) },
        })
      : null;
    const binding =
      device && device.accountId === user.id
        ? validBinding!
        : randomBytes(32).toString("hex");
    return {
      authenticated: true,
      accountId: user.id,
      role: user.role,
      cookieType: "account" as const,
      binding,
      device: device && device.accountId === user.id ? device : null,
      preferences: parsePushPreferences(device?.sessionHash),
    };
  }

  const publicAccount = await ensurePublicAlertsAccount(prisma);
  const rawBinding = req.cookies.get(PUBLIC_PUSH_COOKIE)?.value;
  const validBinding =
    rawBinding && /^[a-f0-9]{64}$/.test(rawBinding) ? rawBinding : null;
  const device = validBinding
    ? await prisma.pushDevice.findUnique({
        where: { bindingHash: hashToken(validBinding) },
      })
    : null;
  const binding = device ? validBinding! : randomBytes(32).toString("hex");

  return {
    authenticated: false,
    accountId: publicAccount.id,
    role: "PUBLIC_STUDENT",
    cookieType: "public" as const,
    binding,
    device,
    preferences: parsePushPreferences(device?.sessionHash),
  };
}

export function setResolvedPushCookie(
  response: NextResponse,
  cookieType: "account" | "public",
  binding: string,
) {
  if (cookieType === "account") {
    setPushCookie(response, binding);
  } else {
    setPublicPushCookie(response, binding);
  }
}

export function isEligibleBroadcastPlan(
  business: {
    proEndsAt?: Date | string | null;
    featuredUntil?: Date | string | null;
    dealBlastEndsAt?: Date | string | null;
    activeTier?: string | null;
  },
  nowMs = Date.now(),
): boolean {
  const proIso =
    business.proEndsAt instanceof Date
      ? business.proEndsAt.toISOString()
      : business.proEndsAt ?? undefined;
  if (hasPro({ proEndsAt: proIso }, nowMs)) return true;

  const featuredEnd = business.featuredUntil
    ? new Date(business.featuredUntil).getTime()
    : 0;
  if (
    featuredEnd > nowMs &&
    business.activeTier &&
    business.activeTier !== "NONE"
  ) {
    return true;
  }

  const dealBlastEnd = business.dealBlastEndsAt
    ? new Date(business.dealBlastEndsAt).getTime()
    : 0;
  if (dealBlastEnd > nowMs) return true;

  return false;
}

function matchesKeyword(keyword: string, haystack: string): boolean {
  const cleanKw = keyword.trim().toLowerCase();
  const cleanHaystack = haystack.trim().toLowerCase();
  if (!cleanKw || !cleanHaystack) return false;
  if (cleanHaystack.includes(cleanKw) || cleanKw.includes(cleanHaystack)) {
    return true;
  }
  const tokens = cleanKw.split(/\s+/).filter((t) => t.length >= 3);
  return tokens.length > 0 && tokens.some((token) => cleanHaystack.includes(token));
}

export async function queueCampusBroadcast(
  tx: Prisma.TransactionClient,
  options: {
    excludeAccountId?: string | null;
    eventKey: string;
    content: NoticeContent;
    filter?: {
      keywordMatchOnly?: boolean;
      zone?: string;
      servesZones?: string[];
      businessId?: string;
      requestId?: string;
      category?: string;
      text?: string;
    };
  },
) {
  const devices = await tx.pushDevice.findMany({
    where: {
      enabled: true,
      declined: false,
      token: { not: null },
      accountId: { not: options.excludeAccountId || "" },
      scopeBusinessId: null,
      lastSeenAt: { gt: new Date(Date.now() - 30 * 864e5) },
    },
    take: 500,
  });

  const filter = options.filter;
  const matched = devices.filter((device) => {
    const prefs = parsePushPreferences(device.sessionHash);

    if (filter?.requestId) {
      return Boolean(prefs.requestIds?.includes(filter.requestId));
    }

    const zoneMatches =
      !filter?.zone ||
      filter.zone === "all" ||
      !prefs.zone ||
      prefs.zone === "all" ||
      prefs.zone === filter.zone ||
      Boolean(filter.servesZones?.includes(prefs.zone));

    if (filter?.keywordMatchOnly) {
      if (filter.businessId && prefs.businessIds?.includes(filter.businessId)) {
        return true;
      }
      if (filter.category && prefs.categories?.includes(filter.category) && zoneMatches) {
        return true;
      }
      if (
        filter.text &&
        prefs.keywords?.length &&
        prefs.keywords.some((kw) => matchesKeyword(kw, filter.text!))
      ) {
        return true;
      }
      // If a public student subscribed to general campus restock/deal alerts in this zone without restricting to a single keyword
      if (!prefs.keywords?.length && !prefs.businessIds?.length && zoneMatches) {
        return true;
      }
      return false;
    }

    if (filter?.businessId && prefs.businessIds?.includes(filter.businessId)) {
      return true;
    }
    return zoneMatches;
  });

  if (matched.length === 0) return { matchedDevices: 0 };

  const byAccount = new Map<string, typeof matched>();
  for (const device of matched) {
    const list = byAccount.get(device.accountId) || [];
    list.push(device);
    byAccount.set(device.accountId, list);
  }

  for (const [accountId, accountDevices] of byAccount.entries()) {
    const notice = await tx.notification.upsert({
      where: {
        accountId_eventKey: { accountId, eventKey: options.eventKey },
      },
      create: {
        accountId,
        eventKey: options.eventKey,
        ...options.content,
        path: safeNotificationPath(options.content.path),
      },
      update: {},
    });

    for (const device of accountDevices) {
      await tx.notificationDelivery.upsert({
        where: {
          notificationId_channel_target: {
            notificationId: notice.id,
            channel: "PUSH",
            target: device.id,
          },
        },
        create: {
          notificationId: notice.id,
          channel: "PUSH",
          target: device.id,
          deviceId: device.id,
        },
        update: {},
      });
    }
  }

  return { matchedDevices: matched.length };
}
