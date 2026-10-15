"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { ZONES } from "@/lib/constants";
import { EnrollmentCategoryPicker } from "./EnrollmentCategoryPicker";
import { PhotoUploader } from "./PhotoUploader";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Card } from "./ui/Card";
import {
  templateSuggestions,
  hoursPreset,
  suggestedEnrollmentCopy,
} from "@/lib/enrollment-templates";
import type { Business } from "@/lib/types";
type Item = { id: string; name: string; price: string };
type Details = {
  name: string;
  primaryCategory: string;
  zone: string;
  phone: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  landmark: string;
};
const blank: Details = {
  name: "",
  primaryCategory: "",
  zone: "kesses-centre",
  phone: "",
  ownerName: "",
  ownerEmail: "",
  ownerPhone: "",
  landmark: "",
};
export function BusinessEnrollmentForm({
  mode = "admin",
  onEnrolled,
}: {
  mode?: "admin" | "public" | "field";
  onEnrolled?: () => void;
}) {
  const [signedInOwner, setSignedInOwner] = useState<{
    name: string;
    email: string;
    phone?: string;
  } | null>(null);
  const [step, setStep] = useState(1);
  const stepNavRef = useRef<HTMLElement>(null);
  const [itemQuery, setItemQuery] = useState("");
  const [details, setDetails] = useState(blank);
  const [sellerType, setSellerType] = useState<"SHOPFRONT" | "COMRADE">(
    "SHOPFRONT",
  );
  const [items, setItems] = useState<Item[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [proofId, setProofId] = useState("");
  const [visit, setVisit] = useState(false);
  const [consent, setConsent] = useState(false);
  const [fieldVisit, setFieldVisit] = useState(false);
  const [delivery, setDelivery] = useState(false);
  const [hours, setHours] = useState("standard");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [result, setResult] = useState<{
    business: Business;
    invitation: { sent: boolean; error?: string };
  } | null>(null);
  // Bring the completed journey into view, including for keyboard and screen-reader users.
  useEffect(() => {
    if (!result) return;
    const completion = document.getElementById("listing-submit-result");
    if (!completion) return;
    completion.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
    completion.focus({ preventScroll: true });
  }, [result]);
  useEffect(() => {
    if (mode !== "public") return;
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.email) {
          setSignedInOwner(data.user);
          setDetails((d) => ({
            ...d,
            ownerName: data.user.name,
            ownerEmail: data.user.email,
            ownerPhone: data.user.phone || d.ownerPhone,
            phone: d.phone || data.user.phone || "",
          }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [mode]);
  const draftKey = "mm-enrollment-v3-" + mode;
  function field(key: keyof Details, label: string, type = "text") {
    return (
      <label className="block text-sm font-semibold">
        {label}
        <Input
          type={type}
          value={details[key]}
          maxLength={key.includes("Phone") || key === "phone" ? 20 : 150}
          onChange={(e) => setDetails((d) => ({ ...d, [key]: e.target.value }))}
        />
      </label>
    );
  }
  function add(name = "") {
    setItems((current) => [
      ...current,
      { id: crypto.randomUUID(), name, price: "" },
    ]);
  }
  function essentialsValid() {
    if (
      !details.name.trim() ||
      !details.primaryCategory ||
      !details.ownerName.trim() ||
      (!signedInOwner && !/^\S+@\S+\.\S+$/.test(details.ownerEmail))
    )
      throw new Error(
        "Add the business name, category, owner name and a valid owner email.",
      );
    if (
      !/^254[17]\d{8}$/.test(
        details.phone.replace(/\D/g, "").replace(/^0/, "254"),
      )
    )
      throw new Error("Enter a Kenyan mobile number: 07…, 01… or +254…");
    if (
      items.length < (sellerType === "COMRADE" ? 1 : 3) ||
      items.some(
        (i) =>
          !i.name.trim() ||
          !i.price.trim() ||
          !Number.isFinite(Number(i.price)) ||
          Number(i.price) < 0,
      )
    )
      throw new Error(
        "Add core items with names and valid prices. Student sellers can start with one.",
      );
  }
  function scrollToSteps() {
    stepNavRef.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }
  function returnToEssentials() {
    setError("");
    setStep(1);
    scrollToSteps();
  }
  function preview() {
    setError("");
    try {
      essentialsValid();
      setStep(2);
      scrollToSteps();
    } catch (cause) {
      setError((cause as Error).message);
      scrollToSteps();
    }
  }
  async function uploadProof(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/enrollment/proof", {
        method: "POST",
        body: form,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProofId(data.proofId);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not upload student ID.",
      );
    } finally {
      setUploading(false);
    }
  }
  function saveDraft() {
    try {
      sessionStorage.setItem(
        draftKey,
        JSON.stringify({
          saved: Date.now(),
          details,
          sellerType,
          items,
          photos,
          proofId,
          visit,
          delivery,
          hours,
        }),
      );
      setNotice("Draft saved for 24 hours in this tab.");
    } catch {
      setNotice("Draft storage is unavailable.");
    }
  }
  function restore() {
    try {
      const draft = JSON.parse(sessionStorage.getItem(draftKey) || "{}");
      if (!draft.saved || Date.now() - draft.saved > 864e5)
        throw new Error("No current draft in this tab.");
      setDetails({ ...blank, ...draft.details });
      setSellerType(draft.sellerType || "SHOPFRONT");
      setItems(draft.items || []);
      setPhotos(draft.photos || []);
      setProofId(draft.proofId || "");
      setVisit(!!draft.visit);
      setDelivery(!!draft.delivery);
      setHours(draft.hours || "standard");
      setNotice("Draft restored. Check details and photos before submitting.");
    } catch (cause) {
      setNotice((cause as Error).message);
    }
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (step === 1) {
      preview();
      return;
    }
    if (busy || uploading) return;
    setError("");
    setBusy(true);
    try {
      essentialsValid();
      if (!details.landmark.trim())
        throw new Error("Add a landmark or hostel/zone meeting point.");
      if (mode === "public" && !visit && !photos.length)
        throw new Error("Upload a shop/product photo or request a free visit.");
      if (mode === "public" && sellerType === "COMRADE" && !visit && !proofId)
        throw new Error(
          "Add a private student ID photo or request a free visit.",
        );
      if (mode !== "public" && (!fieldVisit || !consent))
        throw new Error("Confirm the field visit and owner consent.");
      const copy = suggestedEnrollmentCopy(
        details.primaryCategory,
        details.name,
        details.zone,
        items.map((i) => i.name),
      );
      const ref =
        new URLSearchParams(window.location.search).get("ref") || undefined;
      const response = await fetch(
        mode === "admin"
          ? "/api/admin/enroll"
          : mode === "field"
            ? "/api/ambassador"
            : "/api/businesses",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...details,
            ...copy,
            sellerType,
            verificationVisitRequested: visit,
            proofId: proofId || undefined,
            referralCode: ref,
            whatsapp: details.phone,
            ownerPhone: details.ownerPhone || details.phone,
            hours: hoursPreset(
              hours as "standard" | "everyday" | "late" | "appointment",
            ),
            serviceModes: [
              sellerType === "COMRADE" ? "comes_to_you" : "at_shop",
              ...(delivery ? ["delivery"] : []),
            ],
            services: items.map((i) => ({
              id: i.id,
              name: i.name.trim(),
              priceFrom: Number(i.price),
            })),
            photos,
            coverPhoto: photos[0] || "",
            fieldVisitConfirmed: fieldVisit,
            ownerConsentConfirmed: consent,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Could not save listing.");
      setResult(data);
      onEnrolled?.();
      try {
        sessionStorage.removeItem(draftKey);
      } catch {
        /* Optional storage. */
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection error.");
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: details.ownerEmail }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotice(
        "Account link requested. Check your recovery email and spam folder.",
      );
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <Card id="listing-submit-result" tabIndex={-1} aria-label="Listing submission result" className="mx-auto max-w-2xl scroll-mt-6 space-y-4 !p-5 sm:!p-7 focus:outline-none">
        <span className="inline-flex rounded-full bg-[#edf2e5] px-3 py-1 text-xs font-bold text-[#265740]">
          Listing submitted
        </span>
        <h2 className="text-xl font-extrabold text-[#183e35] sm:text-2xl">
          {result.business.name} — listing saved
        </h2>
        <p className="text-sm leading-relaxed text-[#53685b]">
          {result.business.status === "ACTIVE"
            ? "Your listing is live."
            : "Your listing is saved and awaiting review. We’ll notify the owner about the next steps."}
        </p>
        {mode === "public" && !signedInOwner ? (
          <div className="space-y-2 rounded-xl border border-[#dce7d8] bg-[#f2f6ee] p-4">
            <h3 className="text-sm font-bold text-[#183e35]">Next: Check your email</h3>
            <p className="break-words text-sm leading-relaxed text-[#4d6757]">
              {result.invitation.sent
                ? `We sent a secure account invitation to ${details.ownerEmail}. Open it to set your password and manage your business.`
                : `Your listing is saved, but we couldn't deliver the invitation to ${details.ownerEmail}. You can request another account email below.`}
            </p>
            {result.invitation.sent && (
              <p className="text-xs text-[#5e7464]">
                The invitation expires after 24 hours. Check your spam folder if it isn’t in your inbox.
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#4f6959]">
            {signedInOwner
              ? "You can manage this listing using your signed-in email account."
              : "The owner will receive an email invitation for account setup."}
          </p>
        )}
        {result.business.verificationVisitRequested && (
          <p className="text-sm text-[#526d59]">Your request for a free verification visit is in the review queue.</p>
        )}
        {!result.invitation.sent && (
          <p role="alert" className="rounded-lg border border-[#f1d0a7] bg-[#fff7e8] p-3 text-sm text-[#805114]">
            {result.invitation.error ||
              "The email invitation could not be delivered. Your listing is still saved."}
          </p>
        )}
        {details.ownerEmail && !signedInOwner && (
          <Button disabled={busy} variant="secondary" onClick={() => void resend()}>
            {busy ? "Requesting…" : "Request another account email"}
          </Button>
        )}
        {(signedInOwner || mode !== "public") ? (
          <Link href={signedInOwner ? "/dashboard" : "/login"} className="ui-button ui-button-primary">
            Open my account
          </Link>
        ) : (
          <Link href="/" className="inline-flex min-h-11 items-center text-sm font-bold text-[#265640] underline underline-offset-4">
            Back to Moi Mashinani
          </Link>
        )}
        {(signedInOwner ||
          mode !== "public" ||
          result.business.status === "ACTIVE") && (
          <a
            className="ui-button ui-button-secondary"
            href={`/api/businesses/${result.business.slug}/signboard`}
            download
          >
            Download QR signboard
          </a>
        )}
        {result.business.status === "ACTIVE" && (
          <Link className="block text-sm font-semibold underline underline-offset-4" href={`/b/${result.business.slug}`}>
            View public listing
          </Link>
        )}
        {notice && <p role="status" className="text-sm text-[#265640]">{notice}</p>}
        {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
      </Card>
    );
  return (
    <>
      <form onSubmit={submit} className="mx-auto w-full max-w-3xl space-y-4">
        <section ref={stepNavRef} aria-labelledby="enrollment-stage-heading" className="scroll-mt-6 px-1 py-1 sm:px-0">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-bold text-[#335e41]">Step {step} of 2</span>
            <span className="font-medium text-[#657569]">{step === 1 ? "Business essentials" : "Ready to submit"}</span>
          </div>
          <div
            role="progressbar"
            aria-label="Listing setup progress"
            aria-valuemin={0}
            aria-valuemax={2}
            aria-valuenow={step}
            className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#dce6d9]"
          >
            <div
              className="h-full rounded-full bg-[#245947] transition-[width] duration-300 ease-out motion-reduce:transition-none"
              style={{ width: `${step * 50}%` }}
            />
          </div>
          <ol className="mt-2 flex items-center justify-between gap-3 text-xs text-[#6b786d]" aria-label="Listing setup steps">
            <li aria-current={step === 1 ? "step" : undefined} className={step === 1 ? "font-bold text-[#183e35]" : ""}>
              1. Business &amp; prices
            </li>
            <li aria-current={step === 2 ? "step" : undefined} className={step === 2 ? "font-bold text-[#183e35]" : ""}>
              2. Review &amp; submit
            </li>
          </ol>
          <h2 id="enrollment-stage-heading" className="mt-3 text-lg font-extrabold text-[#183e35] sm:text-xl">
            {step === 1 ? "Tell students what you offer" : "Check everything before submitting"}
          </h2>
          <p className="mt-0.5 text-sm leading-relaxed text-[#607267]">
            {step === 1
              ? "Start with your business details and a few everyday prices."
              : "Confirm prices, your location and the details needed for review."}
          </p>
        </section>
        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {notice && <p role="status" className="rounded-xl bg-[#edf2e5] p-3 text-sm text-[#335e41]">{notice}</p>}
        {step === 1 ? (
          <Card key="details" className="enrollment-step-panel space-y-5 !p-4 sm:!p-6">
            <fieldset>
              <legend className="mb-2 font-bold">How do you operate?</legend>
              <div role="radiogroup" aria-label="Business operating style" className="grid gap-2 sm:grid-cols-2">
                {(["SHOPFRONT", "COMRADE"] as const).map((type) => (
                  <label
                    key={type}
                    className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${sellerType === type ? "border-[#335e41] bg-[#edf2e5] text-[#183e35]" : "border-[#dfe5d8] bg-white text-[#526154]"}`}
                  >
                    <input
                      type="radio"
                      name={`seller-type-${mode}`}
                      checked={sellerType === type}
                      onChange={() => setSellerType(type)}
                      className="size-4 shrink-0"
                    />
                    <span>{type === "SHOPFRONT" ? "Shop or stall" : "Hostel / mobile hustle"}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Business name")}
              {field("phone", "Business WhatsApp", "tel")}
              <div className="min-w-0 space-y-1.5 text-sm font-semibold">
                <span>Business category</span>
                <EnrollmentCategoryPicker
                  value={details.primaryCategory}
                  onChange={(value) => {
                    setDetails((d) => ({ ...d, primaryCategory: value }));
                    setItems([]);
                    setItemQuery("");
                  }}
                />
              </div>
              <label className="block text-sm font-semibold">
                Campus zone
                <select
                  className="ui-input"
                  value={details.zone}
                  onChange={(e) =>
                    setDetails((d) => ({ ...d, zone: e.target.value }))
                  }
                >
                  {ZONES.filter((z) => z.slug !== "all").map((z) => (
                    <option key={z.slug} value={z.slug}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </label>
              {field("ownerName", "Owner name")}
              {signedInOwner ? (
                <div className="min-w-0 space-y-1 text-sm">
                  <span className="font-semibold">Verified owner email</span>
                  <p className="break-all rounded-xl bg-[#edf2e5] p-3 text-[#183e35]">{signedInOwner.email}</p>
                </div>
              ) : field("ownerEmail", "Owner email (required)", "email")}
            </div>
            <p className="text-xs">
              Use email to accept the invitation, verify ownership and recover your account. Sign in with email and password.
            </p>
            <details>
              <summary className="cursor-pointer font-semibold">
                Private owner phone (optional contact detail)
              </summary>
              {field("ownerPhone", "Private owner phone (if different)", "tel")}
            </details>
            <div>
              <h3 className="text-lg font-bold">Add core prices</h3>
              <p className="mt-1 text-sm text-[#667064]">Choose suggested items or add your own. Set a price for each.</p>
            </div>
            <div className="space-y-3">
              <Input
                type="search"
                aria-label="Find suggested products or services"
                placeholder="Search suggested items…"
                value={itemQuery}
                onChange={(event) => setItemQuery(event.target.value)}
              />
              <div className="flex flex-wrap gap-2">
                {templateSuggestions(details.primaryCategory, "")
                  .filter((item) => item.name.toLowerCase().includes(itemQuery.trim().toLowerCase()))
                  .slice(0, itemQuery ? 30 : 12)
                  .map((item) => (
                    <Button
                      className="min-h-11 !px-3 text-left"
                      key={item.name}
                      type="button"
                      variant="secondary"
                      disabled={items.some((i) => i.name === item.name)}
                      onClick={() => add(item.name)}
                    >
                      + {item.name}
                    </Button>
                  ))}
              </div>
              {!details.primaryCategory && <p className="text-xs text-[#667064]">Choose a business category to see relevant suggestions.</p>}
            </div>
            {items.map((item, index) => (
              <div
                className="grid gap-2 rounded-xl border p-3 sm:grid-cols-[1fr_150px_auto]"
                key={item.id}
              >
                <label className="text-sm">
                  Item {index + 1}
                  <Input
                    aria-label={`Product ${index + 1} name`}
                    value={item.name}
                    maxLength={150}
                    onChange={(e) =>
                      setItems((current) =>
                        current.map((i) =>
                          i.id === item.id ? { ...i, name: e.target.value } : i,
                        ),
                      )
                    }
                  />
                </label>
                <label className="text-sm">
                  Price · KES
                  <Input
                    aria-label={`Product ${index + 1} price`}
                    type="number"
                    min="0"
                    max="10000000"
                    step="0.01"
                    value={item.price}
                    onChange={(e) =>
                      setItems((current) =>
                        current.map((i) =>
                          i.id === item.id
                            ? { ...i, price: e.target.value }
                            : i,
                        ),
                      )
                    }
                  />
                </label>
                <Button
                  variant="secondary"
                  type="button"
                  aria-label={`Remove item ${index + 1}`}
                  className="w-full sm:self-end"
                  onClick={() =>
                    setItems((current) =>
                      current.filter((i) => i.id !== item.id),
                    )
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="secondary"
              disabled={false}
              onClick={() => add()}
            >
              Add custom item
            </Button>
          </Card>
        ) : (
          <div key="review" className="enrollment-step-panel space-y-5">
            <Card className="space-y-3 !p-4 sm:!p-6">
              <h3 className="text-xl font-bold">Instant listing preview</h3>
              <p className="font-bold">
                {details.name} ·{" "}
                {ZONES.find((z) => z.slug === details.zone)?.name}
              </p>
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.id} className="flex justify-between gap-3">
                    <span>{i.name}</span>
                    <strong>
                      KES {Number(i.price).toLocaleString("en-KE")}
                    </strong>
                  </li>
                ))}
              </ul>
              <p className="text-xs">
                This is your preview. Public listing and a trust badge need
                review.
              </p>
            </Card>
            <Card className="space-y-4 !p-4 sm:!p-6">
              <h3 className="text-xl font-bold">Trust &amp; verification</h3>
              {field(
                "landmark",
                sellerType === "COMRADE"
                  ? "Hostel / safe meeting point"
                  : "Nearby landmark",
              )}
              <label className="block text-sm font-semibold">
                Hours
                <select
                  className="ui-input"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                >
                  {[
                    ["standard", "Mon–Sat 8 AM–6 PM"],
                    ["everyday", "Every day"],
                    ["late", "Late hours"],
                    ["appointment", "By appointment"],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={delivery}
                  onChange={(e) => setDelivery(e.target.checked)}
                />
                I deliver to hostels
              </label>
              <PhotoUploader
                enrollment
                multiple
                camera
                maxFiles={8 - photos.length}
                disabled={uploading || photos.length >= 8}
                label={
                  sellerType === "COMRADE"
                    ? "Product / workspace photos (public)"
                    : "Shop / signboard photos (public)"
                }
                onBusyChange={setUploading}
                onUploaded={(urls) => setPhotos((p) => [...p, ...urls])}
              />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {photos.map((url, index) => (
                  <Image
                    key={url}
                    src={url}
                    alt={`Listing photo ${index + 1}`}
                    width={180}
                    height={120}
                    unoptimized
                    className="rounded-lg"
                  />
                ))}
              </div>
              {sellerType === "COMRADE" && (
                <label className="block space-y-2 text-sm font-semibold">
                  Student ID (private; only you and reviewers can see it)
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={uploading}
                    onChange={(e) => void uploadProof(e.target.files?.[0])}
                  />
                  {proofId && (
                    <span className="block text-green-800">
                      Student ID uploaded privately.
                    </span>
                  )}
                </label>
              )}
              <label className="flex gap-3 rounded-xl bg-[#edf2e5] p-4">
                <input
                  type="checkbox"
                  checked={visit}
                  onChange={(e) => setVisit(e.target.checked)}
                />
                <span>
                  <strong>Request a free ambassador visit</strong>
                  <span className="block text-sm">
                    No suitable photo or ID ready? A reviewer can check your
                    shop or hostel hustle in person. The badge is awarded after
                    verification.
                  </span>
                </span>
              </label>
              {mode !== "public" && (
                <>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={fieldVisit}
                      onChange={(e) => setFieldVisit(e.target.checked)}
                    />
                    I visited this location and checked the shop or student
                    identity.
                  </label>
                  <label className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                    />
                    The owner agreed to publish this listing and its prices.
                  </label>
                </>
              )}
            </Card>
          </div>
        )}
        <div className="flex flex-col gap-3 rounded-2xl border border-[#dfe5d8] bg-white p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 md:sticky md:bottom-3 md:z-20 md:shadow-lg">
          <Button
            type="submit"
            disabled={busy || uploading}
            className="min-h-12 w-full whitespace-normal text-center sm:order-2 sm:ml-auto sm:w-auto"
          >
            {busy
              ? "Saving…"
              : step === 1
                ? "Continue to review"
                : mode === "public"
                  ? "Submit listing for review"
                  : "Save listing & request verification"}
          </Button>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 sm:order-1 sm:justify-start">
            {step === 2 && (
              <button
                type="button"
                onClick={returnToEssentials}
                className="min-h-11 text-sm font-bold text-[#23543f] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
              >
                Back to details
              </button>
            )}
            <button
              type="button"
              onClick={saveDraft}
              className="min-h-11 text-sm font-semibold text-[#466453] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={restore}
              className="min-h-11 text-sm font-semibold text-[#466453] underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
            >
              Restore draft
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
