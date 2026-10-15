"use client";
import { useEffect, useState } from "react";
import { ZONES } from "@/lib/constants";
export function LeadTimeline({ slug }: { slug: string }) {
  const [events, setEvents] = useState<
    Array<{ id: string; type: string; zone?: string; createdAt: string }>
  >([]);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    async function load() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch(`/api/businesses/${slug}/leads`, {
          signal: controller.signal,
          cache: "no-store",
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        if (!controller.signal.aborted) {
          setEvents(data);
          setError("");
        }
      } catch (cause) {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error ? cause.message : "Could not load contacts.",
          );
      } finally {
        pending = false;
      }
    }
    void load();
    const timer = setInterval(() => void load(), 30000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [slug]);
  return (
    <section className="ui-card space-y-3">
      <h2 className="text-xl font-bold">Recent customer activity</h2>
      <p className="text-xs">
        Recorded button taps and profile visits. These show interest; they do
        not confirm sales.
      </p>
      {error && <p role="alert">{error}</p>}
      {events.length ? (
        events.map((e) => (
          <p className="border-b py-2 text-sm" key={e.id}>
            {e.type === "merchant_reply" || e.type === "open_confirmed" ? "You" : "A visitor"}
            {e.zone && e.zone !== "all"
              ? ` in ${ZONES.find((z) => z.slug === e.zone)?.name || e.zone}`
              : ""}{" "}
            {e.type === "merchant_reply" ? "replied using a quick action" : e.type === "open_confirmed" ? "confirmed your shop is open" : e.type === "view"
              ? "opened your profile"
              : e.type === "call"
                ? "tapped Call"
                : e.type === "whatsapp"
                  ? "tapped WhatsApp"
                  : e.type === "booking" ? "sent a booking request" : "opened directions"}{" "}
            ·{" "}
            {new Date(e.createdAt).toLocaleString("en-KE", {
              timeZone: "Africa/Nairobi",
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        ))
      ) : (
        <p className="text-sm">
          Your next customer activity will appear here with its time and
          selected zone.
        </p>
      )}
    </section>
  );
}
