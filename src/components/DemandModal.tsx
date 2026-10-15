"use client";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { useState } from "react";
import Link from "next/link";
import { ZONES, CATEGORIES } from "@/lib/constants";
import { ModalFrame } from "./ModalFrame";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
export function DemandModal({
  initialQuery = "",
  initialCategory = "",
  initialZone = "all",
  onClose,
  onPosted,
}: {
  initialQuery?: string;
  initialCategory?: string;
  initialZone?: string;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [zone, setZone] = useState(initialZone);
  const [category, setCategory] = useState(initialCategory);
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [handoffs, setHandoffs] = useState<
    Array<{ name: string; businessId: string; url: string }>
  >([]);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          zone,
          category,
          contactPhone: phone || undefined,
          contactConsent: consent,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not post.");
      try {
        const receipts = JSON.parse(
          localStorage.getItem("mm-request-receipts") || "{}",
        );
        receipts[data.id] = data.manageToken;
        localStorage.setItem("mm-request-receipts", JSON.stringify(receipts));
      } catch {
        /* Posting works with storage disabled. */
      }
      setHandoffs(data.handoffs || []);
      setSubmitted(true);
      onPosted?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection error.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <ModalFrame title="Post a comrade request" onClose={onClose}>
      {submitted ? (
        <div className="space-y-4 p-6">
          <h3 className="text-xl font-bold">Your request is on the board</h3>
          <p>
            Matching verified sellers are notified. The request expires after
            seven days. You can close it sooner from this browser.
          </p>
          {handoffs.length ? (
            <div className="space-y-3">
              <p className="font-bold">
                Want a faster reply? Ping a matching verified seller:
              </p>
              {handoffs.map((seller) => (
                <a
                  key={seller.businessId}
                  href={seller.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ui-button ui-button-primary"
                  onClick={() =>
                    trackBusinessEvent(seller.businessId, "whatsapp")
                  }
                >
                  WhatsApp {seller.name}
                </a>
              ))}
            </div>
          ) : (
            <p>
              No matching seller contact yet. Share your request in your campus
              WhatsApp group.
            </p>
          )}
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`Can anyone help? ${query}. Zone: ${zone}. Find verified sellers and post requests on Moi Mashinani: ${typeof window === "undefined" ? "" : window.location.origin}/requests`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="ui-button ui-button-secondary"
          >
            Share request on WhatsApp
          </a>
          <Link
            href="/requests"
            className="ui-button ui-button-primary"
            onClick={onClose}
          >
            View requests
          </Link>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4 p-5">
          <p className="text-sm">
            No login needed. Describe the item, budget and when you need it.
            Keep phone numbers and private details out of the public request.
          </p>
          <label className="block text-sm font-semibold">
            What do you need?
            <Input
              required
              maxLength={500}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="HP blue-pin charger under KES 1,200 today"
            />
          </label>
          <label className="block text-sm font-semibold">
            Category
            <select
              className="ui-input"
              aria-label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Match by request text</option>
              {CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold">
            Campus zone
            <select
              className="ui-input"
              aria-label="Campus zone"
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
          <label className="block text-sm font-semibold">
            Your WhatsApp (optional)
            <Input
              type="tel"
              maxLength={20}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0712 345 678"
            />
          </label>
          {phone && (
            <label className="flex gap-2 text-sm">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
              />
              Allow active, verified sellers to access my WhatsApp number to
              answer this request. It stays hidden on the public board.
            </label>
          )}
          {error && (
            <p role="alert" className="text-red-800">
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Posting…" : "Post request"}
          </Button>
        </form>
      )}
    </ModalFrame>
  );
}
