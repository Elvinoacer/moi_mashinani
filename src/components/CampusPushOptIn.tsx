"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check, Sparkles, X } from "lucide-react";
import {
  disableCampusPush,
  pushConfig,
  registerCampusPushToken,
  saveCampusPushWatch,
} from "@/lib/firebase-client";
import type { CampusPushPreferences } from "@/lib/public-push";

export type CampusPushVariant =
  | "search-empty"
  | "search-watch"
  | "deals"
  | "request-submitted"
  | "request-board"
  | "booking-submitted"
  | "business-profile"
  | "market"
  | "merchant-dashboard";

interface CampusPushOptInProps {
  variant: CampusPushVariant;
  zone?: string;
  keyword?: string;
  businessId?: string;
  businessName?: string;
  requestId?: string;
  category?: string;
  hasOutOfStock?: boolean;
  isProSeller?: boolean;
  compact?: boolean;
}

type PublicIdentity = {
  authenticated: boolean;
  role: string;
  accountId: string;
  declined: boolean;
  subscribed: boolean;
  preferences?: CampusPushPreferences;
};

export function CampusPushOptIn({
  variant,
  zone = "all",
  keyword,
  businessId,
  businessName,
  requestId,
  category,
  hasOutOfStock = false,
  isProSeller = false,
  compact = false,
}: CampusPushOptInProps) {
  const [identity, setIdentity] = useState<PublicIdentity | null>(null);
  const [firebaseEnabled, setFirebaseEnabled] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");
  const [busy, setBusy] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const cleanKeyword = keyword?.trim() || "";

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch("/api/notifications/public", { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null),
      pushConfig().catch(() => ({ enabled: false })),
    ]).then(([idData, cfg]) => {
      if (cancelled) return;
      if (typeof window !== "undefined") {
        setPermission(
          "Notification" in window ? Notification.permission : "unsupported",
        );
        try {
          const dismissKey = `mm-ctx-push-dismiss/${variant}`;
          const dismissedAt = Number(sessionStorage.getItem(dismissKey) || 0);
          if (dismissedAt && Date.now() - dismissedAt < 3600_000) {
            setDismissed(true);
          }
        } catch {
          // Ignore storage errors
        }
      }
      if (idData) setIdentity(idData as PublicIdentity);
      setFirebaseEnabled(Boolean(cfg?.enabled));
    });

    return () => {
      cancelled = true;
    };
  }, [variant]);

  const prefs = identity?.preferences;
  const alreadyWatchingKeyword = Boolean(
    cleanKeyword &&
      prefs?.keywords?.some(
        (k) => k.toLowerCase() === cleanKeyword.toLowerCase(),
      ),
  );
  const alreadyWatchingBusiness = Boolean(
    businessId && prefs?.businessIds?.includes(businessId),
  );
  const alreadyWatchingRequest = Boolean(
    requestId && prefs?.requestIds?.includes(requestId),
  );

  const isDeviceSubscribed = Boolean(
    identity?.subscribed && permission === "granted",
  );

  const isCurrentTargetWatched =
    justSaved ||
    (isDeviceSubscribed &&
      ((cleanKeyword && alreadyWatchingKeyword) ||
        (businessId && alreadyWatchingBusiness) ||
        (requestId && alreadyWatchingRequest) ||
        (!cleanKeyword && !businessId && !requestId)));

  async function handleEnableOrWatch() {
    if (busy) return;
    setBusy(true);
    setErrorMsg("");
    setStatusMsg("");

    const watchPayload = {
      zone: zone || "all",
      keyword: cleanKeyword || undefined,
      businessId: businessId || undefined,
      requestId: requestId || undefined,
      category: category || undefined,
      source: variant,
    };

    try {
      let currentPerm: NotificationPermission = "default";
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "denied") {
          throw new Error(
            "Notifications are blocked in your browser settings. Allow notifications for this site in your browser bar, then tap again.",
          );
        }
        currentPerm =
          Notification.permission === "granted"
            ? "granted"
            : await Notification.requestPermission();
        setPermission(currentPerm);

        if (currentPerm === "denied") {
          await disableCampusPush("decline").catch(() => {});
          setIdentity((prev) =>
            prev ? { ...prev, declined: true, subscribed: false } : prev,
          );
          setErrorMsg(
            "Notification permission was declined. You can re-enable it anytime in your browser settings.",
          );
          return;
        }
      }

      if (
        firebaseEnabled &&
        currentPerm === "granted" &&
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        window.isSecureContext
      ) {
        const res = await registerCampusPushToken(watchPayload);
        setIdentity((prev) =>
          prev
            ? {
                ...prev,
                declined: false,
                subscribed: true,
                preferences: res.preferences || prev.preferences,
              }
            : prev,
        );
        setJustSaved(true);
        setStatusMsg(
          cleanKeyword
            ? `Phone alert active! We’ll ping this device when an eligible Pro or Featured seller stocks “${cleanKeyword}” or drops a deal.`
            : businessName
              ? `Phone alerts enabled for ${businessName} restocks, updates and flash deals.`
              : "Phone notifications are now enabled on this device.",
        );
      } else {
        const res = await saveCampusPushWatch(watchPayload);
        setIdentity((prev) =>
          prev
            ? {
                ...prev,
                declined: false,
                preferences: res.preferences || prev.preferences,
              }
            : prev,
        );
        setJustSaved(true);
        setStatusMsg(
          cleanKeyword
            ? `Saved “${cleanKeyword}” to your campus alert watchlist on this device.`
            : businessName
              ? `Saved ${businessName} to your campus alert watchlist on this device.`
              : "Alert preference saved for this device.",
        );
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Could not enable notifications right now. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDismiss() {
    setDismissed(true);
    try {
      sessionStorage.setItem(
        `mm-ctx-push-dismiss/${variant}`,
        String(Date.now()),
      );
    } catch {
      // Ignore storage errors
    }
  }

  if (dismissed && !justSaved) return null;

  // Copy tailored to each high-intent campus touchpoint
  let badge = "Instant Phone Alerts";
  let headline = "Turn on campus notifications on your phone";
  let description =
    "Get notified about verified flash deals, restocks, and order updates around Moi University.";
  let ctaLabel = "Allow phone notifications";

  if (variant === "search-empty") {
    badge = "Back-in-Stock & Deal Watch";
    headline = cleanKeyword
      ? `Can’t find “${cleanKeyword}” right now?`
      : "Can’t find what you searched for right now?";
    description = cleanKeyword
      ? `Allow phone notifications on this device — the moment a verified Pro or Featured campus seller restocks “${cleanKeyword}” or posts a matching deal, we’ll ping your phone.`
      : "Allow phone notifications on this device and we’ll alert you when verified Pro or Featured campus sellers stock matching items or post a deal.";
    ctaLabel = cleanKeyword
      ? `Notify me when “${cleanKeyword}” is in stock`
      : "Notify me when back in stock";
  } else if (variant === "search-watch") {
    badge = "Campus Stock & Price Watch";
    headline = cleanKeyword
      ? `Want phone alerts for “${cleanKeyword}” restocks or cheaper deals?`
      : "Get alerted when campus shops restock or drop prices";
    description =
      "Eligible Pro (KES 250/mo) and Featured sellers broadcast restocks and flash deals directly to opted-in student phones.";
    ctaLabel = cleanKeyword
      ? `Watch “${cleanKeyword}” on my phone`
      : "Enable stock & deal alerts";
  } else if (variant === "deals") {
    badge = "Flash Deal & Delivery Drop Alerts";
    headline = "Never miss a campus flash deal or hostel delivery drop";
    description =
      "Verified Pro sellers and Deal Blast shops broadcast limited-time student discounts and hostel delivery runs. Allow notifications on your phone so you hear before stock runs out.";
    ctaLabel = "Allow campus deal alerts";
  } else if (variant === "request-submitted") {
    badge = "Live Request Alert";
    headline = "Get pinged on your phone when a seller replies or stocks this";
    description = cleanKeyword
      ? `Turn on phone notifications so we can alert you immediately when a verified seller responds to “${cleanKeyword.slice(0, 50)}” or stocks a matching item.`
      : "Turn on phone notifications so we can alert you immediately when a verified seller responds to your request.";
    ctaLabel = "Notify my phone on seller replies";
  } else if (variant === "request-board") {
    badge = "Real-Time Campus Alerts";
    headline =
      identity?.role === "BUSINESS"
        ? "Sellers: get instant phone alerts for new student requests"
        : "Waiting on a seller reply or hunting for scarce campus items?";
    description =
      identity?.role === "BUSINESS"
        ? "Don’t let another shop claim a student lead first. Enable phone notifications on this device to hear about new Request Board leads, bookings, and M-Pesa confirmations."
        : "Enable phone notifications to get alerted when verified Pro sellers reply to requests or restock high-demand items in your campus zone.";
    ctaLabel =
      identity?.role === "BUSINESS"
        ? "Enable seller lead alerts"
        : "Enable student request & stock alerts";
  } else if (variant === "booking-submitted") {
    badge = "Order & Deal Updates";
    headline = businessName
      ? `Get phone alerts when ${businessName} confirms or posts deals`
      : "Get phone alerts for booking confirmations & deals";
    description = businessName
      ? `Allow notifications on this phone to receive booking status updates, restock alerts, and student offers from ${businessName}.`
      : "Allow notifications on this phone to receive booking status updates and student offers.";
    ctaLabel = "Allow booking & restock alerts";
  } else if (variant === "business-profile") {
    badge = hasOutOfStock ? "Restock & Deal Alert" : "Shop Deal & Stock Watch";
    headline = hasOutOfStock
      ? `Waiting for an out-of-stock item at ${businessName || "this shop"}?`
      : `Get pinged when ${businessName || "this shop"} drops a student deal or new stock`;
    description = hasOutOfStock
      ? `Enable phone notifications and we’ll alert you as soon as ${businessName || "this seller"} marks items back in stock or posts a flash deal.`
      : `Allow phone notifications to hear first when ${businessName || "this seller"} publishes flash deals, hostel delivery drops, or new catalogue items.`;
    ctaLabel = hasOutOfStock
      ? "Alert me when back in stock"
      : "Follow shop deals & restocks";
  } else if (variant === "market") {
    badge = "Comrade Market Watch";
    headline = cleanKeyword
      ? `Want phone alerts when comrades list “${cleanKeyword}”?`
      : "Get first dibs on second-hand hostel deals & student hustles";
    description =
      "Second-hand electronics, bedding, and gas cylinders sell fast. Enable phone alerts to get notified when verified sellers list items or drop prices.";
    ctaLabel = cleanKeyword
      ? `Alert me for “${cleanKeyword}”`
      : "Enable Comrade Market alerts";
  } else if (variant === "merchant-dashboard") {
    badge = isProSeller
      ? "Seller Alerts + Pro Student Broadcasts Active"
      : "Seller Phone Notifications & Student Reach";
    headline = isDeviceSubscribed
      ? "Seller phone notifications are active on this device"
      : "Turn on seller phone alerts so you never miss a student order or lead";
    description = isProSeller
      ? "You receive instant alerts for bookings, Request Board leads, and M-Pesa confirmations. Because your shop is on an eligible paid plan, your flash deals and product restocks automatically broadcast to opted-in student phones!"
      : "Enable notifications on this phone to hear about student bookings, Request Board leads, and M-Pesa payments immediately. Tip: Upgrade to Pro (KES 250/mo) or Featured to automatically broadcast your restocks and flash deals to opted-in student phones.";
    ctaLabel = "Enable seller notifications on this phone";
  }

  if (isCurrentTargetWatched && variant === "merchant-dashboard") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#cde0c4] bg-[#eef5e8] px-4 py-3 text-xs text-[#1f4431]">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#335e41] text-white">
            <Check className="h-4 w-4" />
          </span>
          <div>
            <p className="font-bold text-[#183e35]">
              Seller phone notifications are enabled on this device
            </p>
            <p className="text-[#4a6353]">
              {isProSeller
                ? "Your Pro/boosted flash deals and product restocks automatically notify opted-in campus students."
                : "Upgrade to Pro (KES 250/mo) anytime to broadcast your product restocks & flash deals to opted-in student phones."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <aside
      aria-label={badge}
      className={`relative overflow-hidden rounded-2xl border transition-all ${
        variant === "search-empty" || variant === "request-submitted"
          ? "border-[#b8d4be] bg-[linear-gradient(135deg,#eef6ea_0%,#ffffff_100%)] p-5 shadow-sm"
          : compact
            ? "border-[#d5e2ce] bg-[#f4f8ef] p-3.5 sm:p-4"
            : "border-[#cfe0c7] bg-[linear-gradient(120deg,#f2f7ec_0%,#ffffff_85%)] p-4 sm:p-5 shadow-xs"
      }`}
    >
      {variant !== "search-empty" &&
        variant !== "request-submitted" &&
        variant !== "booking-submitted" && (
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss notification prompt"
            className="absolute top-3 right-3 rounded-full p-1.5 text-[#667064] transition-colors hover:bg-[#e4ece0] hover:text-[#183e35]"
          >
            <X className="h-4 w-4" />
          </button>
        )}

      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 pr-6 sm:pr-2">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#183e35] text-[#e6f2d9] shadow-xs">
            {isCurrentTargetWatched ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
          </span>
          <div className="min-w-0 space-y-1">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-[#335e41]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              {badge}
            </p>
            <h3 className="font-display text-sm font-extrabold text-[#183e35] sm:text-base">
              {headline}
            </h3>
            <p className="text-xs leading-relaxed text-[#4f6456] sm:text-[13px]">
              {description}
            </p>
            {prefs?.keywords && prefs.keywords.length > 0 && (
              <p className="pt-0.5 text-[11px] font-semibold text-[#335e41]">
                Watching on this phone:{" "}
                {prefs.keywords
                  .slice(0, 5)
                  .map((k) => `“${k}”`)
                  .join(", ")}
              </p>
            )}
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          {isCurrentTargetWatched ? (
            <span className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[#b7d3b0] bg-[#e5f1de] px-4 py-2 text-xs font-extrabold text-[#1e4d33]">
              <Check className="h-4 w-4 stroke-[2.5]" />
              {cleanKeyword
                ? `Alert active for “${cleanKeyword}”`
                : "Phone alerts active"}
            </span>
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleEnableOrWatch()}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#183e35] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#285745] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41] disabled:opacity-50 sm:text-sm"
            >
              <BellRing className="h-4 w-4 shrink-0" />
              <span>
                {busy
                  ? "Saving alert…"
                  : isDeviceSubscribed && (cleanKeyword || businessId || requestId)
                    ? ctaLabel
                    : ctaLabel}
              </span>
            </button>
          )}
        </div>
      </div>

      {statusMsg && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-[#c5dec0] bg-[#eaf4e4] px-3.5 py-2 text-xs font-semibold text-[#1f4b33]"
        >
          {statusMsg}
        </p>
      )}
      {errorMsg && (
        <p
          role="alert"
          className="mt-3 rounded-xl border border-[#f2c6c0] bg-[#fce7e1] px-3.5 py-2 text-xs font-semibold text-[#8f2424]"
        >
          {errorMsg}
        </p>
      )}
    </aside>
  );
}
