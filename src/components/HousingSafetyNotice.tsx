import { ShieldAlert } from "lucide-react";
import { HOUSING_SAFETY_NOTICE } from "@/lib/housing";

export function HousingSafetyNotice() {
  return (
    <aside aria-label="Housing scam caution" className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-relaxed text-amber-950">
      <p className="mb-1 flex items-center gap-2 font-bold"><ShieldAlert size={19} aria-hidden="true" /> Be careful: housing is unverified</p>
      <p>{HOUSING_SAFETY_NOTICE}</p>
    </aside>
  );
}
