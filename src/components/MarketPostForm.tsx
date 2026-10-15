"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CATEGORIES, ZONES } from "@/lib/constants";
import { PhoneSignIn } from "./PhoneSignIn";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
type Owner = { name: string; phone?: string };
export function MarketPostForm() {
  const [owner, setOwner] = useState<Owner | null>(null),
    [loading, setLoading] = useState(true),
    [attempt, setAttempt] = useState(0);
  const [kind, setKind] = useState("DECLUTTER"),
    [name, setName] = useState(""),
    [price, setPrice] = useState(""),
    [description, setDescription] = useState(""),
    [zone, setZone] = useState("stage"),
    [landmark, setLandmark] = useState(""),
    [category, setCategory] = useState("phone-laptop-repair"),
    [proofId, setProofId] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [slug, setSlug] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { signal: controller.signal, cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setOwner(data.user?.phone ? data.user : null);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
          setError("Could not check your phone sign-in.");
        }
      });
    return () => controller.abort();
  }, [attempt]);
  if (loading) return <p role="status">Checking your phone sign-in…</p>;
  if (!owner)
    return (
      <div className="ui-card">
        <PhoneSignIn
          onSignedIn={() => {
            setLoading(true);
            setAttempt((n) => n + 1);
          }}
        />
        <p className="mt-3 text-xs">
          Verify your phone once to manage your listings. Your student ID is
          checked separately.
        </p>
      </div>
    );
  if (slug)
    return (
      <div className="ui-card space-y-3">
        <h2 className="text-xl font-bold">
          Your student listing is saved for review
        </h2>
        <p>
          Your ID stays private. A field reviewer checks your student identity
          and campus meeting point before publication. Listings expire after 30
          days; mark items sold from your dashboard.
        </p>
        <Link
          className="ui-button ui-button-primary"
          href={`/dashboard/${slug}`}
        >
          Manage my listing
        </Link>
      </div>
    );
  return (
    <form
      className="ui-card space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const r = await fetch("/api/businesses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name,
              ownerName: owner.name,
              phone: owner.phone,
              whatsapp: owner.phone,
              zone,
              landmark,
              primaryCategory: category,
              description,
              sellerType: "COMRADE",
              comradeListingKind: kind,
              verificationVisitRequested: true,
              proofId,
              serviceModes: ["comes_to_you"],
              hours: {},
              services: [
                {
                  id: crypto.randomUUID(),
                  name,
                  priceFrom: Number(price),
                  note: description,
                },
              ],
            }),
          });
          const data = await r.json();
          if (!r.ok) throw new Error(data.error);
          setSlug(data.slug);
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Could not post.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl font-bold">One item or hostel service</h2>
      <label className="block">
        Listing type
        <select
          className="ui-input"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="DECLUTTER">Declutter / second-hand item</option>
          <option value="HUSTLE">Student hustle / service</option>
        </select>
      </label>
      <label className="block">
        Item or service name
        <Input
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block">
        Price (KES)
        <Input
          required
          type="number"
          min={0}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
      </label>
      <label className="block">
        Condition / service details
        <textarea
          className="ui-input"
          required
          minLength={20}
          maxLength={1000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      <label className="block">
        Category
        <select
          className="ui-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Campus zone
        <select
          className="ui-input"
          value={zone}
          onChange={(e) => setZone(e.target.value)}
        >
          {ZONES.filter((z) => z.slug !== "all").map((z) => (
            <option key={z.slug} value={z.slug}>
              {z.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        Safe meeting point / hostel landmark
        <Input
          required
          maxLength={300}
          value={landmark}
          onChange={(e) => setLandmark(e.target.value)}
        />
      </label>
      <label className="block">
        Private student ID (required for review)
        <input
          required={!proofId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setBusy(true);
            setError("");
            try {
              const form = new FormData();
              form.append("file", file);
              const r = await fetch("/api/enrollment/proof", {
                method: "POST",
                body: form,
              });
              const data = await r.json();
              if (!r.ok) throw new Error(data.error);
              setProofId(data.proofId);
            } catch (cause) {
              setError(
                cause instanceof Error ? cause.message : "Could not upload ID.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {proofId && (
        <p className="text-xs">
          Student ID uploaded privately. It will never appear on your public
          listing.
        </p>
      )}
      <label className="flex gap-2 text-sm">
        <input required type="checkbox" />I agree to publish my WhatsApp and
        meeting point and have my student identity checked.
      </label>
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy || !proofId}>
        {busy ? "Saving…" : "Submit free student listing"}
      </Button>
    </form>
  );
}
