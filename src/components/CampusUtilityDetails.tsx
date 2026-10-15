import type { Business } from "@/lib/types";
export function CampusUtilityDetails({ business }: { business: Business }) {
  const u = business.utilities;
  if (!u || !Object.keys(u).length) return null;
  return (
    <div
      className="space-y-2 text-sm"
      aria-label="Campus utilities and vacancies"
    >
      <div className="flex flex-wrap gap-2">
        {[
          [u.hasGenerator, "⚡ Backup power"],
          [u.hasWifi, "📶 Wi-Fi"],
          [u.hasWater, "💧 Water"],
          [u.lateNightBoda, "🌙 Night boda"],
          [u.freeDelivery, "🛵 Free delivery"],
          [u.noBrokerFee, "Caretaker direct · no broker fee"],
        ]
          .filter(([enabled]) => enabled)
          .map(([, label]) => (
            <span
              key={String(label)}
              className="rounded-lg bg-[#edf2e5] px-2 py-1 text-xs"
            >
              {label}
            </span>
          ))}
      </div>
      {business.primaryCategory === "hostels-rooms" && (
        <>
          <p>
            {u.vacantRooms ?? "Ask about"} vacant rooms
            {u.rentKes !== undefined &&
              ` · KES ${u.rentKes.toLocaleString("en-KE")}/month`}
          </p>
          {u.waterStatus && <p>Water: {u.waterStatus}</p>}
          {u.security && <p>Security: {u.security}</p>}
        </>
      )}
      <p className="text-xs text-[#667064]">
        Seller-reported details. Confirm current service, delivery and vacancy
        availability.
      </p>
    </div>
  );
}
