import type { Business, BusinessHours } from "./types";
export const LIVE_HOURS = 4;
export type SurvivalIntent =
  | "all"
  | "open"
  | "backup"
  | "wifi"
  | "water"
  | "late"
  | "free-delivery"
  | "hostels"
  | "comrade";
const days = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
export function kenyaClock(now: number) {
  const date = new Date(now + 3 * 3600000);
  return {
    day: date.getUTCDay(),
    minutes: date.getUTCHours() * 60 + date.getUTCMinutes(),
    hour: date.getUTCHours(),
  };
}
function minutes(time: string) {
  return Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
}
export function scheduledOpen(hours: BusinessHours, now: number): boolean {
  const clock = kenyaClock(now);
  const today = hours[days[clock.day]];
  const yesterday = hours[days[(clock.day + 6) % 7]];
  if (
    yesterday &&
    !yesterday.closed &&
    !yesterday.appointmentOnly &&
    minutes(yesterday.open) > minutes(yesterday.close) &&
    clock.minutes < minutes(yesterday.close)
  )
    return true;
  if (!today || today.closed || today.appointmentOnly) return false;
  const open = minutes(today.open),
    close = minutes(today.close);
  return open < close
    ? clock.minutes >= open && clock.minutes < close
    : clock.minutes >= open;
}
export function confirmedOpen(b: Business, now: number) {
  return (
    now > 0 &&
    !b.isTemporarilyClosed &&
    Boolean(b.availableNowUntil && Date.parse(b.availableNowUntil) > now)
  );
}
export function availabilityLabel(b: Business, now: number) {
  if (b.isTemporarilyClosed) return "Temporarily closed";
  if (confirmedOpen(b, now)) {
    const confirmed = b.availabilityConfirmedAt
      ? Date.parse(b.availabilityConfirmedAt)
      : NaN;
    if (!Number.isFinite(confirmed)) return "Seller marked available";
    const age = Math.max(0, Math.floor((now - confirmed) / 60000));
    return `Confirmed open ${age < 60 ? `${age}m` : `${Math.floor(age / 60)}h`} ago`;
  }
  return now > 0 && scheduledOpen(b.hours, now)
    ? "Open by listed hours"
    : "Ask availability";
}
export function publicListing(b: Business, now: number) {
  if (b.status !== "ACTIVE") return false;
  if (b.sellerType !== "COMRADE") return true;
  return !b.listingExpiresAt || Date.parse(b.listingExpiresAt) > now;
}
export function survivalMatch(b: Business, intent: string, now: number) {
  if (!publicListing(b, now) || b.isTemporarilyClosed) return false;
  const u = b.utilities || {};
  switch (intent) {
    case "open":
      return confirmedOpen(b, now) || (now > 0 && scheduledOpen(b.hours, now));
    case "backup":
      return Boolean(u.hasGenerator && confirmedOpen(b, now));
    case "wifi":
      return Boolean(u.hasWifi && confirmedOpen(b, now));
    case "water":
      return Boolean(u.hasWater && confirmedOpen(b, now));
    case "late":
      return Boolean(
        u.lateNightBoda ||
        Object.values(b.hours).some(
          (h) =>
            !h.closed &&
            !h.appointmentOnly &&
            (h.close > "21:00" || h.close < h.open),
        ),
      );
    case "free-delivery":
      return Boolean(u.freeDelivery && b.serviceModes.includes("delivery"));
    case "hostels":
      return (
        b.primaryCategory === "hostels-rooms" &&
        b.verificationLevel === "L2" &&
        Boolean(u.noBrokerFee && u.vacantRooms && u.rentKes !== undefined)
      );
    case "comrade":
      return (
        b.sellerType === "COMRADE" &&
        b.verificationLevel === "L2" &&
        b.services.some((s) => s.inStock !== false)
      );
    default:
      return true;
  }
}
export function campusContext(now: number) {
  const hour = kenyaClock(now).hour;
  if (hour >= 7 && hour < 10)
    return {
      title: "Start your campus morning",
      query: "breakfast printing gas water",
      description:
        "Breakfast, morning printing and everyday refills near your zone.",
    };
  if (hour >= 12 && hour < 14)
    return {
      title: "Lunch on a comrade budget",
      query: "food meals lunch",
      description: "Compare today’s meal prices and join a zone delivery drop.",
    };
  if (hour >= 18 && hour < 21)
    return {
      title: "Tonight’s comrade meals & drops",
      query: "food dinner delivery",
      description: "Find dinner deals and share a delivery run to your hostel.",
    };
  if (hour >= 21 || hour < 7)
    return {
      title: "Late on campus",
      query: "pharmacy boda",
      description:
        "Find late-opening shops and night transport. Confirm availability before travelling.",
    };
  return {
    title: "Your campus pulse",
    query: "",
    description:
      "Fresh deals, instant requests and student hustles around Moi.",
  };
}
export function countdown(endsAt: string, now: number) {
  const seconds = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
  return seconds <= 0
    ? "Ended"
    : `${Math.floor(seconds / 3600)}h ${Math.floor(seconds / 60) % 60}m left`;
}
