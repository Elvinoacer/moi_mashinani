import { ShieldAlert } from "lucide-react";
import { HOUSING_SAFETY_NOTICE } from "@/lib/housing";

export function HousingSafetyNotice({ compact = false }: { compact?: boolean }) {
  if (compact) return (
    <aside aria-label="Housing scam caution" className="housing-safety-compact">
      <div className="housing-safety-compact__main">
        <span className="housing-safety-compact__icon"><ShieldAlert size={19} aria-hidden="true" /></span>
        <p><strong>Stay safe while house hunting.</strong> Housing posts are not verified. Visit the place, check who you are dealing with, and never pay before confirming the details.</p>
      </div>
      <details className="housing-safety-compact__details">
        <summary>Safety guidance</summary>
        <p>{HOUSING_SAFETY_NOTICE}</p>
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
