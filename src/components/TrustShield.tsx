"use client";
import { useEffect, useState } from "react";
import { Flag, ShieldCheck } from "lucide-react";

export function TrustShield({
  slug,
  business,
  onReportProblem,
}: {
  slug: string;
  business?: {
    verificationLevel?: string;
    sellerType?: string;
    landmark?: string;
  };
  onReportProblem?: () => void;
}) {
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

  const level = trust?.level ?? business?.verificationLevel ?? "L0";
  const sellerType = trust?.sellerType ?? business?.sellerType ?? "SHOPFRONT";
  const landmark = trust?.landmark ?? business?.landmark ?? "Moi University Campus";
  const openScamReports = trust?.openScamReports ?? 0;
  const lastCheckedAt = trust?.lastCheckedAt;
  return (
    <section className="ui-card space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-[#335e41]" aria-hidden="true" />
        <h2 className="text-lg font-bold text-[#243b32]">Comrade trust shield</h2>
      </div>
      <p className="text-sm text-[#405448]">
        {level === "L2"
          ? sellerType === "COMRADE"
            ? "Student identity and campus location checked."
            : "Shopfront and physical location checked."
          : sellerType === "COMRADE"
            ? "Unverified Comrade Seller — Meet in public on campus before paying."
            : "Field verification has not been completed."}{" "}
        {lastCheckedAt && level === "L2"
          ? `Last check: ${new Date(lastCheckedAt).toLocaleDateString("en-KE", { timeZone: "Africa/Nairobi" })}.`
          : ""}
      </p>
      <p className="text-sm text-[#405448]">Location: {landmark}</p>
      <p className="text-sm text-[#405448]">
        {openScamReports
          ? `${openScamReports} scam ${openScamReports === 1 ? "report" : "reports"} awaiting review.`
          : "No open scam reports recorded."}{" "}
        A badge describes the checks performed; confirm the seller and item
        before sending money.
      </p>
      {onReportProblem && (
        <div className="pt-2 border-t border-[#dfe5d8]">
          <button
            type="button"
            onClick={onReportProblem}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] px-4 py-2.5 rounded-xl border border-[rgba(180,35,24,0.35)] bg-[#fff5f5] text-[#b42318] text-sm font-bold transition-colors hover:bg-[#fee4e2] focus-visible:outline-2 focus-visible:outline-[#b42318]"
          >
            <Flag className="w-4 h-4 text-[#b42318] shrink-0" aria-hidden="true" />
            <span>Report a Problem or Scam</span>
          </button>
        </div>
      )}
    </section>
  );
}
