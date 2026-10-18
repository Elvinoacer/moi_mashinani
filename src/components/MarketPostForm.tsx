"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "@/components/MotionLink";
import { ArrowLeft, ArrowRight, CheckCircle2, ImagePlus, MapPin, Package, ShieldCheck, Sparkles } from "lucide-react";
import { CATEGORIES, ZONES } from "@/lib/constants";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { PhotoUploader } from "./PhotoUploader";
import { EnrollmentCategoryPicker } from "./EnrollmentCategoryPicker";
import { ListingFlowHeader, ListingPhotoGallery } from "./ListingFlow";
import { getSavedStudentContact, saveStudentContact, useCampusZone } from "@/lib/useCampusZone";
import styles from "./ListingFlow.module.css";

type Owner = { name: string; email: string };
type Draft = {
  contactPhone: string; kind: "DECLUTTER" | "HUSTLE"; name: string; price: string;
  description: string; zone: string; landmark: string; category: string; proofId: string; photos: string[];
};

export function MarketPostForm({ onClose }: { onClose?: () => void } = {}) {
  const [owner, setOwner] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedZone] = useCampusZone();
  const [draft, setDraft] = useState<Draft>(() => ({
    contactPhone: getSavedStudentContact().phone, kind: "DECLUTTER", name: "", price: "",
    description: "", zone: savedZone !== "all" ? savedZone : "stage", landmark: "",
    category: "", proofId: "", photos: [],
  }));
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [proofBusy, setProofBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [slug, setSlug] = useState("");
  const [consent, setConsent] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const locked = busy || uploading || proofBusy;
  const draftKey = `mm-market-v1-${owner?.email || "guest"}`;
  const { contactPhone, kind, name, price, description, zone, landmark, category, proofId, photos } = draft;

  function field<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }
  function goTo(next: number) {
    setError("");
    setStep(next);
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ block: "start" });
      topRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
    });
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then((r) => { if (!r.ok) throw new Error("Could not check your account. Please reload and try again."); return r.json(); })
      .then((data) => { setOwner(data.user?.email ? data.user : null); setLoading(false); })
      .catch((cause) => {
        if (!controller.signal.aborted) { setLoading(false); setError(cause.message); }
      });
    return () => controller.abort();
  }, []);
  useEffect(() => { if (error) errorRef.current?.focus(); }, [error]);
  useEffect(() => { if (slug) resultRef.current?.focus(); }, [slug]);

  function saveDraft() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ saved: Date.now(), draft }));
      setNotice("Draft saved for 24 hours in this tab. You can close this window and restore it later.");
    } catch { setNotice("Draft storage is unavailable. Keep this window open to retain your details."); }
  }
  function restoreDraft() {
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey) || "{}");
      if (!saved.saved || Date.now() - saved.saved > 864e5 || !saved.draft) throw new Error("No current draft in this tab.");
      setDraft((current) => ({ ...current, ...saved.draft }));
      setConsent(false);
      goTo(1);
      setNotice("Draft restored. Check your photos and details before submitting.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Could not restore your draft."); }
  }
  async function removePhoto(url: string) {
    if (locked) return;
    setUploading(true);
    setError("");
    try {
      const response = await fetch(`/api/enrollment/media?url=${encodeURIComponent(url)}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        const data = await response.json();
        throw new Error(data.error || "Could not remove the photo. Please retry.");
      }
      setDraft((current) => ({ ...current, photos: current.photos.filter((photo) => photo !== url) }));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not remove the photo."); }
    finally { setUploading(false); }
  }
  async function uploadProof(file?: File) {
    if (!file || locked) return;
    setProofBusy(true);
    setError("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/enrollment/proof", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not upload your student ID.");
      field("proofId", data.proofId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload your student ID."); }
    finally { setProofBusy(false); }
  }
  function validateDetails() {
    if (!name.trim()) throw new Error("Add a name for your item or service.");
    if (!price.trim() || !Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 10000000) throw new Error("Enter a price between KES 0 and 10,000,000.");
    if (description.trim().length < 20) throw new Error("Describe the condition or service in at least 20 characters.");
    if (!category) throw new Error("Choose a category so students can find your listing.");
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (locked || !owner) return;
    setError("");
    try {
      validateDetails();
      if (step === 1) { goTo(2); return; }
      if (!/^254[17]\d{8}$/.test(contactPhone.replace(/\D/g, "").replace(/^0/, "254"))) throw new Error("Enter a Kenyan mobile number: 07…, 01… or +254…");
      if (!landmark.trim()) throw new Error("Add a safe campus meeting point.");
      if (!consent) throw new Error("Confirm that you agree to publish your contact details and meeting point.");
      setBusy(true);
      const response = await fetch("/api/businesses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(), ownerName: owner.name, ownerEmail: owner.email,
          phone: contactPhone, whatsapp: contactPhone, zone, landmark: landmark.trim(),
          primaryCategory: category, description: description.trim(), sellerType: "COMRADE",
          comradeListingKind: kind, verificationVisitRequested: true, proofId: proofId || undefined,
          serviceModes: ["comes_to_you"], hours: {}, photos, coverPhoto: photos[0] || "",
          services: [{ id: crypto.randomUUID(), name: name.trim(), priceFrom: Number(price), note: description.trim().slice(0, 500), photo: photos[0] || undefined }],
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not save your listing. Please try again.");
      saveStudentContact({ phone: contactPhone.trim() });
      setSlug(data.business.slug);
      try { sessionStorage.removeItem(draftKey); } catch { /* Optional local storage. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not post your listing."); }
    finally { setBusy(false); }
  }

  if (loading) return <div role="status" className="space-y-4 p-6"><div className="h-36 animate-pulse rounded-2xl bg-[#e5eddd]" /><p className={styles.hint}>Getting your listing space ready…</p></div>;
  if (!owner) return <div className={`${styles.success} ${styles.flow}`}>
    <div className={styles.successIcon}><Sparkles size={29} aria-hidden="true" /></div>
    <h2>Your next sale starts here.</h2>
    <p>Sell a second-hand find or share your student hustle. Sign in to create your free listing and manage it anytime.</p>
    {error && <p role="alert">{error}</p>}
    <div className="mt-6 flex flex-wrap justify-center gap-3">
      <Link href="/login?next=%2Fmarket%3Fpost%3D1" className="ui-button ui-button-primary">Sign in to post <ArrowRight size={16} /></Link>
      <Link href="/register?next=%2Fmarket%3Fpost%3D1" className="ui-button ui-button-secondary">Create account</Link>
    </div>
    <p>Your email is for your account. Only the contact details you choose go on your listing.</p>
  </div>;
  if (slug) return <div ref={resultRef} tabIndex={-1} className={`${styles.success} ${styles.flow} focus:outline-none`}>
    <div className={styles.successIcon}><CheckCircle2 size={31} aria-hidden="true" /></div>
    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#617c4f]">Saved successfully</span>
    <h2 className="mt-3">Your listing is on its way.</h2>
    <p><strong>{name}</strong> and {photos.length ? `your ${photos.length} ${photos.length === 1 ? "photo is" : "photos are"}` : "your details are"} saved. Your listing will appear publicly after review. We’ll notify you when it’s ready.</p>
    <div className={`${styles.note} my-5 text-left`}><ShieldCheck size={18} /><span>Your student ID stays private. Listings run for 30 days; you can update photos, edit prices or mark an item sold from your dashboard.</span></div>
    <div className="flex flex-wrap justify-center gap-3">
      <Link className="ui-button ui-button-primary" href={`/dashboard/${slug}`}>Manage my listing <ArrowRight size={16} /></Link>
      {onClose && <Button type="button" variant="secondary" onClick={onClose}>Back to listings</Button>}
    </div>
  </div>;

  return <form onSubmit={submit} className={`${styles.flow} space-y-4`}>
    <div ref={topRef} className="scroll-mt-20">
      <ListingFlowHeader step={step} title={step === 1 ? "Big hustle. Fresh start." : "Looking good. Make it yours."} description={step === 1 ? "An item to sell or a skill to share? Give it a place on campus. Your listing is free." : "Preview your listing, choose a safe meeting point and tell customers how to reach you."} />
    </div>
    {error && <p ref={errorRef} tabIndex={-1} role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 focus:outline-none">{error}</p>}
    {notice && <p role="status" className={styles.note}>{notice}</p>}
    {step === 1 ? <div className="enrollment-step-panel space-y-4">
      <section className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.sectionIcon}><Package size={19} /></span><div><h3>What are you putting out there?</h3><p>Choose the kind of listing you want to create.</p></div></div>
        <fieldset disabled={locked} className="space-y-5">
          <legend className="sr-only">Listing type</legend>
          <div className={styles.choiceGrid}>
            {([['DECLUTTER', 'A second-hand find', 'Pass it on to another comrade.'], ['HUSTLE', 'My student hustle', 'Put your skills and services to work.']] as const).map(([value, title, help]) => <label key={value} className={styles.choice}>
              <input type="radio" name="market-kind" value={value} checked={kind === value} onChange={() => field("kind", value)} /><span><strong>{title}</strong><small>{help}</small></span>
            </label>)}
          </div>
          <label className="block">Item or service name<Input required maxLength={120} placeholder={kind === "HUSTLE" ? "e.g. Braids by Njeri" : "e.g. Study desk in great condition"} value={name} onChange={(e) => field("name", e.target.value)} /></label>
          <div className={styles.twoColumns}>
            <label>Price (KES)<Input required type="number" min={0} max={10000000} step="0.01" inputMode="decimal" placeholder="e.g. 1,500" value={price} onChange={(e) => field("price", e.target.value)} /></label>
            <div><span className="mb-1.5 block text-[13px] font-semibold">Category</span><EnrollmentCategoryPicker value={category} onChange={(value) => field("category", value)} /></div>
          </div>
          <label className="block">Condition / service details<textarea className="ui-input min-h-28" required minLength={20} maxLength={1000} placeholder={kind === "HUSTLE" ? "What do you offer, what is included, and when are you available?" : "Describe the condition, size and what’s included. Mention any wear or faults."} value={description} aria-describedby="market-details-count" onChange={(e) => field("description", e.target.value)} /></label>
          <p id="market-details-count" className={`${styles.hint} -mt-3`}>{description.trim().length < 20 ? `At least ${20 - description.trim().length} more characters · ` : ""}{description.length}/1000</p>
        </fieldset>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.sectionIcon}><ImagePlus size={19} /></span><div><h3>Let your photos do the talking</h3><p>Add up to 8 real photos. Your cover appears first on your public listing.</p></div></div>
        <div className="space-y-4">
          <PhotoUploader enrollment multiple camera maxFiles={8 - photos.length} label="Listing photos (public)" disabled={locked || photos.length >= 8} disabledReason={photos.length >= 8 ? "All 8 spaces are filled. Remove a photo to add another." : undefined} onBusyChange={setUploading} onUploaded={(urls) => setDraft((current) => ({ ...current, photos: [...current.photos, ...urls] }))} readyMessage="Photos added to your draft. Submit your listing to save and send them for review." saveMessage="Adding photos to your draft…" />
          <ListingPhotoGallery photos={photos} coverPhoto={photos[0]} disabled={locked} onCover={(url) => field("photos", [url, ...photos.filter((p) => p !== url)])} onRemove={(url) => void removePhoto(url)} />
          {!photos.length && <p className={styles.hint}>Photos are optional. A clear photo helps students see exactly what you’re offering.</p>}
        </div>
      </section>
    </div> : <div className="enrollment-step-panel space-y-4">
      <section aria-label="Your listing preview" className={styles.preview}>
        {photos[0] && <Image className={styles.previewImage} unoptimized width={800} height={450} src={photos[0]} alt={`${name} cover preview`} />}
        <div className={styles.previewBody}>
          <span className="rounded-full bg-[#edf3e4] px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#446740]">{kind === "HUSTLE" ? "Student hustle" : "Second-hand"} · Preview</span>
          <h3>{name}</h3><p className={styles.previewPrice}>KES {Number(price).toLocaleString("en-KE")}</p>
          <p className="whitespace-pre-wrap break-words text-sm leading-7 text-[#617469]">{description}</p>
          <p className={`${styles.hint} mt-3`}>{CATEGORIES.find((c) => c.slug === category)?.name} · {photos.length} {photos.length === 1 ? "photo" : "photos"}</p>
        </div>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.sectionIcon}><MapPin size={19} /></span><div><h3>Make the connection</h3><p>These details will be public. Choose a safe, shared meeting spot.</p></div></div>
        <fieldset disabled={locked} className={styles.fields}>
          <label>Your WhatsApp or contact number<Input required type="tel" autoComplete="tel" placeholder="0712 345 678" value={contactPhone} onChange={(e) => field("contactPhone", e.target.value)} /></label>
          <label>Campus zone<select className="ui-input" value={zone} onChange={(e) => field("zone", e.target.value)}>{ZONES.filter((z) => z.slug !== "all").map((z) => <option key={z.slug} value={z.slug}>{z.name}</option>)}</select></label>
          <label>Safe meeting point / hostel landmark<Input required maxLength={300} placeholder="e.g. Main hostel gate, next to the shop" value={landmark} onChange={(e) => field("landmark", e.target.value)} /></label>
        </fieldset>
      </section>
      <section className={styles.section}>
        <div className={styles.sectionHeading}><span className={styles.sectionIcon}><ShieldCheck size={19} /></span><div><h3>A little trust goes a long way</h3><p>Your account email and student ID stay private.</p></div></div>
        <label className="block space-y-3">Private student ID (optional)<Input type="file" accept="image/jpeg,image/png,image/webp" disabled={locked} onChange={(e) => void uploadProof(e.target.files?.[0])} /></label>
        <p role="status" className={`${styles.hint} mt-3`}>{proofBusy ? "Uploading your ID privately…" : proofId ? "✓ Student ID uploaded privately. It will never appear on your public listing." : "Add your ID for a Verified Comrade review, or a reviewer can check your identity in person. Your listing is reviewed before publication."}</p>
        <label className="mt-5 flex items-start gap-3 rounded-xl bg-[#f3f6ed] p-4 leading-6"><input required type="checkbox" className="mt-1 size-4 shrink-0 accent-[#335e41]" disabled={locked} checked={consent} onChange={(e) => setConsent(e.target.checked)} /><span>I agree to publish my WhatsApp and meeting point and have my student identity checked.</span></label>
      </section>
    </div>}
    <div className={styles.actions}>
      <div className="flex items-center gap-3">
        {step === 2 && <button type="button" disabled={locked} onClick={() => goTo(1)} className="flex min-h-11 items-center gap-1.5 text-xs font-bold"><ArrowLeft size={15} />Back</button>}
        <div className="flex flex-col"><button type="button" disabled={locked} className="min-h-6 text-left text-xs font-bold underline underline-offset-4" onClick={saveDraft}>Save draft</button><button type="button" disabled={locked} className="min-h-6 text-left text-[11px] text-[#617469] underline underline-offset-4" onClick={restoreDraft}>Restore draft</button></div>
      </div>
      <Button type="submit" disabled={locked}>{busy ? "Saving listing…" : uploading || proofBusy ? "Uploading…" : step === 1 ? "Continue to review" : "Submit free student listing"}<ArrowRight size={16} aria-hidden="true" /></Button>
    </div>
  </form>;
}
