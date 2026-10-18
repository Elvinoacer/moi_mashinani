"use client";
import { useEffect, useState } from "react";
import Link from "@/components/MotionLink";
import type { Business, ServiceRequest } from "@/lib/types";
import { CATEGORIES, ZONES } from "@/lib/constants";
import { CampusZonePicker } from "./CampusZonePicker";
import { ArrowRight, Check, ChevronDown, MapPin, MessageCircle, MessageCircleOff, Plus, Search, X } from "lucide-react";
import { DemandModal } from "./DemandModal";
import { CampusPushOptIn } from "./CampusPushOptIn";
import { Button } from "./ui/Button";
import { useNow } from "@/lib/useNow";
import { useCampusZone } from "@/lib/useCampusZone";
import { type HousingIntent } from "@/lib/housing";
import { HousingSafetyNotice } from "./HousingSafetyNotice";
import { ModalFrame } from "./ModalFrame";
type PublicRequest = Omit<ServiceRequest, "contactPhone"> & {
  canRespond?: boolean;
};
export function RequestBoard({ compact = false, housingOnly = false }: { compact?: boolean; housingOnly?: boolean }) {
  const now = useNow();
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState("");
  const [zone, setZone] = useCampusZone();
  const [post, setPost] = useState(false);
  const [postIntent, setPostIntent] = useState<HousingIntent>("LOOKING");
  const [housingFilter, setHousingFilter] = useState<"all" | HousingIntent>("all");
  const [housingReply, setHousingReply] = useState<PublicRequest | null>(null);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [keyword, setKeyword] = useState("");
  const [showCount, setShowCount] = useState(8);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [receipts, setReceipts] = useState<Record<string, string>>({});
  const [mineOnly, setMineOnly] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function load() {
      if (inFlight || document.visibilityState === "hidden") return;
      inFlight = true;
      try {
        const response = await fetch("/api/demand", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Requests could not load.");
        setRequests(data);
        setError("");
        try {
          setReceipts(
            JSON.parse(localStorage.getItem("mm-request-receipts") || "{}"),
          );
        } catch {
          /* Storage optional. */
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Connection error.",
          );
      } finally {
        inFlight = false;
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (housingOnly) return;
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const eligible = (data.businesses || []).filter(
          (b: Business) =>
            b.status === "ACTIVE" &&
            b.verificationLevel === "L2" &&
            b.isClaimed &&
            !b.isTemporarilyClosed,
        );
        if (!controller.signal.aborted) {
          setBusinesses(eligible);
          setSelected(eligible[0]?.id || "");
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [housingOnly]);
  const [upgradeRequired, setUpgradeRequired] = useState(false);
  async function respond(id: string, housing = false) {
    if (busy) return;
    const chat = window.open("about:blank", "_blank");
    if (chat) chat.opener = null;
    setBusy(id);
    setError("");
    setUpgradeRequired(false);
    try {
      const response = await fetch(`/api/demand/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(housing ? { safetyAcknowledged } : { businessId: selected }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 402) setUpgradeRequired(true);
        throw new Error(data.error || "Could not respond.");
      }
      if (chat) chat.location.href = data.url;
      else window.location.assign(data.url);
      setHousingReply(null);
    } catch (cause) {
      chat?.close();
      setError(cause instanceof Error ? cause.message : "Could not respond.");
    } finally {
      setBusy("");
    }
  }
  async function close(id: string) {
    setBusy(id);
    setError("");
    try {
      const response = await fetch("/api/demand", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, manageToken: receipts[id] }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setRefresh((r) => r + 1);
      setConfirmId(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not close.");
    } finally {
      setBusy("");
    }
  }

  const selectedBiz = businesses.find((b) => b.id === selected) || businesses[0];
  const isSelectedPaid = Boolean(
    selectedBiz &&
      ((selectedBiz.proEndsAt && Date.parse(selectedBiz.proEndsAt) > now) ||
        ((selectedBiz.activeTier === "RECOMMENDED" ||
          selectedBiz.activeTier === "FEATURED") &&
          selectedBiz.tierEndsAt &&
          Date.parse(selectedBiz.tierEndsAt) > now)),
  );

  const categoryName = (slug?: string) =>
    slug ? CATEGORIES.find((c) => c.slug === slug)?.name || "" : "";
  const active = requests.filter((r) =>
    !r.closedAt && Date.parse(r.createdAt) > now - 7 * 864e5 && (housingOnly ? Boolean(r.housingIntent) : !r.housingIntent),
  );
  const myCount = active.filter((r) => receipts[r.id]).length;
  const showMine = mineOnly && myCount > 0;
  const visible = active.filter((r) =>
    (!housingOnly || housingFilter === "all" || r.housingIntent === housingFilter) &&
    (showMine ? Boolean(receipts[r.id]) : zone === "all" || r.zone === "all" || r.zone === zone) &&
    (keyword.trim() === "" || (r.query + " " + (ZONES.find((z) => z.slug === r.zone)?.name || "") + " " + categoryName(r.category)).toLowerCase().includes(keyword.toLowerCase().trim()))
  ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const shown = compact ? visible.slice(0, 2) : visible.slice(0, showCount);
  const emptyPrimaryActionClass = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#183e35] px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#2b5949] active:bg-[#102f28] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#48785c] sm:w-auto";
  const emptySecondaryActionClass = "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#c9d8ce] bg-white px-4 py-2.5 text-sm font-bold text-[#183e35] transition-colors hover:border-[#789b86] hover:bg-[#f0f6ef] active:bg-[#e4eee3] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#48785c] sm:w-auto";
  return (
    <section className={compact ? "space-y-4" : "requests-board space-y-5"} aria-label={housingOnly ? "Community housing board" : "Comrade requests"}>
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Comrade requests</h2>
            <p className="text-sm text-[#5c6f60]">See what people need around campus. Housing is open to everyone; other requests take verified seller replies.</p>
          </div>
          <Button onClick={() => setPost(true)}>Post a request <ArrowRight size={16} aria-hidden="true" /></Button>
        </div>
      ) : (
        <>
          <div className="requests-hero">
            <div className="requests-hero-copy">
              <p className="requests-eyebrow"><span className="requests-eyebrow-dot" aria-hidden="true" />MOI UNIVERSITY · COMMUNITY BOARD</p>
              <h1 className="requests-hero-title">{housingOnly ? "A place to stay." : "Campus needs."}<br /><span>{housingOnly ? "A way to help." : "Real connections."}</span></h1>
              <p className="requests-hero-lead">
                {housingOnly ? "Find a house or rental, list a vacancy, or share a place you know. Posting and replying are free for everyone. No account needed." : "Discover what students around campus are looking for. If you can help, connect directly with them."}
              </p>
            </div>
            <div className="requests-post-card">
              <p className="requests-post-eyebrow"><Plus size={15} aria-hidden="true" /> {housingOnly ? "FREE COMMUNITY HOUSING" : "FOR PEOPLE LOOKING FOR SOMETHING"}</p>
              <h2>{housingOnly ? "Looking or letting?" : "Need something?"}</h2>
              <p>{housingOnly ? "You can post a vacancy even if you are a comrade moving out or simply know of a place." : "Tell the campus what you are looking for. Posting is free and does not require an account."}</p>
              <button type="button" className="requests-post-button" onClick={() => setPost(true)}>
                <Plus size={17} aria-hidden="true" /> {housingOnly ? "I'm looking for a house" : "Post a request"} <ArrowRight size={17} aria-hidden="true" />
              </button>
              {housingOnly && <button type="button" className="requests-post-button" onClick={() => { setPostIntent("VACANCY"); setPost(true); }}><Plus size={17} aria-hidden="true" /> List a vacancy — free</button>}
            </div>
          </div>
          <nav aria-label="Community boards" className="flex flex-wrap gap-3 text-sm font-bold text-[#205342]">
            <Link href="/requests" aria-current={!housingOnly ? "page" : undefined} className="underline underline-offset-4">Requests for products & services</Link>
            <Link href="/housing" aria-current={housingOnly ? "page" : undefined} className="underline underline-offset-4">Housing: vacancies & house seekers</Link>
          </nav>
          {housingOnly ? <HousingSafetyNotice /> : <CampusPushOptIn
            variant="request-board"
            zone={zone}
            keyword={keyword.trim() || undefined}
          />}
          <div className="requests-filters" role="search" aria-label="Search campus requests">
            <div className="requests-filters-heading">
              <h2>{housingOnly ? "Explore housing posts" : "Explore requests"}</h2>
              <p>Filter posts by keyword or campus area. Searching never publishes a request.</p>
            </div>
            <div className="request-board-toolbar">
              <div className="requests-search-field">
                <label className="requests-field-label" htmlFor="requests-search-input">{housingOnly ? "Search housing posts" : "Search existing requests"}</label>
                <div className="requests-search-box">
                  <Search size={20} aria-hidden="true" />
                  <input
                    id="requests-search-input"
                    type="search"
                    value={keyword}
                    autoComplete="off"
                    placeholder={housingOnly ? "e.g. bedsitter, single room, campus name" : "e.g. charger, bedsitter, fundi"}
                    onChange={(event) => { setKeyword(event.target.value); setShowCount(8); }}
                  />
                  {keyword && (
                    <button type="button" className="requests-clear-input" aria-label="Clear request search"
                      onClick={() => { setKeyword(""); setShowCount(8); }}>
                      <X size={18} aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
              <div className="request-board-zone">
                <CampusZonePicker value={zone} onChange={(value) => { setZone(value); setShowCount(8); }} />
              </div>
            </div>
            {housingOnly && <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Housing post type">
              {([['all', 'All housing'], ['VACANCY', 'Vacancies available'], ['LOOKING', 'Looking for a house']] as const).map(([value, label]) => (
                <button type="button" key={value} aria-pressed={housingFilter === value} className={`rounded-full border px-4 py-2 text-sm font-bold ${housingFilter === value ? "border-[#183e35] bg-[#183e35] text-white" : "border-[#bed0bd] bg-white text-[#183e35]"}`} onClick={() => { setHousingFilter(value); setShowCount(8); }}>{label}</button>
              ))}
            </div>}
          </div>
        </>
      )}
      {!housingOnly && businesses.length > 0 && selectedBiz && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#dce5d7] bg-[#f7faf5] px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            {businesses.length > 1 ? (
              <label className="flex flex-wrap items-center gap-2 font-semibold text-[#183e35]">
                Reply as
                <select className="ui-input max-w-xs" value={selected} onChange={(e) => setSelected(e.target.value)}>
                  {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
            ) : (
              <span className="font-semibold text-[#183e35]">
                Replying as verified seller: <strong>{selectedBiz.name}</strong>
              </span>
            )}
            <span className="rounded-full bg-[#e9eedf] px-2.5 py-0.5 text-xs font-bold text-[#244b37]">
              {isSelectedPaid ? "✓ Unlimited Lead Replies Active" : "Free Tier: 3 Lead Replies / Month"}
            </span>
          </div>
          {!isSelectedPaid && (
            <Link
              href={`/dashboard/${selectedBiz.slug}?tab=billing`}
              className="text-xs font-bold text-[#183e35] underline hover:text-[#335e41]"
            >
              Unlock unlimited student leads →
            </Link>
          )}
        </div>
      )}
      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3.5 text-sm text-red-800 space-y-2">
          <p>{error}</p>
          {upgradeRequired && selectedBiz && (
            <Link
              href={`/dashboard/${selectedBiz.slug}?tab=billing`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#183e35] px-3.5 py-2 text-xs font-bold text-white"
            >
              Upgrade {selectedBiz.name} for Unlimited Leads <ArrowRight size={14} aria-hidden="true" />
            </Link>
          )}
        </div>
      )}
      {!compact && (
        <div className="requests-results-header" id="requests-results">
          <div>
            <p className="requests-section-kicker">FROM AROUND CAMPUS</p>
            <h2>{housingOnly ? "Latest housing posts" : "Latest requests"}</h2>
            <p className="requests-results-description">Newest first · Posts remain visible for seven days</p>
          </div>
          <div className="requests-results-tools">
            <span className="requests-results-count" role="status">
              {loading ? "Loading…" : visible.length + (housingOnly ? visible.length === 1 ? " housing post" : " housing posts" : visible.length === 1 ? " active request" : " active requests")}
            </span>
            {myCount > 0 && (
              <button
                type="button"
                className="requests-reset"
                aria-pressed={showMine}
                onClick={() => { setMineOnly((value) => !value); setShowCount(8); }}
              >
                {showMine ? "Show all posts" : `${housingOnly ? "My housing posts" : "My requests"} (${myCount})`}
              </button>
            )}
            {(keyword || zone !== "all" || showMine || housingFilter !== "all") && (
              <button type="button" className="requests-reset" onClick={() => { setKeyword(""); setZone("all"); setMineOnly(false); setHousingFilter("all"); setShowCount(8); }}>
                Clear filters
              </button>
            )}
          </div>
        </div>
      )}
      {loading ? (
        <div role="status" className="grid gap-3 sm:grid-cols-2" aria-label="Loading requests">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-36 rounded-2xl bg-[#e8efe5] animate-pulse" />)}
        </div>
      ) : !visible.length ? (
        <div className={compact ? "ui-card flex flex-col items-start gap-3 px-4 py-5 sm:px-6 sm:py-6" : "requests-empty"}>
          <span
            className={compact ? "grid size-11 shrink-0 place-items-center rounded-xl bg-[#edf5e9] text-[#34684d]" : "requests-empty-icon"}
            aria-hidden="true"
          ><Search size={23} /></span>
          <h3 className={compact ? "text-base font-extrabold leading-snug text-[#183e35] sm:text-lg" : undefined}>
            {error && !requests.length ? "Posts could not load" : housingOnly ? "No matching housing posts yet" : "No matching requests yet"}
          </h3>
          <p className={compact ? "max-w-xl text-sm leading-relaxed text-[#5e7062]" : undefined}>{error && !requests.length
            ? "Check your connection and try again."
            : housingOnly ? "Try another area or post a house search or vacancy. Everyone is welcome to help." : "Try a different search or campus area. You can also ask the campus for what you need."}</p>
          <div className="mt-1 grid w-full grid-cols-1 gap-2.5 sm:flex sm:flex-wrap sm:items-center">
            {error && !requests.length ? (
              <button type="button" className={emptyPrimaryActionClass} onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>
                Try again <ArrowRight className="shrink-0" size={16} aria-hidden="true" />
              </button>
            ) : (keyword || zone !== "all" || housingFilter !== "all") ? (
              <button type="button" className={emptyPrimaryActionClass} onClick={() => { setKeyword(""); setZone("all"); setHousingFilter("all"); setShowCount(8); }}>
                Clear filters <ArrowRight className="shrink-0" size={16} aria-hidden="true" />
              </button>
            ) : (
              <button type="button" className={emptyPrimaryActionClass} onClick={() => setPost(true)}>
                {housingOnly ? "Post to housing board" : "Post a request"} <ArrowRight className="shrink-0" size={16} aria-hidden="true" />
              </button>
            )}
            <Link href="/search" className={emptySecondaryActionClass}>
              Explore businesses <ArrowRight className="shrink-0" size={16} aria-hidden="true" />
            </Link>
          </div>
        </div>
      ) : (
        <>
          {compact && <p role="status" className="text-xs font-semibold text-[#607266]">Showing {shown.length} of {visible.length} requests</p>}
          <div className="request-board-grid grid gap-3 lg:grid-cols-2">
            {shown.map((r) => {
              const owns = Boolean(receipts[r.id]);
              const expanded = expandedId === r.id;
              const long = r.query.length > 135;
              const confirming = confirmId === r.id;
              return (
                <article key={r.id} className="request-listing">
                  <div className="request-listing-top">
                    <span className="request-listing-area"><MapPin size={13} aria-hidden="true" />{ZONES.find((z) => z.slug === r.zone)?.name || "All campus"}</span>
                    <time className="text-xs text-[#68766c]" dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </time>
                  </div>
                  {r.housingIntent && <p className="text-xs font-bold text-[#315f42]">{r.housingIntent === "VACANCY" ? "VACANCY AVAILABLE" : "LOOKING FOR A HOUSE"} · Free community post · Unverified</p>}
                  <p className={`request-listing-query ${!expanded && long ? "line-clamp-2" : ""}`}>{r.query}</p>
                  {(owns || categoryName(r.category)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {owns && (
                        <span className="rounded-full bg-[#d9f279] px-2 py-0.5 text-[11px] font-bold text-[#243b32]">{r.housingIntent ? "Your housing post" : "Your request"}</span>
                      )}
                      {categoryName(r.category) && (
                        <span className="rounded-full border border-[#dfe5d8] bg-[#f7f8f2] px-2 py-0.5 text-[11px] font-semibold text-[#43614e]">{categoryName(r.category)}</span>
                      )}
                    </div>
                  )}
                  {long && <button type="button" className="request-expand" aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : r.id)}>
                    {expanded ? "Show less" : "Read full request"} <ChevronDown size={15} className={expanded ? "rotate-180" : ""} aria-hidden="true" />
                  </button>}
                  <div className="request-listing-actions">
                    {owns ? confirming ? (
                      <div className="request-confirm">
                        <p className="text-xs font-semibold">{r.housingIntent === "VACANCY" ? "Close this vacancy as taken?" : "Close this request as fulfilled?"}</p>
                        <button type="button" onClick={() => void close(r.id)} disabled={!!busy}
                          className="request-action-main"><Check size={16} aria-hidden="true" /> {busy === r.id ? "Closing…" : "Yes, close"}</button>
                        <button type="button" onClick={() => setConfirmId(null)} disabled={!!busy}
                          className="request-action-secondary"><X size={15} aria-hidden="true" /> Cancel</button>
                      </div>
                    ) : (
                      <button type="button" className="request-action-secondary"
                        onClick={() => setConfirmId(r.id)} disabled={!!busy}>
                        <Check size={16} aria-hidden="true" /> {r.housingIntent === "VACANCY" ? "Mark vacancy taken" : "Mark fulfilled"}
                      </button>
                    ) : r.canRespond && r.housingIntent ? (
                      <button type="button" className="request-action-main" disabled={!!busy} onClick={() => { setSafetyAcknowledged(false); setError(""); setHousingReply(r); }}>
                        <MessageCircle size={16} aria-hidden="true" /> {r.housingIntent === "VACANCY" ? "Ask about this vacancy" : "Respond with a vacancy"}
                      </button>
                    ) : r.canRespond && businesses.length ? (
                      <button type="button" className="request-action-main" disabled={!!busy || !selected}
                        onClick={() => void respond(r.id)}>
                        <MessageCircle size={16} aria-hidden="true" /> {busy === r.id ? "Opening…" : "Reply on WhatsApp"}
                      </button>
                    ) : r.canRespond ? (
                      <Link className="request-action-secondary" href="/login?next=/requests">Seller? Sign in to reply <ArrowRight size={14} aria-hidden="true" /></Link>
                    ) : (
                      <span className="request-listing-note"><MessageCircleOff size={15} aria-hidden="true" /> Replies not enabled</span>
                    )}
                  </div>
                  {r.housingIntent && <p className="text-xs leading-relaxed text-amber-900">Anyone can reply, without an account. Inspect the property and check the person before paying.</p>}
                </article>
              );
            })}
          </div>
          {!compact && showCount < visible.length && (
            <button type="button" className="directory-load-more"
              onClick={() => setShowCount((count) => count + 8)}>
              Show more requests ({visible.length - showCount} remaining)
            </button>
          )}
        </>
      )}
      {compact && (
        <Link href="/requests" className="inline-flex min-h-11 items-center gap-2 font-semibold text-[#205342] underline">
          View all campus requests <ArrowRight size={16} aria-hidden="true" />
        </Link>
      )}
      {post && (
        <DemandModal
          initialHousingIntent={housingOnly ? postIntent : undefined}
          initialZone={zone}
          initialQuery={keyword}
          onClose={() => { setPost(false); setPostIntent("LOOKING"); }}
          onPosted={() => setRefresh((r) => r + 1)}
        />
      )}
      {housingReply && (
        <ModalFrame title={housingReply.housingIntent === "VACANCY" ? "Before asking about this vacancy" : "Before responding to this house seeker"} onClose={() => { if (!busy) setHousingReply(null); }}>
          <form className="space-y-4 p-5 sm:p-6" onSubmit={(event) => { event.preventDefault(); if (safetyAcknowledged) void respond(housingReply.id, true); }}>
            <p className="rounded-xl bg-white p-3 text-sm text-[#244638]">{housingReply.query}</p>
            <HousingSafetyNotice />
            <p className="text-sm text-[#456550]">You will contact this person directly on WhatsApp. Neither party is verified through this housing post. Share accurate details and do not ask for or send money before the property and person have been checked.</p>
            <label className="flex items-start gap-3 text-sm leading-relaxed text-amber-950">
              <input type="checkbox" required checked={safetyAcknowledged} onChange={(event) => setSafetyAcknowledged(event.target.checked)} className="mt-1 h-5 w-5 shrink-0" />
              I have read the scam caution and understand that I must check the property and person before paying.
            </label>
            {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
            <Button type="submit" disabled={!!busy || !safetyAcknowledged}>{busy ? "Opening…" : "Continue to WhatsApp — free"} <ArrowRight size={16} aria-hidden="true" /></Button>
          </form>
        </ModalFrame>
      )}
    </section>
  );
}
