"use client";

import { VerificationEvidence } from "@/components/VerificationEvidence";
import { BoostCheckout } from "@/components/BoostCheckout";
import { TrustShare } from "@/components/TrustShare";
import { LeadTimeline } from "@/components/LeadTimeline";
import { RequestBoard } from "@/components/RequestBoard";
import { CategorySelect } from "@/components/CategorySelect";
import { DashboardWorkspaceNav, type WorkspaceTab } from "@/components/DashboardWorkspaceNav";

import Image from "next/image";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { MerchantDailyTools } from "@/components/MerchantDailyTools";
import { useRouter, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { AccountGate } from "@/components/AccountGate";
import {
  Business,
  BusinessHours,
  BusinessMetrics,
  BookingIntent,
  PaymentRecord,
  ServiceItem,
} from "@/lib/types";
import { PAYMENT_PLAN_LABELS, PAYMENT_STATE_LABELS } from "@/lib/payments";
import { ZONES } from "@/lib/constants";
import { useNow } from "@/lib/useNow";
import {
  CatalogPlanPanel,
  type CatalogUsage,
} from "@/components/CatalogPlanPanel";
import {
  hasPro,
  FREE_STORAGE_BYTES,
  photoReferences,
} from "@/lib/catalog-plan";
import { PhotoUploader } from "@/components/PhotoUploader";
import { Eye, Rocket, Trash2, RefreshCw } from "@/components/icons";

const detailLabels = {
  name: "Business name",
  tagline: "Tagline",
  phone: "Phone number",
  whatsapp: "WhatsApp number",
  landmark: "Landmark",
  address: "Address",
  studentDiscount: "Student discount (optional)",
};
const days = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const tabs = [
  "overview",
  "bookings",
  "services",
  "details",
  "photos",
  "hours",
  "billing",
  "share",
] as const;
type Tab = WorkspaceTab;
const sectionCopy: Record<Tab, { title: string; subtitle: string }> = {
  overview: { title: "Today at your business", subtitle: "See what needs attention and how customers are finding you." },
  bookings: { title: "Booking requests", subtitle: "Find customers quickly, respond and update each request." },
  services: { title: "Your catalogue", subtitle: "Manage products, pricing and availability in one place." },
  details: { title: "Business information", subtitle: "Keep your contact details, location and trust information accurate." },
  photos: { title: "Business gallery", subtitle: "Help customers recognize your business and what you offer." },
  hours: { title: "Opening hours", subtitle: "Set a reliable weekly schedule for your customers." },
  billing: { title: "Plans and payments", subtitle: "Manage visibility, promotions and your transaction history." },
  share: { title: "Share your business", subtitle: "Make it easy for customers to reach your public profile." },
};
type Booking = BookingIntent & {
  status: "NEW" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
  contactPhone?: string;
};
type EditableService = ServiceItem & { photo?: string };
const inputClass =
  "mt-1 block min-h-11 w-full min-w-0 rounded-xl border border-[#becfc1] bg-white px-3.5 py-2.5 text-sm text-[#243b32] shadow-sm placeholder:text-[#869387] focus-visible:border-[#477353] focus-visible:ring-2 focus-visible:ring-[#d4e6c1]";
const buttonClass =
  "rounded-full bg-[#335e41] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50";
const panelClass =
  "min-w-0 space-y-4 rounded-2xl border border-[#e0e8dd] bg-white p-4 shadow-[0_8px_26px_rgba(31,61,42,0.045)] sm:p-5 xl:p-6";

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "The request failed. Please try again.");
  return data as T;
}

