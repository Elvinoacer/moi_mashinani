"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Business, ServiceRequest } from "@/lib/types";
import { CATEGORIES, ZONES } from "@/lib/constants";
import { CampusZonePicker } from "./CampusZonePicker";
import { ArrowRight, Check, ChevronDown, MapPin, MessageCircle, MessageCircleOff, Plus, Search, X } from "lucide-react";
import { DemandModal } from "./DemandModal";
import { Button } from "./ui/Button";
import { useNow } from "@/lib/useNow";
import { useCampusZone } from "@/lib/useCampusZone";
type PublicRequest = Omit<ServiceRequest, "contactPhone"> & {
  canRespond?: boolean;
};
export function RequestBoard({ compact = false }: { compact?: boolean }) {
  const now = useNow();
  const [requests, setRequests] = useState<PublicRequest[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selected, setSelected] = useState("");
  const [zone, setZone] = useCampusZone();
  const [post, setPost] = useState(false);
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
  }, []);
  async function respond(id: string) {
    if (busy) return;
    const chat = window.open("about:blank", "_blank");
    if (chat) chat.opener = null;
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/demand/${id}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: selected }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not respond.");
      if (chat) chat.location.href = data.url;
      else window.location.assign(data.url);
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

  const categoryName = (slug?: string) =>
    slug ? CATEGORIES.find((c) => c.slug === slug)?.name || "" : "";
  const active = requests.filter((r) =>
    !r.closedAt && Date.parse(r.createdAt) > now - 7 * 864e5,
  );
  const myCount = active.filter((r) => receipts[r.id]).length;
  const showMine = mineOnly && myCount > 0;
  const visible = active.filter((r) =>
    (showMine ? Boolean(receipts[r.id]) : zone === "all" || r.zone === "all" || r.zone === zone) &&
    (keyword.trim() === "" || (r.query + " " + (ZONES.find((z) => z.slug === r.zone)?.name || "") + " " + categoryName(r.category)).toLowerCase().includes(keyword.toLowerCase().trim()))
  ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const shown = compact ? visible.slice(0, 2) : visible.slice(0, showCount);
  return (
    <section className={compact ? "space-y-4" : "requests-board space-y-5"} aria-label="Comrade requests">
      {compact ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Comrade requests</h2>
            <p className="text-sm text-[#5c6f60]">See what people need around campus. Verified sellers can reply.</p>
          </div>
          <Button onClick={() => setPost(true)}>Post a request <ArrowRight size={16} aria-hidden="true" /></Button>
        </div>
      ) : (
        <>
          <div className="requests-hero">
            <div className="requests-hero-copy">
              <p className="requests-eyebrow"><span className="requests-eyebrow-dot" aria-hidden="true" />MOI UNIVERSITY · COMMUNITY BOARD</p>
              <h1 className="requests-hero-title">Campus needs.<br /><span>Real connections.</span></h1>
              <p className="requests-hero-lead">
                Discover what students around campus are looking for. If you can help, connect directly with them.
              </p>
            </div>
            <div className="requests-post-card">
              <p className="requests-post-eyebrow"><Plus size={15} aria-hidden="true" /> FOR PEOPLE LOOKING FOR SOMETHING</p>
              <h2>Need something?</h2>
              <p>Tell the campus what you are looking for. Posting is free and does not require an account.</p>
              <button type="button" className="requests-post-button" onClick={() => setPost(true)}>
                <Plus size={17} aria-hidden="true" /> Post a request <ArrowRight size={17} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="requests-filters" role="search" aria-label="Search campus requests">
            <div className="requests-filters-heading">
              <h2>Explore requests</h2>
              <p>Filter posts by keyword or campus area. Searching never publishes a request.</p>
            </div>
            <div className="request-board-toolbar">
              <div className="requests-search-field">
                <label className="requests-field-label" htmlFor="requests-search-input">Search existing requests</label>
                <div className="requests-search-box">
                  <Search size={20} aria-hidden="true" />
                  <input
                    id="requests-search-input"
                    type="search"
                    value={keyword}
                    autoComplete="off"
                    placeholder="e.g. charger, bedsitter, fundi"
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
          </div>
        </>
      )}
      {businesses.length > 1 && (
        <label className="flex flex-wrap items-center gap-2 text-sm font-semibold">
          Reply as
          <select className="ui-input max-w-xs" value={selected} onChange={(e) => setSelected(e.target.value)}>
            {businesses.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </label>
      )}
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {!compact && (
        <div className="requests-results-header" id="requests-results">
          <div>
            <p className="requests-section-kicker">FROM AROUND CAMPUS</p>
            <h2>Latest requests</h2>
            <p className="requests-results-description">Recent requests first · Posts remain visible for seven days</p>
          </div>
          <div className="requests-results-tools">
            <span className="requests-results-count" role="status">
              {loading ? "Loading…" : visible.length + (visible.length === 1 ? " active request" : " active requests")}
            </span>
            {myCount > 0 && (
              <button
                type="button"
                className="requests-reset"
                aria-pressed={showMine}
                onClick={() => { setMineOnly((value) => !value); setShowCount(8); }}
              >
                {showMine ? "Show all requests" : `My requests (${myCount})`}
              </button>
            )}
            {(keyword || zone !== "all" || showMine) && (
              <button type="button" className="requests-reset" onClick={() => { setKeyword(""); setZone("all"); setMineOnly(false); setShowCount(8); }}>
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
        <div className={compact ? "ui-card space-y-3" : "requests-empty"}>
          <span className="requests-empty-icon" aria-hidden="true"><Search size={23} /></span>
          <h3>{error && !requests.length ? "Requests could not load" : "No matching requests yet"}</h3>
          <p>{error && !requests.length
            ? "Check your connection and try again."
            : "Try a different search or campus area. You can also ask the campus for what you need."}</p>
          <div className="requests-empty-actions">
            {error && !requests.length ? (
              <button type="button" onClick={() => { setLoading(true); setRefresh((value) => value + 1); }}>Try again</button>
            ) : (keyword || zone !== "all") ? (
              <button type="button" onClick={() => { setKeyword(""); setZone("all"); setShowCount(8); }}>Clear filters</button>
            ) : (
              <button type="button" onClick={() => setPost(true)}>Post a request <ArrowRight size={15} aria-hidden="true" /></button>
            )}
            <Link href="/search">Explore businesses <ArrowRight size={15} aria-hidden="true" /></Link>
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
                  <p className={`request-listing-query ${!expanded && long ? "line-clamp-2" : ""}`}>{r.query}</p>
                  {(owns || categoryName(r.category)) && (
                    <div className="flex flex-wrap gap-1.5">
                      {owns && (
                        <span className="rounded-full bg-[#d9f279] px-2 py-0.5 text-[11px] font-bold text-[#243b32]">Your request</span>
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
                        <p className="text-xs font-semibold">Close this request as fulfilled?</p>
                        <button type="button" onClick={() => void close(r.id)} disabled={!!busy}
                          className="request-action-main"><Check size={16} aria-hidden="true" /> {busy === r.id ? "Closing…" : "Yes, close"}</button>
                        <button type="button" onClick={() => setConfirmId(null)} disabled={!!busy}
                          className="request-action-secondary"><X size={15} aria-hidden="true" /> Cancel</button>
                      </div>
                    ) : (
                      <button type="button" className="request-action-secondary"
                        onClick={() => setConfirmId(r.id)} disabled={!!busy}>
                        <Check size={16} aria-hidden="true" /> Mark fulfilled
                      </button>
                    ) : r.canRespond && businesses.length ? (
                      <button type="button" className="request-action-main" disabled={!!busy || !selected}
                        onClick={() => void respond(r.id)}>
                        <MessageCircle size={16} aria-hidden="true" /> {busy === r.id ? "Opening…" : "Reply on WhatsApp"}
                      </button>
                    ) : r.canRespond ? (
                      <Link className="request-action-secondary" href="/login?next=/requests">Seller? Sign in to reply <ArrowRight size={14} aria-hidden="true" /></Link>
                    ) : (
                      <span className="request-listing-note"><MessageCircleOff size={15} aria-hidden="true" /> Seller replies not enabled</span>
                    )}
                  </div>
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
          initialZone={zone}
          initialQuery={keyword}
          onClose={() => setPost(false)}
          onPosted={() => setRefresh((r) => r + 1)}
        />
      )}
    </section>
  );
}
