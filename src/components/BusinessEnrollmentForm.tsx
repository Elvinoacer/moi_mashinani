"use client";
import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { PhoneSignIn } from "./PhoneSignIn";
import { ZONES } from "@/lib/constants";
import { CategorySelect } from "./CategorySelect";
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
  const [phoneOwner, setPhoneOwner] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [authAttempt, setAuthAttempt] = useState(0);
  const [step, setStep] = useState(1);
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
  useEffect(() => {
    if (mode !== "public") return;
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.phone) {
          setPhoneOwner(data.user);
          setDetails((d) => ({
            ...d,
            ownerName: data.user.name,
            ownerPhone: data.user.phone,
            phone: d.phone || data.user.phone,
          }));
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [mode, authAttempt]);
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
      (!phoneOwner &&
        mode === "public" &&
        !/^\S+@\S+\.\S+$/.test(details.ownerEmail))
    )
      throw new Error(
        "Add the business name, category, owner name and a recovery email.",
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
  function preview() {
    setError("");
    try {
      essentialsValid();
      setStep(2);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (cause) {
      setError((cause as Error).message);
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
      <Card className="mx-auto max-w-2xl space-y-4">
        <h2 className="text-2xl font-bold">
          {result.business.name}: listing saved
        </h2>
        <p>
          {result.business.status === "ACTIVE"
            ? "Your inspected listing is live."
            : "Your preview is saved for review."}{" "}
          {phoneOwner
            ? "Your phone account can manage this listing now."
            : details.ownerEmail
              ? `Accept the owner invitation at ${details.ownerEmail}, or verify your owner phone by SMS.`
              : "The owner can verify their phone by SMS to manage this listing."}
        </p>
        {result.business.verificationVisitRequested && (
          <p>A free verification visit is in the field queue.</p>
        )}
        {!result.invitation.sent && (
          <p role="alert">
            {result.invitation.error ||
              "Invitation delivery unavailable. Your listing is saved; request the email again."}
          </p>
        )}
        {details.ownerEmail && !phoneOwner && (
          <Button
            disabled={busy}
            variant="secondary"
            onClick={() => void resend()}
          >
            Resend owner invitation
          </Button>
        )}
        <Link href="/login" className="ui-button ui-button-primary">
          Go to my account
        </Link>
        {(phoneOwner ||
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
          <Link className="block underline" href={`/b/${result.business.slug}`}>
            View public page
          </Link>
        )}
        {notice && <p role="status">{notice}</p>}
        {error && <p role="alert">{error}</p>}
      </Card>
    );
  return (
    <>
      {mode === "public" && !phoneOwner && (
        <Card className="mx-auto max-w-3xl">
          <PhoneSignIn onSignedIn={() => setAuthAttempt((n) => n + 1)} />
        </Card>
      )}
      <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
        <Card>
          <h2 className="text-2xl font-bold">
            {mode === "public"
              ? "Your shop or hustle, on campus"
              : "Quick field enrollment"}
          </h2>
          <p className="mt-2 text-sm">
            Two steps: essentials & prices, then preview & trust. Unlimited
            price slots are always free.
          </p>
          <div className="mt-4 flex gap-3">
            <Button
              type="button"
              variant={step === 1 ? "primary" : "secondary"}
              onClick={() => setStep(1)}
              aria-current={step === 1 ? "step" : undefined}
            >
              1 · Essentials & prices
            </Button>
            <Button
              type="button"
              variant={step === 2 ? "primary" : "secondary"}
              onClick={preview}
              aria-current={step === 2 ? "step" : undefined}
            >
              2 · Preview & trust
            </Button>
          </div>
        </Card>
        {step === 1 ? (
          <Card className="space-y-5">
            <fieldset>
              <legend className="mb-2 font-bold">How do you operate?</legend>
              <div className="flex flex-wrap gap-2">
                {(["SHOPFRONT", "COMRADE"] as const).map((type) => (
                  <Button
                    type="button"
                    key={type}
                    variant={sellerType === type ? "primary" : "secondary"}
                    aria-pressed={sellerType === type}
                    onClick={() => setSellerType(type)}
                  >
                    {type === "SHOPFRONT"
                      ? "I have a shop / stall"
                      : "Hostel / mobile hustle"}
                  </Button>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-4 sm:grid-cols-2">
              {field("name", "Business name")}
              {field("phone", "Business WhatsApp", "tel")}
              <label className="block text-sm font-semibold">
                Business category
                <CategorySelect
                  value={details.primaryCategory}
                  onChange={(value) => {
                    setDetails((d) => ({ ...d, primaryCategory: value }));
                    setItems([]);
                  }}
                  className="ui-input"
                />
              </label>
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
              {!phoneOwner &&
                field(
                  "ownerEmail",
                  mode === "public"
                    ? "Recovery email (or sign in by phone above)"
                    : "Owner email (optional for SMS setup)",
                  "email",
                )}
            </div>
            <p className="text-xs">
              Your email is used once to accept ownership and set a password,
              and for account recovery. Then sign in using your owner phone and
              password.
            </p>
            <details>
              <summary className="cursor-pointer font-semibold">
                Separate private owner phone
              </summary>
              {field("ownerPhone", "Private owner phone (if different)", "tel")}
            </details>
            <h3 className="text-lg font-bold">Add 3–5 core prices</h3>
            <div className="flex max-h-48 flex-wrap gap-2 overflow-y-auto">
              {templateSuggestions(details.primaryCategory, "").map((item) => (
                <Button
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
          <>
            <Card className="space-y-3">
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
            <Card className="space-y-4">
              <h3 className="text-xl font-bold">Trust upgrade</h3>
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
              <div className="grid grid-cols-3 gap-2">
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
          </>
        )}
        {error && (
          <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
            {error}
          </p>
        )}
        {notice && <p role="status">{notice}</p>}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {step === 2 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={saveDraft}>
            Save draft
          </Button>
          <Button type="button" variant="secondary" onClick={restore}>
            Restore
          </Button>
          <Button type="submit" disabled={busy || uploading}>
            {busy
              ? "Saving…"
              : step === 1
                ? "Preview listing"
                : "Save listing & request verification"}
          </Button>
        </div>
      </form>
    </>
  );
}
