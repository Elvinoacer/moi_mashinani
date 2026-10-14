"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Business, ServiceRequest } from "@/lib/types";
import { ZONES } from "@/lib/constants";
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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not close.");
    } finally {
      setBusy("");
    }
  }
  const visible = requests.filter(
    (r) =>
      !r.closedAt &&
      Date.parse(r.createdAt) > now - 7 * 864e5 &&
      (zone === "all" || r.zone === "all" || r.zone === zone),
  );
  return (
    <section className="space-y-4" aria-label="Comrade requests">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Comrade requests</h2>
          <p className="text-sm">
            Post your need. Verified sellers can reply on WhatsApp.
          </p>
        </div>
        <Button onClick={() => setPost(true)}>Post a request</Button>
      </div>
      {!compact && (
        <label className="block text-sm font-semibold">
          Campus zone
          <select
            className="ui-input"
            value={zone}
            onChange={(e) => setZone(e.target.value)}
          >
            {ZONES.map((z) => (
              <option key={z.slug} value={z.slug}>
                {z.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {businesses.length > 1 && (
        <label className="block text-sm font-semibold">
          Respond as
          <select
            className="ui-input"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {businesses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      {loading ? (
        <p role="status">Loading campus requests…</p>
      ) : !visible.length ? (
        <Card>
          <p className="font-semibold">Be the first to ask in this zone.</p>
          <p className="mt-2 text-sm">
            Need a charger, a vacant room, gas or a birthday cake? Add your
            budget and preferred time.
          </p>
          <Link className="mt-3 inline-block underline" href="/search">
            Compare nearby prices
          </Link>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.slice(0, compact ? 2 : 50).map((r) => (
            <Card key={r.id}>
              <p className="break-words font-bold">{r.query}</p>
              <p className="my-3 text-xs">
                {ZONES.find((z) => z.slug === r.zone)?.name || "All campus"} ·{" "}
                {new Date(r.createdAt).toLocaleString("en-KE", {
                  timeZone: "Africa/Nairobi",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              {receipts[r.id] ? (
                <Button
                  variant="secondary"
                  disabled={!!busy}
                  onClick={() => void close(r.id)}
                >
                  Found it · close request
                </Button>
              ) : r.canRespond ? (
                businesses.length ? (
                  <Button
                    variant="whatsapp"
                    disabled={!!busy}
                    onClick={() => void respond(r.id)}
                  >
                    {busy === r.id ? "Opening…" : "Respond on WhatsApp"}
                  </Button>
                ) : (
                  <Link
                    className="text-sm underline"
                    href="/login?next=/requests"
                  >
                    Verified seller? Sign in to respond
                  </Link>
                )
              ) : (
                <p className="text-xs">
                  Student is comparing providers; WhatsApp replies are off.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
      {compact && (
        <Link href="/requests" className="inline-block font-semibold underline">
          View the requests board →
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
