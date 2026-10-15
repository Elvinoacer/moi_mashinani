"use client";
import { useEffect, useState } from "react";
import type { Business, FlashDeal, CampusUtilities } from "@/lib/types";
import { ZONES } from "@/lib/constants";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
const flags = [
  ["hasGenerator", "Backup power / generator"],
  ["hasWifi", "Wi-Fi"],
  ["hasWater", "Water available"],
  ["lateNightBoda", "Night boda"],
  ["freeDelivery", "Free delivery to served zones"],
  ["noBrokerFee", "Caretaker direct, no broker fee"],
] as const;
export function MerchantDailyTools({ business }: { business: Business }) {
  const [utilities, setUtilities] = useState<CampusUtilities>(
      business.utilities || {},
    ),
    [deals, setDeals] = useState<FlashDeal[]>([]);
  const [title, setTitle] = useState(""),
    [price, setPrice] = useState(""),
    [end, setEnd] = useState(""),
    [dropZone, setDropZone] = useState(""),
    [dropAt, setDropAt] = useState(""),
    [fee, setFee] = useState("0");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/deals", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data))
          setDeals(data.filter((d) => d.businessId === business.id));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [business.id]);
  async function send(path: string, method: string, body: unknown) {
    const r = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Could not save.");
    return data;
  }
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await action();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection error.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ui-card space-y-5" aria-label="Daily campus tools">
      <h2 className="text-xl font-bold">Daily deals & campus survival</h2>
      {business.sellerType === "COMRADE" && (
        <div className="space-y-2">
          <p className="text-sm">
            Student listings expire after 30 days. Reconfirm that your items or
            services are still available, and mark sold items in your catalogue.
          </p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await send(
                  `/api/businesses/${business.slug}/refresh-market`,
                  "POST",
                  {},
                );
                setMessage(
                  "Your reviewed student listing is refreshed for 30 days.",
                );
              })
            }
          >
            Refresh my student listing
          </Button>
        </div>
      )}

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await send(`/api/businesses/${business.slug}`, "PATCH", {
              utilities,
            });
            setMessage(
              "Campus details saved. Confirm open status to appear in the live blackout filters.",
            );
          });
        }}
      >
        <h3 className="font-bold">Utilities & caretaker details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {flags.map(([key, label]) => (
            <label key={key} className="flex gap-2 text-sm">
              <input
                type="checkbox"
                checked={Boolean(utilities[key])}
                onChange={(e) =>
                  setUtilities((u) => ({ ...u, [key]: e.target.checked }))
                }
              />
              {label}
            </label>
          ))}
        </div>
        {business.primaryCategory === "hostels-rooms" && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["vacantRooms", "rentKes"] as const).map((key) => (
                <label key={key}>
                  {key === "vacantRooms"
                    ? "Vacant rooms"
                    : "Monthly rent (KES)"}
                  <Input
                    type="number"
                    min={0}
                    value={utilities[key] ?? ""}
                    onChange={(e) =>
                      setUtilities((u) => ({
                        ...u,
                        [key]:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ))}
            </div>
            <label className="block">
              Water status
              <Input
                maxLength={200}
                value={utilities.waterStatus || ""}
                onChange={(e) =>
                  setUtilities((u) => ({ ...u, waterStatus: e.target.value }))
                }
              />
            </label>
            <label className="block">
              Security details
              <Input
                maxLength={200}
                value={utilities.security || ""}
                onChange={(e) =>
                  setUtilities((u) => ({ ...u, security: e.target.value }))
                }
              />
            </label>
          </>
        )}
        <Button disabled={busy} type="submit">
          Save campus details
        </Button>
      </form>
      <form
        className="space-y-3 border-t pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            const iso = (value: string) =>
              new Date(`${value}:00+03:00`).toISOString();
            await send("/api/deals", "POST", {
              businessId: business.id,
              title,
              priceKes: Number(price),
              endsAt: iso(end),
              ...(dropZone
                ? { dropZone, dropAt: iso(dropAt), deliveryFeeKes: Number(fee) }
                : {}),
            });
            setTitle("");
            setPrice("");
            setMessage("Your flash deal is live.");
            const r = await fetch("/api/deals");
            const data = await r.json();
            if (r.ok)
              setDeals(
                data.filter((d: FlashDeal) => d.businessId === business.id),
              );
          });
        }}
      >
        <h3 className="font-bold">Publish a flash deal or delivery drop</h3>
        <p className="text-xs">
          All times are Kenya time (EAT). Listing deals is free. Order cutoff
          must be before delivery.
        </p>
        <label className="block">
          Deal title
          <Input
            required
            maxLength={150}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chapati + ndengu dinner"
          />
        </label>
        <label className="block">
          Price (KES)
          <Input
            required
            type="number"
            min={0}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </label>
        <label className="block">
          Order cutoff
          <Input
            required
            type="datetime-local"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </label>
        {business.serviceModes.includes("delivery") && (
          <>
            <label className="block">
              Delivery drop zone
              <select
                className="ui-input"
                value={dropZone}
                onChange={(e) => setDropZone(e.target.value)}
              >
                <option value="">No delivery drop</option>
                {ZONES.filter(
                  (z) =>
                    z.slug !== "all" &&
                    (business.zone === z.slug ||
                      business.servesZones.includes(z.slug)),
                ).map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name}
                  </option>
                ))}
              </select>
            </label>
            {dropZone && (
              <>
                <label className="block">
                  Batch delivery time
                  <Input
                    required
                    type="datetime-local"
                    value={dropAt}
                    onChange={(e) => setDropAt(e.target.value)}
                  />
                </label>
                <label className="block">
                  Per-order delivery fee (KES)
                  <Input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                  />
                </label>
              </>
            )}
          </>
        )}
        <Button disabled={busy} type="submit">
          Publish deal free
        </Button>
      </form>
      {deals.map((d) => (
        <div key={d.id} className="flex justify-between gap-3">
          <span>
            {d.title} · KES {d.priceKes} · {d.joins} interested
          </span>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await send("/api/deals", "PATCH", { id: d.id });
                setDeals((current) =>
                  current.filter((item) => item.id !== d.id),
                );
                setMessage("Deal closed.");
              })
            }
          >
            End deal
          </Button>
        </div>
      ))}
      {message && <p role="status">{message}</p>}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
    </section>
  );
}
