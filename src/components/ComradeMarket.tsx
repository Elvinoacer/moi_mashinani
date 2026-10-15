"use client";
import { useState } from "react";
import Link from "next/link";
import type { Business } from "@/lib/types";
import { useCampusZone } from "@/lib/useCampusZone";
import { useNow } from "@/lib/useNow";
import { survivalMatch } from "@/lib/campus-value";
import { ZONES } from "@/lib/constants";
import { BusinessCard } from "./BusinessCard";
import { MarketPostForm } from "./MarketPostForm";
import { Button } from "./ui/Button";
export function ComradeMarket({ initial }: { initial: Business[] }) {
  const [zone, setZone] = useCampusZone(),
    [kind, setKind] = useState("all"),
    [post, setPost] = useState(false),
    now = useNow();
  const listings = initial.filter(
    (b) =>
      survivalMatch(b, "comrade", now) &&
      (zone === "all" || b.zone === zone || b.servesZones.includes(zone)) &&
      (kind === "all" || b.comradeListingKind === kind),
  );
  return (
    <>
      <section className="ui-card space-y-4">
        <h1 className="text-3xl font-bold">Comrade Market</h1>
        <p>
          Student hustles, hostel services and second-hand essentials. Student
          identity is checked before a listing goes live.
        </p>
        <Button onClick={() => setPost((value) => !value)}>
          {post ? "Back to the market" : "Post a hustle or declutter item"}
        </Button>
      </section>
      {post ? (
        <MarketPostForm />
      ) : (
        <>
          <label className="block font-bold">
            Your campus zone
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
          <div className="flex flex-wrap gap-3">
            {[
              ["all", "All student listings"],
              ["HUSTLE", "Hostel hustles"],
              ["DECLUTTER", "Declutter"],
            ].map(([value, label]) => (
              <Button
                key={value}
                aria-pressed={kind === value}
                variant={kind === value ? "primary" : "secondary"}
                onClick={() => setKind(value)}
              >
                {label}
              </Button>
            ))}
          </div>
          {listings.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {listings.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          ) : (
            <div className="ui-card">
              <p>No verified student listings match yet.</p>
              <Link href="/requests" className="underline">
                Ask Mashinani for what you need
              </Link>
            </div>
          )}
        </>
      )}
    </>
  );
}
