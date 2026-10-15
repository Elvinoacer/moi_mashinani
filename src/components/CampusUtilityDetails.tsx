import { Bike, Droplets, Handshake, Moon, Wifi, Zap } from "lucide-react";
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
          { enabled: u.hasGenerator, label: "Backup power", icon: Zap },
          { enabled: u.hasWifi, label: "Wi-Fi", icon: Wifi },
          { enabled: u.hasWater, label: "Water", icon: Droplets },
          { enabled: u.lateNightBoda, label: "Night boda", icon: Moon },
          { enabled: u.freeDelivery, label: "Free delivery", icon: Bike },
          {
            enabled: u.noBrokerFee,
            label: "Caretaker direct · no broker fee",
            icon: Handshake,
          },
        ]
          .filter(({ enabled }) => enabled)
          .map(({ label, icon: Icon }) => (
            <span
              key={label}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#edf2e5] px-2 py-1 text-xs"
            >
              <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
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
