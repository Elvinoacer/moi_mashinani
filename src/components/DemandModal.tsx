"use client";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { useState } from "react";
import Link from "next/link";
import { ZONES } from "@/lib/constants";
import { CategorySelect } from "./CategorySelect";
import { ArrowRight, CheckCircle2, Lightbulb, Plus } from "lucide-react";
import { ModalFrame } from "./ModalFrame";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { getSavedStudentContact, saveStudentContact } from "@/lib/useCampusZone";

const REQUEST_EXAMPLES = [
  "Need a single room near Stage under KES 4,000",
  "Looking for a laptop charger (HP) today",
  "Need someone to fix a cracked phone screen",
  "Printing & binding 50 pages tonight",
];
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
  const [phone, setPhone] = useState(() => getSavedStudentContact().phone);
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
      if (phone.trim()) saveStudentContact({ phone });
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
          <div className="flex items-start gap-3 rounded-xl bg-[#edf5e9] p-4 text-[#183e35]">
            <CheckCircle2 className="mt-0.5 shrink-0 text-[#377a47]" size={24} aria-hidden="true" />
            <div><h3 className="text-xl font-bold">Your request is live</h3><p className="mt-1 text-sm text-[#456550]">It now appears on the campus request board.</p></div>
          </div>
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
        <form onSubmit={submit} className="space-y-5 p-5 sm:p-6">
          <div className="flex items-start gap-3 rounded-xl border border-[#dbe9d7] bg-[#f0f6eb] p-4">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#315f42]">
              <Lightbulb size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[#1a4033]">A clear request gets better replies.</p>
              <p className="mt-1 text-sm leading-relaxed text-[#526c5b]">
                Describe what you need, your budget and when you need it. No account required.
              </p>
            </div>
          </div>
          <div>
            <label htmlFor="request-description" className="mb-2 block text-sm font-bold text-[#244638]">
              Describe what you need <span className="text-[#ab3d2d]">*</span>
            </label>
            <textarea
              id="request-description"
              required
              maxLength={500}
              rows={3}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="e.g. Looking for an HP charger under KES 1,200 near Stage today"
              aria-describedby="request-description-hint"
              className="min-h-28 w-full resize-y rounded-xl border border-[#bed0bd] bg-white px-3.5 py-3 text-base leading-relaxed text-[#183e35] outline-none placeholder:text-[#7a8d80] focus-visible:border-[#528b5d] focus-visible:ring-2 focus-visible:ring-[#a2c995]/60"
            />
            <div id="request-description-hint" className="mt-1 flex flex-wrap items-start justify-between gap-2 text-xs text-[#657a69]">
              <span>Do not include your phone number or private details here.</span>
              <span>{query.length}/500</span>
            </div>
            {!query.trim() && (
              <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Example requests">
                {REQUEST_EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setQuery(example)}
                    className="rounded-full border border-[#cfdcca] bg-white px-3 py-1.5 text-xs font-semibold text-[#2f5440] hover:bg-[#eef5ea]"
                  >
                    {example}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <p className="mb-2 text-sm font-bold text-[#244638]">Business category <span className="font-normal text-[#728274]">(optional)</span></p>
              <CategorySelect value={category} onChange={setCategory} className="ui-input min-h-12 bg-white text-sm" />
            </div>
            <div className="min-w-0">
              <label htmlFor="request-zone" className="mb-2 block text-sm font-bold text-[#244638]">
                Campus area
              </label>
              <select
                id="request-zone"
                className="ui-input min-h-12 bg-white"
                value={zone}
                onChange={(event) => setZone(event.target.value)}
              >
                {ZONES.map((z) => (
                  <option key={z.slug} value={z.slug}>{z.name}</option>
                ))}
              </select>
              <p className="mt-2 text-xs leading-relaxed text-[#657a69]">Choose where you want to find it.</p>
            </div>
          </div>
          <div className="rounded-xl border border-[#e1e9dd] bg-[#fafcf8] p-4">
            <label htmlFor="request-whatsapp" className="mb-1 block text-sm font-bold text-[#244638]">
              Your WhatsApp number <span className="font-normal text-[#728274]">(optional)</span>
            </label>
            <p className="mb-3 text-xs leading-relaxed text-[#627566]">
              Only provide this if you want eligible sellers to contact you directly.
            </p>
            <Input
              id="request-whatsapp"
              type="tel"
              maxLength={20}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="e.g. 0712 345 678"
              autoComplete="tel"
              className="min-h-12"
            />
            {phone && (
              <label className="mt-3 flex items-start gap-3 rounded-lg bg-white p-3 text-sm leading-relaxed text-[#355546]">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  onChange={(event) => setConsent(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0"
                />
                I agree to share this number privately with active, verified sellers responding to my request.
              </label>
            )}
          </div>
          {error && (
            <p role="alert" className="text-red-800">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 border-t border-[#e3ebe0] pt-4 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button type="submit" disabled={busy} className="min-h-12"><Plus size={18} aria-hidden="true" /> {busy ? "Posting request…" : "Publish request"} <ArrowRight size={17} aria-hidden="true" /></Button>
          </div>
        </form>
      )}
    </ModalFrame>
  );
}
