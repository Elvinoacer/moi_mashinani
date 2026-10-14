"use client";

import { useState } from "react";
import { Business } from "@/lib/types";
import { trackBusinessEvent } from "@/lib/track-business-event";
import { WhatsAppIcon } from "@/components/icons";
import { ZONES } from "@/lib/constants";
import { whatsappUrl, orderMessage } from "@/lib/whatsapp";
import { ModalFrame } from "@/components/ModalFrame";

const fieldClass =
  "w-full rounded border border-[#dfe5d8] bg-[#e9eedf] px-3 py-2 text-sm text-[#243b32]";

function todayInKenya() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Nairobi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export type BookingBusiness = Pick<
  Business,
  | "id"
  | "name"
  | "services"
  | "whatsapp"
  | "phone"
  | "status"
  | "isTemporarilyClosed"
>;

export function BookingModal({
  business,
  onClose,
  initialService,
}: {
  business: BookingBusiness;
  onClose: () => void;
  initialService?: string;
}) {
  const [selectedService, setSelectedService] = useState(
    initialService ||
      business.services.find((service) => service.inStock !== false)?.name ||
      "General inquiry",
  );
  const [selectedDay, setSelectedDay] = useState(todayInKenya);
  const [selectedTime, setSelectedTime] = useState(
    "Afternoon (2:00 - 4:00 PM)",
  );
  const [studentName, setStudentName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [zone, setZone] = useState("all");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSendBooking(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");
    setIsSubmitting(true);
    if (
      !/^254[17]\d{8}$/.test(
        contactPhone.replace(/\D/g, "").replace(/^0/, "254"),
      )
    ) {
      setError("Use a Kenyan mobile number: 07…, 01… or +254…");
      setIsSubmitting(false);
      return;
    }
    const target = whatsappUrl(business.whatsapp || business.phone, message);
    if (!target) {
      setError("This seller has no valid WhatsApp contact.");
      setIsSubmitting(false);
      return;
    }
    // Start the handoff in the original user gesture. Analytics never blocks the chat.
    window.open(target, "_blank", "noopener,noreferrer");
    trackBusinessEvent(business.id, "whatsapp");
    setSubmitted(true);
    void fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        businessId: business.id,
        serviceName: selectedService,
        day: selectedDay,
        time: selectedTime,
        studentName: studentName.trim(),
        contactPhone: contactPhone.trim(),
        note: `Zone: ${zone}. ${note.trim()}`,
      }),
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok)
          throw new Error(data.error || "Could not save the inquiry.");
      })
      .catch(() =>
        setError(
          "Your chat is ready. We could not save a dashboard copy; use the WhatsApp link below.",
        ),
      )
      .finally(() => setIsSubmitting(false));
  }
  const phoneDigits = (business.whatsapp || business.phone || "")
    .replace(/\D/g, "")
    .replace(/^0/, "254");
  const item = business.services.find((s) => s.name === selectedService);
  const message = orderMessage({
    businessName: business.name,
    serviceName: selectedService,
    price: item?.priceFrom,
    day: selectedDay,
    time: selectedTime,
    zone: ZONES.find((z) => z.slug === zone)?.name || zone,
    name: studentName.trim(),
    note: note.trim(),
  });

  return (
    <ModalFrame
      title={`Order / inquire with ${business.name}`}
      onClose={onClose}
    >
      {submitted ? (
        <div className="space-y-4 p-6 text-center">
          {error && (
            <p role="status" className="text-sm">
              {error}
            </p>
          )}
          <h3
            aria-live="polite"
            className="font-display text-xl font-bold text-[#243b32]"
          >
            Your WhatsApp inquiry is ready
          </h3>
          <p className="text-sm text-[#667064]">
            WhatsApp opens with your order and preferred time. Tap Send in
            WhatsApp, then wait for the seller to confirm. If the chat did not
            open, use the button below.
          </p>
          {phoneDigits && (
            <a
              onClick={() => trackBusinessEvent(business.id, "whatsapp")}
              href={`https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-[#243b32]"
            >
              <WhatsAppIcon className="h-5 w-5" /> Continue on WhatsApp
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="block w-full text-sm font-bold text-[#667064]"
          >
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={handleSendBooking}
          aria-busy={isSubmitting}
          className="space-y-4 p-4 md:p-6"
        >
          <p className="text-sm text-[#667064]">
            No account needed. Choose your preferred time; the business will
            confirm availability with you.
          </p>
          {error && (
            <p
              role="alert"
              className="rounded bg-[#fce7e1] p-3 text-sm text-[#a7302d]"
            >
              {error}
            </p>
          )}
          <label className="block text-xs font-bold text-[#243b32]">
            Service
            <select
              aria-label="Service"
              value={selectedService}
              onChange={(event) => setSelectedService(event.target.value)}
              className={`${fieldClass} mt-1`}
            >
              {business.services
                .filter((service) => service.inStock !== false)
                .map((service) => (
                  <option key={service.id} value={service.name}>
                    {service.name}
                    {service.priceFrom !== undefined
                      ? ` (from KSh ${service.priceFrom.toLocaleString()})`
                      : ""}
                  </option>
                ))}
              <option value="General inquiry">
                General inquiry / price check
              </option>
            </select>
          </label>
          <label className="block text-xs font-bold text-[#243b32]">
            Preferred date (Kenya time)
            <input
              type="date"
              required
              min={todayInKenya()}
              value={selectedDay}
              onChange={(event) => setSelectedDay(event.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <label className="block text-xs font-bold text-[#243b32]">
            Preferred time
            <select
              value={selectedTime}
              onChange={(event) => setSelectedTime(event.target.value)}
              className={`${fieldClass} mt-1`}
            >
              {[
                "Morning (9:00 - 11:00 AM)",
                "Afternoon (2:00 - 4:00 PM)",
                "Evening (5:00 - 7:30 PM)",
              ].map((time) => (
                <option key={time}>{time}</option>
              ))}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-bold text-[#243b32]">
              Your name
              <input
                required
                maxLength={100}
                value={studentName}
                onChange={(event) => setStudentName(event.target.value)}
                autoComplete="name"
                className={`${fieldClass} mt-1`}
              />
            </label>
            <label className="block text-xs font-bold text-[#243b32]">
              Your phone / WhatsApp
              <input
                required
                type="tel"
                maxLength={20}
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                autoComplete="tel"
                placeholder="0712 345 678"
                className={`${fieldClass} mt-1`}
              />
            </label>
          </div>
          <label className="block text-xs font-bold text-[#243b32]">
            Delivery / campus zone
            <select
              value={zone}
              onChange={(event) => setZone(event.target.value)}
              className={`${fieldClass} mt-1`}
            >
              {ZONES.map((z) => (
                <option key={z.slug} value={z.slug}>
                  {z.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-[#243b32]">
            Extra note (optional)
            <textarea
              maxLength={1000}
              rows={2}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              className={`${fieldClass} mt-1`}
            />
          </label>
          <p className="text-xs text-[#667064]">
            Your name, phone and note are shared with this business to respond
            to your request.
          </p>
          <button
            type="submit"
            disabled={
              isSubmitting ||
              business.isTemporarilyClosed ||
              business.status !== "ACTIVE"
            }
            className="w-full rounded-full bg-[#335e41] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {isSubmitting
              ? "Saving request..."
              : business.isTemporarilyClosed
                ? "Business temporarily closed"
                : "Send order / book via WhatsApp"}
          </button>
        </form>
      )}
    </ModalFrame>
  );
}
