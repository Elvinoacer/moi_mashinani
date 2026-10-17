import { formatKenyanPhone } from "./payments";
export function whatsappUrl(phone: string, message: string) {
  const digits = formatKenyanPhone(phone);
  return /^254[17]\d{8}$/.test(digits)
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : "";
}
export function leadReferenceCode(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return `#MM-${hash.toString(36).toUpperCase().padStart(4, "0").slice(-4)}`;
}
export function orderMessage(input: {
  businessName: string;
  serviceName: string;
  price?: number;
  day: string;
  time: string;
  zone: string;
  name: string;
  note?: string;
  refCode?: string;
}) {
  const ref =
    input.refCode ||
    leadReferenceCode(
      `${input.businessName}:${input.serviceName}:${input.day}:${input.name}`,
    );
  return `Hi ${input.businessName}! I found you on Moi Mashinani [Ref: ${ref}]. I'd like to order/book: ${input.serviceName}${input.price !== undefined ? ` — KES ${input.price.toLocaleString("en-KE")}` : ""}. Preferred time: ${input.day}, ${input.time}. My zone: ${input.zone}. My name: ${input.name}.${input.note ? ` Note: ${input.note}` : ""} Please confirm the price and availability.`;
}
