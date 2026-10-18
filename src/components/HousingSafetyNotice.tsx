import { ShieldAlert } from "lucide-react";
import { HOUSING_SAFETY_NOTICE } from "@/lib/housing";

export function HousingSafetyNotice({ compact = false }: { compact?: boolean }) {
  if (compact) return (
    <aside aria-label="Housing scam caution" className="housing-safety-compact flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
      <div className="housing-safety-compact__main flex min-w-0 flex-1 items-center gap-3">
        <span className="housing-safety-compact__icon grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100"><ShieldAlert size={19} aria-hidden="true" /></span>
        <p><strong>Stay safe while house hunting.</strong> Housing posts are not verified. Visit the place, check who you are dealing with, and never pay before confirming the details.</p>
      </div>
      <details className="housing-safety-compact__details text-xs">
        <summary className="cursor-pointer font-bold underline underline-offset-4">Safety guidance</summary>
        <p className="mt-2 leading-relaxed">{HOUSING_SAFETY_NOTICE}</p>
      </details>
    </aside>
  );
  return (
    <aside aria-label="Housing scam caution" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
      <p className="mb-1 flex items-center gap-2 font-bold"><ShieldAlert size={19} aria-hidden="true" /> Be careful: housing is unverified</p>
      <p>{HOUSING_SAFETY_NOTICE}</p>
    </aside>
  );
}