function BusinessDashboard({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const now = useNow();
  const [business, setBusiness] = useState<Business | null>(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [billingError, setBillingError] = useState("");
  const [metricsError, setMetricsError] = useState("");
  const [metricsRefresh, setMetricsRefresh] = useState(0);
  const [metricsRefreshing, setMetricsRefreshing] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const [liveStatus, setLiveStatus] = useState("");
  const requestedTab = searchParams.get("tab");
  const [tabSelection, setTabSelection] = useState<{
    query: string | null;
    tab: Tab;
  }>({
    query: requestedTab,
    tab: tabs.includes(requestedTab as Tab)
      ? (requestedTab as Tab)
      : "overview",
  });
  const activeTab =
    tabSelection.query === requestedTab
      ? tabSelection.tab
      : tabs.includes(requestedTab as Tab)
        ? (requestedTab as Tab)
        : "overview";
  function setActiveTab(tab: Tab) {
    setTabSelection({ query: requestedTab, tab });
  }
  const [draft, setDraft] = useState({
    name: "",
    tagline: "",
    description: "",
    phone: "",
    whatsapp: "",
    landmark: "",
    address: "",
    zone: "",
    primaryCategory: "",
    studentDiscount: "",
    latitude: "",
    longitude: "",
  });
  const [hours, setHours] = useState<BusinessHours>({});
  const [serviceId, setServiceId] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [servicePrice, setServicePrice] = useState("");
  const [serviceNote, setServiceNote] = useState("");
  const [servicePhoto, setServicePhoto] = useState("");
  const [storageRefresh, setStorageRefresh] = useState(0);
  const [storageUsage, setStorageUsage] = useState<CatalogUsage | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [serviceSort, setServiceSort] = useState<"listed" | "name" | "stock">("listed");
  const [showServiceForm, setShowServiceForm] = useState(false);
  const [confirmDeleteServiceId, setConfirmDeleteServiceId] = useState<string | null>(null);
  const [bookingQuery, setBookingQuery] = useState("");
  const [bookingFilter, setBookingFilter] = useState<"OPEN" | "ALL" | Booking["status"]>("OPEN");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [data, account] = await Promise.all([
          fetch(`/api/businesses/${encodeURIComponent(slug)}`, {
            signal: controller.signal,
            cache: "no-store",
          }).then(
            readResponse<
              Business & {
                mediaCleanup?: {
                  deleted: number;
                  pending: number;
                  retained: number;
                };
              }
            >,
          ),
          fetch("/api/auth/me", {
            signal: controller.signal,
            cache: "no-store",
          }).then(readResponse<{ businesses: Business[] }>),
        ]);
        if (controller.signal.aborted) return;
        setBusiness(data);
        setLiveStatus(data.liveStatus || "");
        setOwnedBusinesses(account.businesses || []);
        setDraft({
          name: data.name,
          tagline: data.tagline || "",
          description: data.description || "",
          phone: data.phone,
          whatsapp: data.whatsapp,
          landmark: data.landmark,
          address: data.address || "",
          zone: data.zone,
          primaryCategory: data.primaryCategory,
          studentDiscount: data.studentDiscount || "",
          latitude: data.mapPin ? String(data.mapPin.lat) : "",
          longitude: data.mapPin ? String(data.mapPin.lng) : "",
        });
        setHours(
          Object.fromEntries(
            days.map((day) => [
              day,
              data.hours[day] || {
                open: "08:00",
                close: "18:00",
                closed: true,
              },
            ]),
          ),
        );
        const query = `?businessId=${encodeURIComponent(data.id)}`;
        await Promise.all([
          fetch(`/api/payments${query}`, {
            signal: controller.signal,
            cache: "no-store",
          })
            .then(readResponse<PaymentRecord[]>)
            .then(setPayments)
            .catch((failure) => {
              if (!controller.signal.aborted)
                setBillingError(
                  failure.message || "Could not load payment history.",
                );
            }),
          fetch(`/api/bookings${query}`, {
            signal: controller.signal,
            cache: "no-store",
          })
            .then(readResponse<Booking[]>)
            .then(setBookings)
            .catch((failure) => {
              if (!controller.signal.aborted)
                setBookingError(failure.message || "Could not load bookings.");
            }),
        ]);
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not load this business.",
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [slug]);

  const businessId = business?.id;
  useEffect(() => {
    if (!businessId) return;
    const controller = new AbortController();
    let inFlight = false;
    async function refreshMetrics() {
      if (document.visibilityState === "hidden" || inFlight) return;
      inFlight = true;
      setMetricsRefreshing(true);
      try {
        const metrics = await fetch(
          `/api/businesses/${encodeURIComponent(slug)}/metrics`,
          {
            signal: controller.signal,
            cache: "no-store",
          },
        ).then(readResponse<BusinessMetrics>);
        if (!controller.signal.aborted) {
          setBusiness((current) =>
            current && current.id === businessId
              ? { ...current, metrics }
              : current,
          );
          setMetricsError("");
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setMetricsError(
            failure instanceof Error
              ? failure.message
              : "Could not refresh metrics.",
          );
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setMetricsRefreshing(false);
      }
    }
    void refreshMetrics();
    const onFocus = () => {
      void refreshMetrics();
    };
    const interval = window.setInterval(onFocus, 30000);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [slug, businessId, metricsRefresh]);

  async function patchBusiness(fields: Partial<Business>) {
    const updated = await fetch(`/api/businesses/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    }).then(
      readResponse<
        Business & {
          mediaCleanup?: { deleted: number; pending: number; retained: number };
        }
      >,
    );
    setBusiness(updated);
    setStorageRefresh((value) => value + 1);
    return updated;
  }

  async function runAction(
    key: string,
    action: () => Promise<unknown>,
    message = "Changes saved.",
  ) {
    if (busy) return;
    setBusy(key);
    setError("");
    setNotice("");
    try {
      const result = (await action()) as
        | {
            mediaCleanup?: {
              deleted: number;
              pending: number;
              retained: number;
            };
          }
        | undefined;
      const cleanup = result?.mediaCleanup;
      setNotice(
        message +
          (cleanup?.pending
            ? " Cloud cleanup is pending because storage is unavailable. It will retry automatically."
            : "") +
          (cleanup?.deleted
            ? " Unused photos were deleted from storage."
            : "") +
          (cleanup?.retained ? " Photos still used elsewhere were kept." : ""),
      );
    } catch (failure) {
      setError(
        failure instanceof Error
          ? failure.message
          : "Connection error. Please try again.",
      );
    } finally {
      setBusy("");
    }
  }

  function discardDraftPhoto(photo: string) {
    if (photo && business && !photoReferences(business).includes(photo)) {
      setNotice("Deleting unused photo from storage…");
      void fetch(`/api/uploads?url=${encodeURIComponent(photo)}`, {
        method: "DELETE",
      })
        .then(readResponse<{ pending?: boolean; message?: string }>)
        .then((result) => {
          setStorageRefresh((value) => value + 1);
          setNotice(
            result.pending
              ? result.message ||
                  "Photo deletion is queued for automatic retry."
              : "Unused photo deleted from storage.",
          );
        })
        .catch((failure) =>
          setError(
            failure instanceof Error
              ? failure.message
              : "Could not remove the photo. Please try again.",
          ),
        );
    }
  }
  function resetService() {
    discardDraftPhoto(servicePhoto);
    setServiceId("");
    setServiceName("");
    setServicePrice("");
    setServiceNote("");
    setServicePhoto("");
    setShowServiceForm(false);
  }
  async function mutateProduct(
    method: "POST" | "PATCH" | "DELETE",
    item: Partial<ServiceItem> & { publishFirst?: boolean },
  ) {
    const updated = await fetch(
      `/api/businesses/${encodeURIComponent(slug)}/products`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item),
      },
    ).then(
      readResponse<
        Business & {
          mediaCleanup?: { deleted: number; pending: number; retained: number };
        }
      >,
    );
    setBusiness(updated);
    setStorageRefresh((value) => value + 1);
    return updated;
  }

  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    if (!business || !serviceName.trim()) return;
    const price = servicePrice === "" ? undefined : Number(servicePrice);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      setError("Enter a valid non-negative price.");
      return;
    }
    const existing = business.services.find((item) => item.id === serviceId);
    const service: EditableService = {
      ...existing,
      id: serviceId || crypto.randomUUID(),
      name: serviceName.trim(),
      priceFrom: price,
      note: serviceNote.trim() || undefined,
      photo: servicePhoto || undefined,
    };
    await runAction("service", async () => {
      const updated = await mutateProduct(
        serviceId ? "PATCH" : "POST",
        service,
      );
      setServiceId("");
      setServiceName("");
      setServicePrice("");
      setServiceNote("");
      setServicePhoto("");
      setShowServiceForm(false);
      return updated;
    });
  }

  async function refreshCollection(kind: "bookings" | "payments") {
    if (!business) return;
    await runAction(
      kind,
      async () => {
        const response = await fetch(
          `/api/${kind}?businessId=${encodeURIComponent(business.id)}`,
          { cache: "no-store" },
        );
        if (kind === "bookings") {
          setBookings(await readResponse<Booking[]>(response));
          setBookingError("");
        } else {
          setPayments(await readResponse<PaymentRecord[]>(response));
          setBillingError("");
        }
      },
      `${kind === "bookings" ? "Bookings" : "Payment history"} refreshed.`,
    );
  }

  if (loading)
    return (
      <main className="mx-auto w-full max-w-5xl flex-1 p-8 text-center">
        <p role="status">Loading your merchant hub...</p>
      </main>
    );
  if (!business)
    return (
      <main className="mx-auto w-full max-w-xl flex-1 space-y-4 p-8">
        <h1 className="font-display text-2xl font-bold">
          Could not open this business
        </h1>
        <p role="alert" className="text-[#a7302d]">
          {error || "Business not found."}
        </p>
        <Link href="/dashboard" className="font-bold text-[#335e41]">
          Return to your businesses
        </Link>
      </main>
    );

  const isAvailable =
    !business.isTemporarilyClosed &&
    Boolean(
      business.availableNowUntil &&
      new Date(business.availableNowUntil).getTime() > now,
    );
  const tierActive =
    business.activeTier !== "NONE" &&
    Boolean(
      business.tierEndsAt && new Date(business.tierEndsAt).getTime() > now,
    );
  const pro = hasPro(business, now);
  const canAddProduct = true;
  const storageFull =
    !pro && business.verificationLevel !== "L2" &&
    Boolean(storageUsage && storageUsage.usedBytes >= FREE_STORAGE_BYTES);
  const switcherBusinesses = ownedBusinesses.some(
    (item) => item.id === business.id,
  )
    ? ownedBusinesses
    : [business, ...ownedBusinesses];

  const pendingBookings = bookings.filter((item) => (item.status || "NEW") === "NEW").length;
  const openBookings = bookings.filter((item) => ["NEW", "CONFIRMED"].includes(item.status || "NEW")).length;
  const visibleBookings = bookings.filter((item) => {
    const matchesStatus = bookingFilter === "ALL" || (bookingFilter === "OPEN" ? ["NEW", "CONFIRMED"].includes(item.status || "NEW") : (item.status || "NEW") === bookingFilter);
    const needle = bookingQuery.trim().toLowerCase();
    return matchesStatus && (!needle || [item.studentName, item.serviceName, item.note || "", item.contactPhone || ""].join(" ").toLowerCase().includes(needle));
  });
  const visibleServices = (business.services as EditableService[])
    .filter((service) => [service.name, service.note || ""].join(" ").toLowerCase().includes(catalogQuery.trim().toLowerCase()))
    .sort((a, b) => serviceSort === "name" ? a.name.localeCompare(b.name) : serviceSort === "stock" ? Number(a.inStock === false) - Number(b.inStock === false) : 0);

  return (
    <main className="mx-auto w-full max-w-[1440px] flex-1 space-y-5 px-3 py-5 sm:px-6 lg:px-9 lg:py-8">
      <div
        className="relative flex flex-wrap items-center justify-between gap-5 overflow-hidden rounded-[26px] border border-[#dce7d2] bg-[linear-gradient(115deg,#f0f6e8_0%,#ffffff_75%)] px-5 py-6 shadow-[0_9px_30px_rgba(31,61,42,0.06)] sm:px-7"
      >
        <div className="min-w-0 flex-1">
          <Link href="/dashboard" className="mb-3 inline-flex items-center text-xs font-semibold text-[#56755b] hover:underline">← All my businesses</Link>
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#637d5b]">Merchant workspace</p>
          <h1 className="font-display break-words text-2xl font-extrabold text-[#183e35] sm:text-[30px]">
            {business.name}
          </h1>
          <p className="mt-1 text-xs text-[#667064]">
            <span className="font-bold text-[#335e41]">{business.status === "ACTIVE" ? "Published" : business.status.toLowerCase()}</span> · {business.landmark || "Campus business"}
          </p>
          {switcherBusinesses.length > 1 && (
            <label className="mt-2 block text-xs font-bold text-[#243b32]">
              Your businesses
              <select
                aria-label="Switch business"
                value={business.slug}
                onChange={(event) =>
                  router.push(`/dashboard/${event.target.value}`)
                }
                className={inputClass}
              >
                {switcherBusinesses.map((item) => (
                  <option key={item.id} value={item.slug}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/b/${business.slug}`}
            target="_blank"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#cbd9c7] bg-white px-4 py-2 text-sm font-bold text-[#294a36] transition-colors hover:bg-[#f3f7ed]"
          >
            <Eye className="h-4 w-4" /> View profile
          </Link>
          <Link
            href={`/dashboard/${business.slug}?tab=billing`}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#244b37] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#35684a]"
          >
            <Rocket className="h-4 w-4" /> Promote
          </Link>
        </div>
      </div>

      {business.status !== "ACTIVE" && (
        <p className="rounded bg-[#eff4da] p-4 text-sm text-[#526936]">
          This listing is {business.status.toLowerCase()}. You can update its
          information here; customers can book after admin approval.
          {business.moderationReason && (
            <span className="mt-2 block font-semibold">
              Reason: {business.moderationReason}
            </span>
          )}
          {business.status === "REJECTED" && (
            <button
              type="button"
              disabled={Boolean(busy)}
              className="mt-3 block rounded-xl bg-[#243b32] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              onClick={() =>
                void runAction(
                  "resubmit",
                  async () => {
                    const response = await fetch(
                      `/api/businesses/${encodeURIComponent(slug)}/resubmit`,
                      { method: "POST" },
                    );
                    const data = await readResponse<{ business: Business }>(
                      response,
                    );
                    setBusiness(data.business);
                  },
                  "Corrections submitted. Your listing is awaiting another review.",
                )
              }
            >
              Resubmit corrected listing for review
            </button>
          )}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded bg-[#fce7e1] p-3 text-sm text-[#a7302d]"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="rounded bg-[#edf2e5] p-3 text-sm text-[#335e41]"
        >
          {notice}
        </p>
      )}
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[245px_minmax(0,1fr)] lg:gap-7">
        <DashboardWorkspaceNav slug={business.slug} activeTab={activeTab} pendingBookings={pendingBookings} onNavigate={(next) => { setActiveTab(next); setError(""); setNotice(""); }} />
        <div className="min-w-0 space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-3 px-1">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#7c887e]">Business management</p>
              <h2 className="mt-1 text-2xl font-extrabold text-[#183e35] sm:text-[28px]">{sectionCopy[activeTab].title}</h2>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#65746a]">{sectionCopy[activeTab].subtitle}</p>
            </div>
          </header>
          {activeTab === "overview" && (
            <section aria-label="Quick actions" className="grid gap-3 sm:grid-cols-3">
              <Link href={"/dashboard/" + business.slug + "?tab=bookings"} scroll={false} onClick={() => setActiveTab("bookings")} className="rounded-2xl border border-[#d9e7cb] bg-[#eaf3db] p-4 transition-colors hover:bg-[#deedca]">
                <p className="text-xs font-semibold text-[#43624a]">Requests to handle</p>
                <p className="mt-1 text-3xl font-extrabold text-[#204834]">{openBookings}</p>
                <p className="mt-2 text-xs font-bold text-[#315d41]">View bookings →</p>
              </Link>
              <Link href={"/dashboard/" + business.slug + "?tab=services"} scroll={false} onClick={() => setActiveTab("services")} className="rounded-2xl border border-[#e0e8dd] bg-white p-4 transition-colors hover:bg-[#f5f8f1]">
                <p className="text-xs font-semibold text-[#65746a]">Catalogue items</p>
                <p className="mt-1 text-3xl font-extrabold text-[#204834]">{business.services.length}</p>
                <p className="mt-2 text-xs font-bold text-[#315d41]">Edit prices & stock →</p>
              </Link>
              <div className="rounded-2xl border border-[#e0e8dd] bg-white p-4">
                <p className="text-xs font-semibold text-[#65746a]">Customer visibility</p>
                <p className="mt-2 text-base font-extrabold text-[#204834]">{business.isTemporarilyClosed ? "Temporarily closed" : isAvailable ? "Live now" : business.status === "ACTIVE" ? "Published" : "Not published"}</p>
                <p className="mt-2 text-xs text-[#65746a]">Change availability below</p>
              </div>
            </section>
          )}
          {activeTab === "details" && (
            <section className={panelClass}>
            <h2 className="text-xl font-bold">Trust & request alerts</h2>
            <VerificationEvidence
              slug={slug}
              owner
              comrade={business.sellerType === "COMRADE"}
            />
            <label className="flex gap-3 text-sm">
              <input
                type="checkbox"
                disabled={!!busy}
                checked={Boolean(business.requestAlertsEnabled)}
                onChange={(e) =>
                  void runAction("email-reminder", () =>
                    patchBusiness({ requestAlertsEnabled: e.target.checked }),
                  )
                }
              />
              Email me a morning reminder to confirm my shop is open.
            </label>
            <p className="text-xs text-[#667064]">
              Customer requests and booking updates also appear in your inbox and email. No SMS charges.
            </p>
          </section>
          )}
          {activeTab === "overview" && (
            <section className={panelClass}>
            <h2 className="text-xl font-bold">Live campus status</h2>
            <label className="block text-sm font-semibold">
              What’s happening now? (40 characters)
              <input
                className={inputClass}
                maxLength={40}
                value={liveStatus}
                onChange={(event) => setLiveStatus(event.target.value)}
                placeholder="Generator ON · printing open"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <button
                className={buttonClass}
                disabled={
                  !!busy ||
                  business.status !== "ACTIVE" ||
                  business.isTemporarilyClosed
                }
                onClick={() =>
                  void runAction(
                    "live",
                    async () =>
                      setBusiness(
                        await fetch(
                          `/api/businesses/${slug}/toggle-available`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ enabled: true, liveStatus }),
                          },
                        ).then(readResponse<Business>),
                      ),
                    "Live update published for four hours.",
                  )
                }
              >
                Broadcast for 4 hours
              </button>
              {isAvailable && (
                <button
                  className="ui-button ui-button-secondary"
                  disabled={!!busy}
                  onClick={() =>
                    void runAction("live-off", async () =>
                      setBusiness(
                        await fetch(
                          `/api/businesses/${slug}/toggle-available`,
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ enabled: false }),
                          },
                        ).then(readResponse<Business>),
                      ),
                    )
                  }
                >
                  End live update
                </button>
              )}
              <button
                className="ui-button ui-button-secondary"
                disabled={!!busy}
                onClick={() =>
                  void runAction("closed", () =>
                    patchBusiness({
                      isTemporarilyClosed: !business.isTemporarilyClosed,
                    }),
                  )
                }
              >
                {business.isTemporarilyClosed
                  ? "Reopen shop"
                  : "Mark temporarily closed"}
              </button>
            </div>
            <p className="text-xs">
              Updates expire automatically. Closing the shop pauses inquiries.
            </p>
          </section>
          )}
      {activeTab === "overview" && <MerchantDailyTools business={business} />}
      {activeTab === "billing" && <BoostCheckout business={business} />}
      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className={panelClass}>
            <h2 className="font-display text-xl font-bold">
              Listing availability
            </h2>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={
                  Boolean(busy) ||
                  business.isTemporarilyClosed ||
                  business.status !== "ACTIVE"
                }
                aria-pressed={isAvailable}
                onClick={() =>
                  void runAction(
                    "available",
                    async () =>
                      setBusiness(
                        await fetch(
                          `/api/businesses/${slug}/toggle-available`,
                          { method: "POST" },
                        ).then(
                          readResponse<
                            Business & {
                              mediaCleanup?: {
                                deleted: number;
                                pending: number;
                                retained: number;
                              };
                            }
                          >,
                        ),
                      ),
                    isAvailable
                      ? "Available now turned off."
                      : "Available now enabled for 4 hours.",
                  )
                }
                className={buttonClass}
              >
                {isAvailable
                  ? "Turn off Available now"
                  : "Available now for 4 hours"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                aria-pressed={Boolean(business.isTemporarilyClosed)}
                onClick={() =>
                  void runAction(
                    "closed",
                    () =>
                      patchBusiness({
                        isTemporarilyClosed: !business.isTemporarilyClosed,
                      }),
                    business.isTemporarilyClosed
                      ? "Business reopened."
                      : "Business marked temporarily closed.",
                  )
                }
                className="rounded-full border border-[#dfe5d8] px-5 py-2.5 text-sm font-bold disabled:opacity-50"
              >
                {business.isTemporarilyClosed
                  ? "Reopen business"
                  : "Mark temporarily closed"}
              </button>
            </div>
            <p className="text-xs text-[#667064]">
              Customers see your current availability. Temporarily closing the
              listing pauses booking requests.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-[#667064]">
              All-time activity · Updates every 30 seconds and when you return
              to this tab. Calls and WhatsApp count button taps.
            </p>
            <button
              type="button"
              disabled={metricsRefreshing}
              onClick={() => setMetricsRefresh((value) => value + 1)}
              className="flex items-center gap-1 text-xs font-bold text-[#335e41] disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              {metricsRefreshing ? "Refreshing metrics…" : "Refresh metrics"}
            </button>
          </div>
          {metricsError && (
            <p role="alert" className="text-sm text-[#a7302d]">
              Metrics could not be refreshed. Showing the last loaded counts.{" "}
              {metricsError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Profile views", business.metrics.views],
              ["Calls", business.metrics.calls],
              ["WhatsApp", business.metrics.whatsapp],
              ["Directions clicks", business.metrics.directions],
              ["Booking requests", business.metrics.bookingRequests],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-xl bg-white p-4 signboard-border"
              >
                <p className="text-xs text-[#667064]">{label}</p>
                <p className="font-display text-3xl font-bold text-[#243b32]">
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Performance & ROI Transparency Breakdown */}
          <div className="rounded-xl border border-[#dfe5d8] bg-white p-5 signboard-shadow-sm space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display text-base font-bold text-[#243b32]">
                  Customer Engagement & Conversion Rate
                </h3>
                <p className="text-xs text-[#667064]">
                  Track interest in your shop from profile visits and contact
                  taps
                </p>
              </div>
              <span className="rounded-full bg-[#edf2e5] px-3 py-1 text-xs font-bold text-[#335e41]">
                Transparent ROI
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-lg bg-[#f7f8f2] p-3 border border-[#dfe5d8]">
                <p className="text-xs text-[#667064]">Search impressions</p>
                <p className="font-display text-2xl font-bold text-[#243b32]">
                  {business.metrics.impressions ?? 0}
                </p>
                <p className="text-[11px] text-[#667064] mt-1">
                  Times your shop appeared in campus searches
                </p>
              </div>
              <div className="rounded-lg bg-[#f7f8f2] p-3 border border-[#dfe5d8]">
                <p className="text-xs text-[#667064]">
                  Direct customer contacts
                </p>
                <p className="font-display text-2xl font-bold text-[#243b32]">
                  {business.metrics.calls +
                    business.metrics.whatsapp +
                    business.metrics.directions +
                    business.metrics.bookingRequests}
                </p>
                <p className="text-[11px] text-[#667064] mt-1">
                  Calls, WhatsApp, directions & bookings
                </p>
              </div>
              <div className="rounded-lg bg-[#f7f8f2] p-3 border border-[#dfe5d8]">
                <p className="text-xs text-[#667064]">
                  Contact taps per 100 views
                </p>
                <p className="font-display text-2xl font-bold text-[#335e41]">
                  {business.metrics.views > 0
                    ? `${Math.round(((business.metrics.calls + business.metrics.whatsapp + business.metrics.directions + business.metrics.bookingRequests) / business.metrics.views) * 100)}%`
                    : "0%"}
                </p>
                <p className="text-[11px] text-[#667064] mt-1">
                  Repeat contact taps may come from the same visitor
                </p>
              </div>
            </div>
          </div>

          <div className={panelClass}>
            <h2 className="font-display text-xl font-bold">Promotion status</h2>
            <p className="text-sm">
              {tierActive
                ? `${business.activeTier} placement until ${new Date(business.tierEndsAt!).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" })}`
                : "Free organic listing"}
            </p>
            <p className="text-xs text-[#667064]">
              Paid placement activates after payment verification.
            </p>
          </div>
        </div>
      )}

      {["overview", "bookings"].includes(activeTab) && (
        <section className={panelClass}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold">
              Customer booking requests
            </h2>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void refreshCollection("bookings")}
              className="flex items-center gap-1 text-xs font-bold text-[#335e41]"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
          </div>
          <p className="text-sm leading-relaxed text-[#667064]">Contact the customer to agree on the appointment before confirming a request. Status changes are saved immediately.</p>
          <div className="grid gap-3 rounded-xl border border-[#e4eadf] bg-[#f8faf5] p-3 sm:grid-cols-[minmax(0,1fr)_190px] sm:items-end">
            <label className="block text-xs font-bold text-[#334d3b]">
              Search bookings
              <input type="search" value={bookingQuery} onChange={(event) => setBookingQuery(event.target.value)} placeholder="Customer, service or phone" className={inputClass} />
            </label>
            <label className="block text-xs font-bold text-[#334d3b]">
              Show requests
              <select value={bookingFilter} onChange={(event) => setBookingFilter(event.target.value as typeof bookingFilter)} className={inputClass}>
                <option value="OPEN">Open (new & confirmed)</option>
                <option value="NEW">New only</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="ALL">All requests</option>
              </select>
            </label>
          </div>
          <p aria-live="polite" className="text-xs text-[#647267]">Showing {visibleBookings.length} of {bookings.length} requests. {pendingBookings} new.</p>
          {bookingError ? (
            <p role="alert" className="text-sm text-[#a7302d]">
              {bookingError}
            </p>
          ) : !visibleBookings.length ? (
            <p className="rounded-xl border border-dashed border-[#d8e2d5] bg-[#f8faf5] p-5 text-sm text-[#667064]">{bookings.length ? "No requests match these filters. Try another status or search." : "No booking requests yet. New customer requests will appear here."}</p>
          ) : (
            <div className="divide-y divide-[#dfe5d8]">
              {visibleBookings.map((booking) => (
                <article key={booking.id} className="space-y-2 py-3.5">
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <h3 className="font-bold">{booking.serviceName}</h3>
                      <p className="text-sm text-[#667064]">
                        {booking.day} · {booking.time}
                      </p>
                    </div>
                    <label className="text-xs font-bold">
                      Request status
                      <select
                        aria-label={`Status for ${booking.studentName}'s booking`}
                        disabled={Boolean(busy)}
                        value={booking.status || "NEW"}
                        onChange={(event) =>
                          void runAction(
                            booking.id,
                            async () => {
                              const updated = await fetch("/api/bookings", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  id: booking.id,
                                  status: event.target.value,
                                }),
                              }).then(readResponse<Booking>);
                              setBookings((items) =>
                                items.map((item) =>
                                  item.id === updated.id ? updated : item,
                                ),
                              );
                            },
                            "Booking status updated.",
                          )
                        }
                        className={inputClass}
                      >
                        {["NEW", "CONFIRMED", "COMPLETED", "CANCELLED"].map(
                          (status) => (
                            <option key={status}>{status}</option>
                          ),
                        )}
                      </select>
                    </label>
                  </div>
                  <p className="text-sm">
                    <strong>{booking.studentName}</strong>
                    {booking.contactPhone && (
                      <>
                        {" "}
                        ·{" "}
                        <a
                          className="font-bold text-[#335e41]"
                          href={`tel:${booking.contactPhone}`}
                        >
                          {booking.contactPhone}
                        </a>{" "}
                        ·{" "}
                        <a
                          target="_blank"
                          rel="noopener noreferrer"
                          href={`https://wa.me/${booking.contactPhone.replace(/\D/g, "").replace(/^0/, "254")}`}
                          className="font-bold text-[#335e41]"
                        >
                          WhatsApp
                        </a>
                      </>
                    )}
                  </p>
                  {booking.note && (
                    <p className="whitespace-pre-wrap text-sm text-[#667064]">
                      {booking.note}
                    </p>
                  )}
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === "overview" && (
        <div className="space-y-5">
          <LeadTimeline slug={slug} />
          <RequestBoard compact />
        </div>
      )}
      {activeTab === "services" && (
        <section className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-bold">Products and services</h2>
              <p className="mt-1 text-sm text-[#65746a]">Make it easy for customers to see what you offer.</p>
            </div>
            <button type="button" disabled={Boolean(busy)} onClick={() => { resetService(); setShowServiceForm(true); }} className="inline-flex min-h-11 items-center rounded-xl bg-[#24543b] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#34734e]">+ Add an item</button>
          </div>
          <div className="grid gap-3 rounded-xl border border-[#e4eadf] bg-[#f8faf5] p-3 sm:grid-cols-[minmax(0,1fr)_180px] sm:items-end">
            <label className="block text-xs font-bold text-[#334d3b]">Search catalogue
              <input type="search" value={catalogQuery} onChange={(event) => setCatalogQuery(event.target.value)} placeholder="Find an item by name" className={inputClass} />
            </label>
            <label className="block text-xs font-bold text-[#334d3b]">Sort items
              <select value={serviceSort} onChange={(event) => setServiceSort(event.target.value as typeof serviceSort)} className={inputClass}>
                <option value="listed">Listing order</option>
                <option value="name">Name A to Z</option>
                <option value="stock">Available first</option>
              </select>
            </label>
          </div>
          <p aria-live="polite" className="text-xs text-[#65746a]">Showing {visibleServices.length} of {business.services.length} items</p>
          {(showServiceForm || serviceId) && (
          <form
            onSubmit={saveService}
            id="catalog-editor"
            className="scroll-mt-28 space-y-3 rounded-2xl border border-[#d7e5ce] bg-[#f3f8ed] p-4 sm:p-5"
          >
            <fieldset
              disabled={
                (Boolean(busy) && busy !== "service-photo") ||
                (!serviceId && !canAddProduct)
              }
              className="space-y-3 disabled:opacity-50"
            >
              <h3 className="font-bold">
                {serviceId ? "Edit catalogue item" : "Add a product or service"}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold">
                  Name
                  <input
                    required
                    maxLength={120}
                    value={serviceName}
                    onChange={(event) => setServiceName(event.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="text-xs font-bold">
                  Starting price (KSh, optional)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={servicePrice}
                    onChange={(event) => setServicePrice(event.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <label className="block text-xs font-bold">
                Note
                <input
                  maxLength={500}
                  value={serviceNote}
                  onChange={(event) => setServiceNote(event.target.value)}
                  className={inputClass}
                />
              </label>
              <PhotoUploader
                label="Product / service photo (optional)"
                businessId={business.id}
                disabled={Boolean(busy) || storageFull}
                disabledReason={
                  storageFull
                    ? "Your Free storage is full. Remove unused photos or renew Pro to upload more."
                    : undefined
                }
                onBusyChange={(uploading) => {
                  setBusy(uploading ? "service-photo" : "");
                  if (!uploading) setStorageRefresh((value) => value + 1);
                }}
                onUploaded={(photos) => {
                  discardDraftPhoto(servicePhoto);
                  setServicePhoto(photos[0]);
                }}
                readyMessage="Uploaded and ready. Save the item to attach this photo."
                saveMessage="Adding photo to your draft…"
              />
              {servicePhoto && (
                <div className="flex items-center gap-3">
                  <Image
                    unoptimized
                    width={1200}
                    height={800}
                    src={servicePhoto}
                    alt="Selected product"
                    className="h-20 w-20 rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      discardDraftPhoto(servicePhoto);
                      setServicePhoto("");
                    }}
                    className="text-xs font-bold text-[#a7302d]"
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  disabled={Boolean(busy)}
                  className={buttonClass}
                  type="submit"
                >
                  {busy === "service"
                    ? "Saving..."
                    : serviceId
                      ? "Save item"
                      : "Add item"}
                </button>
                {(serviceId || showServiceForm) && (
                  <button
                    type="button"
                    onClick={resetService}
                    className="min-h-11 rounded-xl border border-[#cadbc9] bg-white px-4 py-2 text-sm font-bold text-[#335e41]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </fieldset>
          </form>
          )}
          {!visibleServices.length && (
            <div className="rounded-xl border border-dashed border-[#d8e2d5] bg-[#f8faf5] p-5 text-sm text-[#65746a]">
              {business.services.length ? "No catalogue items match that search." : "Your catalogue is empty. Add your first product or service to get started."}
            </div>
          )}
          {!!visibleServices.length && (
            <div className="divide-y divide-[#e6ede4] overflow-hidden rounded-xl border border-[#e2e9df]">
              {visibleServices.map((service) => (
                <article key={service.id} className="space-y-3 bg-white px-3 py-3.5 sm:px-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-3">
                    {service.photo ? (
                      <Image unoptimized src={service.photo} width={56} height={56} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-[#e0e8dd] object-cover" />
                    ) : (
                      <div aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#eff4e8] text-lg text-[#6a7d66]">◈</div>
                    )}
                    <div className="min-w-0 flex-[1_1_150px]">
                      <h3 className="break-words text-sm font-bold text-[#234032]">{service.name}</h3>
                      <p className="mt-0.5 text-xs font-semibold text-[#526657]">{service.priceFrom !== undefined ? "KSh " + service.priceFrom.toLocaleString("en-KE") : "Price on request"}</p>
                      {service.note && <p className="mt-0.5 line-clamp-2 text-xs text-[#708074]">{service.note}</p>}
                    </div>
                    <span className={"shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold " + (service.inStock === false ? "bg-[#fff0e5] text-[#925530]" : "bg-[#e9f4e7] text-[#387048]")}>
                      {service.inStock === false ? "Sold out" : "Available"}
                    </span>
                    <div className="flex w-full flex-wrap gap-2 sm:ml-auto sm:w-auto">
                      <button type="button" disabled={Boolean(busy)} onClick={() => void runAction("stock", () => mutateProduct("PATCH", { ...service, inStock: service.inStock === false }), "Availability updated.")} className="min-h-10 rounded-lg border border-[#d7e2d2] bg-[#f7faf3] px-3 py-2 text-xs font-bold text-[#345e43] transition-colors hover:bg-[#eaf3de] disabled:opacity-50">
                        {service.inStock === false ? "Mark available" : "Mark sold out"}
                      </button>
                      <button type="button" disabled={Boolean(busy)} onClick={() => {
                        discardDraftPhoto(servicePhoto);
                        setServiceId(service.id);
                        setServiceName(service.name);
                        setServicePrice(service.priceFrom === undefined ? "" : String(service.priceFrom));
                        setServiceNote(service.note || "");
                        setServicePhoto(service.photo || "");
                        setShowServiceForm(true);
                        window.requestAnimationFrame(() => document.getElementById("catalog-editor")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
                      }} className="min-h-10 rounded-lg border border-[#cadbc9] bg-white px-3 py-2 text-xs font-bold text-[#335e41] transition-colors hover:bg-[#f3f8ee] disabled:opacity-50">Edit</button>
                      <button type="button" aria-label={"Remove " + service.name} disabled={Boolean(busy)} onClick={() => setConfirmDeleteServiceId(service.id)} className="flex min-h-10 min-w-10 items-center justify-center rounded-lg border border-[#f0d4cd] text-[#a7302d] transition-colors hover:bg-[#fceeea] disabled:opacity-50"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </div>
                  {confirmDeleteServiceId === service.id && (
                    <div role="group" aria-label={"Remove " + service.name} className="rounded-xl border border-[#efc5bd] bg-[#fff4f0] p-3 text-sm">
                      <p className="font-bold text-[#913a30]">Remove “{service.name}” from your catalogue?</p>
                      <p className="mt-1 text-xs text-[#7e554e]">This will remove the item from your public profile.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button type="button" disabled={Boolean(busy)} onClick={() => void runAction("remove-service", async () => { await mutateProduct("DELETE", { id: service.id }); setConfirmDeleteServiceId(null); }, "Item removed.")} className="min-h-10 rounded-lg bg-[#993f35] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">Remove item</button>
                        <button type="button" onClick={() => setConfirmDeleteServiceId(null)} className="min-h-10 rounded-lg border border-[#d7bab3] bg-white px-3 py-2 text-xs font-bold text-[#633e37]">Keep item</button>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

        </section>
      )}

          {activeTab === "services" && (
            <CatalogPlanPanel
            business={business}
            refreshKey={storageRefresh}
            onUsage={setStorageUsage}
          />
          )}
      {activeTab === "details" && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void runAction("details", () => {
              const update = { ...draft };
              Object.assign(update, {
                mapPin:
                  draft.latitude && draft.longitude
                    ? {
                        lat: Number(draft.latitude),
                        lng: Number(draft.longitude),
                      }
                    : null,
              });
              if ((draft.latitude === "") !== (draft.longitude === ""))
                return Promise.reject(
                  new Error("Enter both map coordinates or leave both blank."),
                );
              return patchBusiness(update);
            });
          }}
          className={panelClass}
        >
          <h2 className="font-display text-xl font-bold">
            Edit business information
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                "name",
                "tagline",
                "phone",
                "whatsapp",
                "landmark",
                "address",
                "studentDiscount",
              ] as const
            ).map((field) => (
              <label key={field} className="text-xs font-bold capitalize">
                {detailLabels[field]}
                <input
                  type={
                    field === "phone" || field === "whatsapp" ? "tel" : "text"
                  }
                  required={["name", "phone", "whatsapp", "landmark"].includes(
                    field,
                  )}
                  maxLength={
                    field === "phone" || field === "whatsapp" ? 20 : 300
                  }
                  value={draft[field]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
            ))}
            <div className="text-xs font-bold">
              <span>Business type</span>
              <CategorySelect
                required
                value={draft.primaryCategory}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    primaryCategory: value,
                  }))
                }
                className={inputClass}
              />
            </div>
            <label className="text-xs font-bold">
              Zone
              <select
                aria-label="Zone"
                value={draft.zone}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    zone: event.target.value,
                  }))
                }
                className={inputClass}
              >
                {ZONES.filter((zone) => zone.slug !== "all").map((zone) => (
                  <option key={zone.slug} value={zone.slug}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="rounded-xl border border-[#dfe5d8] p-4 space-y-3">
            <p className="text-xs text-[#667064]">
              Update your map pin when the business moves. Leave both
              coordinates blank to remove the pin.
            </p>
            <button
              type="button"
              className="text-xs font-bold text-[#335e41]"
              onClick={() => {
                if (!navigator.geolocation) {
                  setError("Location is unavailable on this device.");
                  return;
                }
                navigator.geolocation.getCurrentPosition(
                  (position) =>
                    setDraft((current) => ({
                      ...current,
                      latitude: String(position.coords.latitude),
                      longitude: String(position.coords.longitude),
                    })),
                  () =>
                    setError(
                      "Allow location access or enter coordinates manually.",
                    ),
                  { enableHighAccuracy: true, timeout: 15000 },
                );
              }}
            >
              Use current location
            </button>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold">
                Latitude
                <input
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={draft.latitude}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      latitude: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-bold">
                Longitude
                <input
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={draft.longitude}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      longitude: event.target.value,
                    }))
                  }
                  className={inputClass}
                />
              </label>
            </div>
          </div>
          <label className="block text-xs font-bold">
            Description
            <textarea
              rows={5}
              maxLength={5000}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              className={inputClass}
            />
          </label>
          <button
            disabled={Boolean(busy)}
            type="submit"
            className={buttonClass}
          >
            {busy === "details" ? "Saving..." : "Save business information"}
          </button>
        </form>
      )}

      {activeTab === "photos" && (
        <section className={panelClass}>
          <h2 className="font-display text-xl font-bold">Business photos</h2>
          <p className="text-sm text-[#667064]">
            Your shop gallery has room for 8 photos. Photos still used by a
            product stay in storage until removed from that product too. Product
            photos are separate. JPEG, PNG or WebP up to 5 MB each,
            automatically compressed; Free includes 25 MB total and Pro has
            unlimited total image storage.
          </p>
          <PhotoUploader
            label="Add business photos"
            businessId={business.id}
            multiple
            maxFiles={8 - business.photos.length}
            disabled={
              Boolean(busy) || storageFull || business.photos.length >= 8
            }
            disabledReason={
              storageFull
                ? "Your Free storage is full. Remove unused photos or renew Pro to upload more."
                : business.photos.length >= 8
                  ? "Your gallery is full. Remove a photo before adding more."
                  : undefined
            }
            onBusyChange={(uploading) => {
              setBusy(uploading ? "photos" : "");
              if (!uploading) setStorageRefresh((value) => value + 1);
            }}
            onUploaded={(photos) =>
              patchBusiness({
                photos: [...business.photos, ...photos],
                coverPhoto: business.coverPhoto || photos[0],
              })
            }
            readyMessage="Done. Your photos are saved to the business gallery."
          />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {business.photos.map((photo, index) => (
              <div key={`${photo}-${index}`} className="space-y-2">
                <Image
                  unoptimized
                  width={320}
                  height={240}
                  src={photo}
                  alt={`${business.name} photo ${index + 1}`}
                  className="h-36 w-full rounded-lg object-cover"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy) || business.coverPhoto === photo}
                    onClick={() =>
                      void runAction("cover", () =>
                        patchBusiness({ coverPhoto: photo }),
                      )
                    }
                    className="text-xs font-bold text-[#335e41] disabled:opacity-50"
                  >
                    {business.coverPhoto === photo
                      ? "Cover photo"
                      : "Use as cover"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() =>
                      void runAction("remove-photo", () => {
                        const photos = business.photos.filter(
                          (_, position) => position !== index,
                        );
                        return patchBusiness({
                          photos,
                          coverPhoto:
                            business.coverPhoto === photo
                              ? photos[0] || ""
                              : business.coverPhoto,
                        });
                      })
                    }
                    className="text-xs font-bold text-[#a7302d]"
                  >
                    {busy === "remove-photo" || busy === "remove-service"
                      ? "Removing…"
                      : "Remove"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "hours" && (
        <form
          className={panelClass}
          onSubmit={(event) => {
            event.preventDefault();
            void runAction("hours", () => patchBusiness({ hours }));
          }}
        >
          <h2 className="font-display text-xl font-bold">
            Opening hours (Kenya time)
          </h2>
          {days.map((day) => (
            <div
              key={day}
              className="flex flex-wrap items-center gap-3 border-b border-[#dfe5d8] pb-3"
            >
              <strong className="w-24 text-sm">{day}</strong>
              <label className="text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(hours[day]?.closed)}
                  onChange={(event) =>
                    setHours((current) => ({
                      ...current,
                      [day]: { ...current[day], closed: event.target.checked },
                    }))
                  }
                />{" "}
                Closed
              </label>
              <label className="text-xs">
                Open
                <input
                  aria-label={`${day} opening time`}
                  type="time"
                  disabled={hours[day]?.closed}
                  required={!hours[day]?.closed}
                  value={hours[day]?.open || "08:00"}
                  onChange={(event) =>
                    setHours((current) => ({
                      ...current,
                      [day]: { ...current[day], open: event.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs">
                Close
                <input
                  aria-label={`${day} closing time`}
                  type="time"
                  disabled={hours[day]?.closed}
                  required={!hours[day]?.closed}
                  value={hours[day]?.close || "18:00"}
                  onChange={(event) =>
                    setHours((current) => ({
                      ...current,
                      [day]: { ...current[day], close: event.target.value },
                    }))
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs">
                <input
                  type="checkbox"
                  checked={Boolean(hours[day]?.appointmentOnly)}
                  onChange={(event) =>
                    setHours((current) => ({
                      ...current,
                      [day]: {
                        ...current[day],
                        appointmentOnly: event.target.checked,
                      },
                    }))
                  }
                />{" "}
                Appointment only
              </label>
            </div>
          ))}
          <button
            disabled={Boolean(busy)}
            type="submit"
            className={buttonClass}
          >
            Save opening hours
          </button>
        </form>
      )}

      {activeTab === "billing" && (
        <section className={panelClass}>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">Payment history</h2>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void refreshCollection("payments")}
              className="text-xs font-bold text-[#335e41]"
            >
              Refresh
            </button>
          </div>
          {billingError ? (
            <p role="alert" className="text-sm text-[#a7302d]">
              {billingError}
            </p>
          ) : payments.length ? (
            <div className="divide-y divide-[#dfe5d8]">
              {payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap justify-between gap-3 py-3"
                >
                  <div>
                    <p className="text-sm font-bold">
                      {PAYMENT_PLAN_LABELS[payment.planId]} ·{" "}
                      {payment.planId === "PRO"
                        ? "1 calendar month"
                        : payment.planId === "DEAL_BLAST"
                          ? "24 hours"
                          : `${payment.weeks} ${payment.weeks === 1 ? "week" : "weeks"}`}
                    </p>
                    <p className="text-xs text-[#667064]">
                      {new Date(payment.createdAt).toLocaleString("en-GB", {
                        timeZone: "Africa/Nairobi",
                      })}
                    </p>
                    {payment.receiptNumber && (
                      <p className="text-xs">
                        Receipt: {payment.receiptNumber}
                      </p>
                    )}
                    {payment.failedReason && (
                      <p className="text-xs text-[#a7302d]">
                        {payment.failedReason}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">
                      KES {payment.amountKes.toLocaleString()}
                    </p>
                    <p className="text-xs">
                      {PAYMENT_STATE_LABELS[payment.state]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#667064]">
              No payments yet. Upgrade to Pro or buy a promotion through
              IntaSend checkout.
            </p>
          )}
        </section>
      )}

      {activeTab === "share" && (
        <section className={panelClass}>
          <h2 className="font-display text-xl font-bold">
            Share your public profile
          </h2>
          <TrustShare business={business} />
          <p className="text-sm text-[#667064]">
            Post your business link on WhatsApp Status or send it to customers.
          </p>
          <button
            type="button"
            className={buttonClass}
            onClick={() =>
              void runAction(
                "copy",
                () =>
                  navigator.clipboard.writeText(
                    `${window.location.origin}/b/${business.slug}`,
                  ),
                "Public profile link copied.",
              )
            }
          >
            Copy profile link
          </button>
          <Link
            href={`/b/${business.slug}`}
            className="block text-sm font-bold text-[#335e41]"
          >
            Open public profile →
          </Link>
        </section>
      )}
        </div>
      </div>
    </main>
  );
}

export default function BusinessDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  return (
    <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]">
      <Navbar />
      <AccountGate requiredRole="BUSINESS" slug={slug}>
        <Suspense fallback={<p role="status">Loading dashboard…</p>}>
          <BusinessDashboard key={slug} slug={slug} />
        </Suspense>
      </AccountGate>
      <Footer />
      <BottomNav />
    </div>
  );
}
