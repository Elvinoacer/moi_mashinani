"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Business, ServiceRequest } from "@/lib/types";
import { ZONES } from "@/lib/constants";
import { CampusZonePicker } from "./CampusZonePicker";
import { ArrowRight, Check, ChevronDown, MessageCircle, Search, X } from "lucide-react";
import { DemandModal } from "./DemandModal";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
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

  const visible = requests.filter((r) =>
    !r.closedAt &&
    Date.parse(r.createdAt) > now - 7 * 864e5 &&
    (zone === "all" || r.zone === "all" || r.zone === zone) &&
    (keyword.trim() === "" || (r.query + " " + (ZONES.find((z) => z.slug === r.zone)?.name || "")).toLowerCase().includes(keyword.toLowerCase().trim()))
  ).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const shown = compact ? visible.slice(0, 2) : visible.slice(0, showCount);
  return (
    <section className="space-y-4" aria-label="Comrade requests">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold">Comrade requests</h2>
          <p className="text-sm text-[#5c6f60]">See what people need around campus. Verified sellers can reply.</p>
        </div>
        <Button onClick={() => setPost(true)} className="shrink-0">Post a request <ArrowRight size={15} aria-hidden="true" /></Button>
      </div>
      {!compact && (
        <div className="request-board-toolbar">
          <label className="request-board-search">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Find requests by item or service</span>
            <input type="search" value={keyword} placeholder="Search requests e.g. charger, room…"
              onChange={(event) => { setKeyword(event.target.value); setShowCount(8); }} />
          </label>
          <div className="request-board-zone">
            <CampusZonePicker value={zone} onChange={(value) => { setZone(value); setShowCount(8); }} />
          </div>
        </div>
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
      {loading ? (
        <div role="status" className="grid gap-3 sm:grid-cols-2" aria-label="Loading requests">
          {[1, 2, 3, 4].map((item) => <div key={item} className="h-36 rounded-2xl bg-[#e8efe5] animate-pulse" />)}
        </div>
      ) : !visible.length ? (
        <Card>
          <h3 className="font-bold">No requests found {keyword ? "for that search" : "in this area"}.</h3>
          <p className="mt-1 text-sm">Try another term or area, or ask sellers what you need.</p>
          {keyword && <button type="button" onClick={() => setKeyword("")} className="mt-3 mr-3 text-sm font-bold underline">Clear search</button>}
          <Link className="mt-3 inline-block text-sm font-bold underline" href="/search">Explore nearby businesses →</Link>
        </Card>
      ) : (
        <>
          <p role="status" className="text-xs font-semibold text-[#607266]">
            Showing {shown.length} of {visible.length} {visible.length === 1 ? "request" : "requests"}
          </p>
          <div className="request-board-grid grid gap-3 sm:grid-cols-2">
            {shown.map((r) => {
              const owns = Boolean(receipts[r.id]);
              const expanded = expandedId === r.id;
              const long = r.query.length > 135;
              const confirming = confirmId === r.id;
              return (
                <article key={r.id} className="request-listing">
                  <div className="request-listing-top">
                    <span className="request-listing-area">{ZONES.find((z) => z.slug === r.zone)?.name || "All campus"}</span>
                    <time className="text-xs text-[#68766c]" dateTime={r.createdAt}>
                      {new Date(r.createdAt).toLocaleString("en-KE", { timeZone: "Africa/Nairobi", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </time>
                  </div>
                  <p className={`request-listing-query ${!expanded && long ? "line-clamp-2" : ""}`}>{r.query}</p>
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
                      <span className="request-listing-note">WhatsApp replies not enabled for this request</span>
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
          onClose={() => setPost(false)}
          onPosted={() => setRefresh((r) => r + 1)}
        />
      )}
    </section>
  );
}
