import { formatKenyanPhone } from "./payments";
export function whatsappUrl(phone: string, message: string) {
  const digits = formatKenyanPhone(phone);
  return /^254[17]\d{8}$/.test(digits)
    ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
    : "";
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
}) {
  return `Hi ${input.businessName}! I found you on Moi Mashinani. I'd like to order/book: ${input.serviceName}${input.price !== undefined ? ` — KES ${input.price.toLocaleString("en-KE")}` : ""}. Preferred time: ${input.day}, ${input.time}. My zone: ${input.zone}. My name: ${input.name}.${input.note ? ` Note: ${input.note}` : ""} Please confirm the price and availability.`;
}
