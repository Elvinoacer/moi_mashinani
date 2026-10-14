"use client";
import { useEffect, useState } from "react";
export function TrustShield({ slug }: { slug: string }) {
  const [trust, setTrust] = useState<{
    level: string;
    sellerType: string;
    landmark: string;
    lastCheckedAt?: string;
    openScamReports: number;
  } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/businesses/${slug}/trust`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (r) => {
        if (r.ok) {
          const data = await r.json();
          if (!controller.signal.aborted) setTrust(data);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, [slug]);
  if (!trust) return null;
  return (
    <section className="ui-card space-y-2">
      <h2 className="text-lg font-bold">Comrade trust shield</h2>
      <p className="text-sm">
        {trust.level === "L2"
          ? trust.sellerType === "COMRADE"
            ? "Student identity and campus location checked."
            : "Shopfront and physical location checked."
          : "Field verification has not been completed."}{" "}
        {trust.lastCheckedAt && trust.level === "L2"
          ? `Last check: ${new Date(trust.lastCheckedAt).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}.`
          : ""}
      </p>
      <p className="text-sm">Location: {trust.landmark}</p>
      <p className="text-sm">
        {trust.openScamReports
          ? `${trust.openScamReports} scam ${trust.openScamReports === 1 ? "report" : "reports"} awaiting review.`
          : "No open scam reports recorded."}{" "}
        A badge describes the checks performed; confirm the seller and item
        before sending money.
      </p>
    </section>
  );
}
