"use client";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { useState } from "react";
import "./demand-modal.css";
import Link from "@/components/MotionLink";
import { ZONES } from "@/lib/constants";
import { CategorySelect } from "./CategorySelect";
import { ArrowRight, Check, CheckCircle2, HousePlus, Lightbulb, MapPin, MessageCircle, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { ModalFrame } from "./ModalFrame";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { getSavedStudentContact, saveStudentContact } from "@/lib/useCampusZone";
import { CampusPushOptIn } from "./CampusPushOptIn";
import { HOUSING_CATEGORY, type HousingIntent } from "@/lib/housing";
import { HousingSafetyNotice } from "./HousingSafetyNotice";

const REQUEST_EXAMPLES = [
  "Need a reliable fundi near Stage today",
  "Looking for a laptop charger (HP) today",
  "Need someone to fix a cracked phone screen",
  "Printing & binding 50 pages tonight",
];
export function DemandModal({
  initialQuery = "",
  initialCategory = "",
  initialZone = "all",
  initialHousingIntent,
  onClose,
  onPosted,
}: {
  initialQuery?: string;
  initialCategory?: string;
  initialZone?: string;
  initialHousingIntent?: HousingIntent;
  onClose: () => void;
  onPosted?: () => void;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [zone, setZone] = useState(initialZone);
  const [category, setCategory] = useState(initialHousingIntent ? HOUSING_CATEGORY : initialCategory);
  const [housingIntent, setHousingIntent] = useState<HousingIntent>(initialHousingIntent || "LOOKING");
  const [safetyAcknowledged, setSafetyAcknowledged] = useState(false);
  const housing = category === HOUSING_CATEGORY;
  const [phone, setPhone] = useState(() => getSavedStudentContact().phone);
  const [consent, setConsent] = useState(false);
  const [handoffs, setHandoffs] = useState<
    Array<{ name: string; businessId: string; url: string; isPro?: boolean }>
  >([]);
  const [submittedId, setSubmittedId] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"description" | "phone" | "consent" | "safety" | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    const invalid = (field: "description" | "phone" | "consent" | "safety", message: string, id: string) => {
      setFieldError(field);
      setError(message);
      requestAnimationFrame(() => document.getElementById(id)?.focus());
    };
    if (!query.trim()) return invalid("description", "Describe what you need before publishing.", "request-description");
    if (housing && !phone.trim()) return invalid("phone", "Add a WhatsApp number so other comrades can reply.", "request-whatsapp");
    if (phone.trim() && !consent) return invalid("consent", "Confirm how your WhatsApp number will be shared.", "request-contact-consent");
    if (housing && !safetyAcknowledged) return invalid("safety", "Please read and acknowledge the housing safety guidance.", "request-safety-consent");
    setFieldError(null);
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
          ...(housing ? { housingIntent, safetyAcknowledged } : {}),
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
      setSubmittedId(data.id || "");
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
    <ModalFrame title={housing ? "Post to the housing board" : "Post a comrade request"} onClose={onClose} wide className="demand-modal-shell">
      {submitted ? (
        <div className="demand-success space-y-4 p-4 sm:p-6">
          <div role="status" className="flex items-start gap-3 rounded-xl border border-[#d1e4d0] bg-[#edf5e9] p-4 text-[#183e35]">
            <CheckCircle2
              className="mt-0.5 shrink-0 text-[#377a47]"
              size={24}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className="text-lg font-bold leading-snug">{housing ? "Your housing post is live" : "Your request is live"}</h3>
              <p className="mt-1 text-sm leading-relaxed text-[#456550]">
                Posted to the campus board for seven days. Close it sooner anytime from this browser.
              </p>
            </div>
          </div>

          {housing ? <HousingSafetyNotice /> : <CampusPushOptIn
            variant="request-submitted"
            keyword={query}
            zone={zone}
            category={category || undefined}
            requestId={submittedId || undefined}
          />}

          {handoffs.length > 0 ? (
            <details className="group rounded-xl border border-[#dce5d7] bg-white">
              <summary className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-[#183e35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]">
                <span>
                  Contact {handoffs.length} matching verified seller{handoffs.length === 1 ? "" : "s"}
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#526d59] group-open:hidden">
                  Show
                </span>
                <span className="hidden shrink-0 text-xs font-semibold text-[#526d59] group-open:inline">
                  Hide
                </span>
              </summary>
              <div className="max-h-52 space-y-2 overflow-y-auto border-t border-[#e3ebe0] p-3">
                {handoffs.map((seller) => (
                  <a
                    key={seller.businessId}
                    href={seller.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-[#dce5d7] px-3 py-2 text-sm font-semibold text-[#183e35] transition-colors hover:bg-[#f0f6eb] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
                    onClick={() =>
                      trackBusinessEvent(seller.businessId, "whatsapp")
                    }
                  >
                    <span className="min-w-0 break-words">WhatsApp {seller.name}</span>
                    {seller.isPro && (
                      <span className="shrink-0 rounded-full bg-[#d9f279] px-2 py-1 text-[10px] font-bold text-[#183e35]">
                        Priority
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </details>
          ) : !housing ? (
            <p className="text-sm leading-relaxed text-[#526d59]">
              No matching seller yet. You can share the request with your campus WhatsApp group.
            </p>
          ) : <p className="text-sm text-[#526d59]">Anyone can reply on WhatsApp without an account. Treat every reply as unverified and check the property and person before paying.</p>}

          <div className="flex flex-col gap-2 border-t border-[#e3ebe0] pt-4 sm:flex-row">
            <Link
              href={housing ? "/housing" : "/requests"}
              className="ui-button ui-button-primary min-h-11 w-full justify-center text-center sm:flex-1"
              onClick={onClose}
            >
              {housing ? "View housing board" : "View request board"} <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 w-full sm:w-auto sm:min-w-24"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(`${housing ? (housingIntent === "VACANCY" ? "Vacancy available" : "Looking for a house") : "Can anyone help?"} ${query}. Area: ${ZONES.find(z => z.slug === zone)?.name || zone}. ${housing ? "Unverified community housing post — inspect before paying." : "Find verified sellers and post requests on Moi Mashinani."} ${typeof window === "undefined" ? "" : window.location.origin}/${housing ? "housing" : "requests"}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-9 items-center text-sm font-semibold text-[#275d47] underline underline-offset-4 hover:text-[#183e35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
          >
            Share {housing ? "housing post" : "request"} on WhatsApp
          </a>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="demand-form">
          <div className="demand-form__intro">
            <div className="demand-form__intro-text">
              <p className="demand-form__eyebrow"><Sparkles size={14} aria-hidden="true" /> {housing ? "MOI UNIVERSITY · HOUSING" : "MOI UNIVERSITY · COMMUNITY REQUESTS"}</p>
              <h3>{housing ? "Make a move. Help a comrade." : "Tell the campus what you need."}</h3>
              <p>{housing ? "Share a vacancy or ask for a place. Your post connects directly with people around campus." : "The more specific your request, the easier it is for the right person to help."}</p>
              <div className="demand-form__reassurance"><span><Check size={14} aria-hidden="true" /> Free to post</span><span><Check size={14} aria-hidden="true" /> No account needed</span></div>
            </div>
            <span className="demand-form__intro-art" aria-hidden="true">{housing ? <HousePlus size={42} strokeWidth={1.5} /> : <MessageCircle size={42} strokeWidth={1.5} />}</span>
          </div>

          <div className="demand-form__body">
            {!housing && (
              <button type="button" className="demand-form__housing-link" onClick={() => { setCategory(HOUSING_CATEGORY); setHousingIntent("LOOKING"); setConsent(false); setSafetyAcknowledged(false); setError(""); setFieldError(null); }}>
                <span className="demand-form__housing-link-icon"><HousePlus size={21} aria-hidden="true" /></span>
                <span><strong>Looking for a house or have a vacancy?</strong><small>Switch to the free community housing board</small></span>
                <ArrowRight size={19} aria-hidden="true" className="demand-form__housing-link-arrow" />
              </button>
            )}
            {housing && (
              <fieldset className="demand-form__intent-fieldset">
                <legend>First, what are you posting?</legend>
                <div className="demand-form__intent-grid">
                  {([["LOOKING", "Looking for a house / rental", "I need a room or rental"], ["VACANCY", "Vacancy available / I know a place", "I have a lead on a place"]] as const).map(([value, label, note]) => (
                    <label key={value} className={`demand-form__intent-option ${housingIntent === value ? "demand-form__intent-option--selected" : ""}`}>
                      <input type="radio" name="housing-intent" value={value} checked={housingIntent === value} onChange={() => { setHousingIntent(value); setError(""); }} />
                      <span className="demand-form__intent-copy"><strong>{label}</strong><small aria-hidden="true">{note}</small></span>
                      {housingIntent === value && <Check size={17} aria-hidden="true" className="demand-form__intent-check" />}
                    </label>
                  ))}
                </div>
              </fieldset>
            )}

            <section className="demand-form__section" aria-label="Post details">
              <div className="demand-form__section-heading">
                <div><span className="demand-form__section-number">01</span><h4>Describe your {housing ? "housing post" : "request"}</h4></div>
                <span className="demand-form__required-note">* Required</span>
              </div>
              <label htmlFor="request-description" className="demand-form__label">
                {housing ? "Housing details" : "Describe what you need"} <span aria-hidden="true" className="text-[#b33d2b]">*</span>
              </label>
              <textarea
                id="request-description"
                required
                maxLength={500}
                rows={3}
                value={query}
                aria-invalid={fieldError === "description"}
                aria-describedby="request-description-hint"
                onChange={(event) => { setQuery(event.target.value); setFieldError(null); setError(""); }}
                placeholder={housing ? housingIntent === "VACANCY" ? "e.g. Single room near Chebarus, KES 3,500/month, available now. Mention the landmark and terms." : "e.g. Looking for a bedsitter near Mabs, budget KES 5,000/month, moving next month." : "e.g. Looking for an HP laptop charger under KES 1,200 near Stage today"}
                className="demand-form__textarea"
              />
              <div id="request-description-hint" className="demand-form__field-meta">
                <span>Include your area, budget and timing. No phone numbers here.</span>
                <span className={query.length > 460 ? "demand-form__counter--near" : ""}>{query.length}/500</span>
              </div>
              {!query.trim() && (
                <div className="demand-form__examples" role="group" aria-label={housing ? "Housing post examples" : "Example requests"}>
                  <span className="demand-form__examples-label">Try an example</span>
                  {(housing ? housingIntent === "VACANCY"
                    ? ["Single room available near Chebarus, KES 3,500/month", "Bedsitter vacant near Mabs, viewing by arrangement"]
                    : ["Looking for a bedsitter near Mabs under KES 5,000", "Need a single room near campus, moving next month"]
                    : REQUEST_EXAMPLES.slice(0, 3)).map((example) => (
                    <button key={example} type="button" className="demand-form__example-chip" onClick={() => { setQuery(example); setError(""); setFieldError(null); }}>
                      <Plus size={13} aria-hidden="true" /> {example}
                    </button>
                  ))}
                </div>
              )}
              <div className="demand-form__detail-grid">
                <div className="demand-form__field">
                  <label htmlFor="request-category" className="demand-form__label">{housing ? "Post category" : "Business category"} {!housing && <span className="demand-form__optional">(optional)</span>}</label>
                  {housing ? (
                    <div id="request-category" className="demand-form__fixed-category"><HousePlus size={17} aria-hidden="true" /> Housing · free community post</div>
                  ) : (
                    <CategorySelect value={category} onChange={(value) => { setCategory(value); setConsent(false); setSafetyAcknowledged(false); setError(""); }} className="ui-input min-h-12 bg-white text-sm" />
                  )}
                  {housing && !initialHousingIntent && <button type="button" className="demand-form__change-kind" onClick={() => { setCategory(""); setError(""); }}>Switch back to a general request</button>}
                </div>
                <div className="demand-form__field">
                  <label htmlFor="request-zone" className="demand-form__label"><MapPin size={15} aria-hidden="true" /> Campus area</label>
                  <select
                    id="request-zone"
                    className="ui-input min-h-12 bg-white"
                    value={zone}
                    onChange={(event) => setZone(event.target.value)}
                  >
                    {ZONES.map((z) => <option key={z.slug} value={z.slug}>{z.name}</option>)}
                  </select>
                  <p className="demand-form__field-help">{zone === "other-campus" ? "Mention your campus and nearby landmark above." : housing && housingIntent === "VACANCY" ? "Where is this vacancy?" : "Where should people find you?"}</p>
                </div>
              </div>
            </section>

            <section className="demand-form__section demand-form__contact" aria-label="Contact information">
              <div className="demand-form__section-heading">
                <div><span className="demand-form__section-number">02</span><h4>How people can reach you</h4></div>
                <span className="demand-form__private"><ShieldCheck size={13} aria-hidden="true" /> Not displayed publicly</span>
              </div>
              <label htmlFor="request-whatsapp" className="demand-form__label">Your WhatsApp number <span className="demand-form__optional">{housing ? "(required for replies)" : "(optional)"}</span></label>
              <p className="demand-form__field-help demand-form__contact-help">{housing ? "Anyone who chooses to respond can access your number. Responders are not verified." : "If you provide one, only eligible verified sellers who respond can access it."}</p>
              <Input
                id="request-whatsapp"
                type="tel"
                required={housing}
                aria-invalid={fieldError === "phone"}
                maxLength={20}
                value={phone}
                onChange={(event) => { setPhone(event.target.value); setFieldError(null); setError(""); }}
                placeholder="e.g. 0712 345 678"
                autoComplete="tel"
                className="demand-form__phone min-h-12"
              />
              {phone && (
                <label className="demand-form__checkbox-row" htmlFor="request-contact-consent">
                  <input
                    id="request-contact-consent"
                    type="checkbox"
                    required
                    checked={consent}
                    onChange={(event) => { setConsent(event.target.checked); setFieldError(null); setError(""); }}
                  />
                  <span>{housing ? "I agree to share my WhatsApp number with anyone responding to this housing post, including people without an account. Responders are not verified." : "I agree to share this number privately with active, verified sellers responding to my request."}</span>
                </label>
              )}
            </section>

            {housing && (
              <div className="demand-form__safety">
                <HousingSafetyNotice compact />
                <label className="demand-form__checkbox-row demand-form__safety-check" htmlFor="request-safety-consent">
                  <input
                    id="request-safety-consent"
                    type="checkbox"
                    required
                    checked={safetyAcknowledged}
                    onChange={(event) => { setSafetyAcknowledged(event.target.checked); setFieldError(null); setError(""); }}
                  />
                  <span>I have read the housing scam caution. I understand that posts and replies are unverified and I must check the property and person before paying.</span>
                </label>
              </div>
            )}
          </div>

          <div className="demand-form__footer">
            {error && <p role="alert" className="demand-form__error">{error}</p>}
            <div className="demand-form__footer-actions">
              <span className="demand-form__footer-note"><CheckCircle2 size={15} aria-hidden="true" /> Free · Live for 7 days</span>
              <div className="demand-form__footer-buttons">
                <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
                <Button type="submit" disabled={busy} className="demand-form__publish">
                  {busy ? "Posting…" : housing ? "Publish housing post — free" : "Publish request"} <ArrowRight size={17} aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </form>
      )}
    </ModalFrame>
  );
}
