"use client";
import { useState } from "react";
import type { Business } from "@/lib/types";
import { Button } from "./ui/Button";
export function TrustShare({ business }: { business: Business }) {
  const [message, setMessage] = useState("");
  const verified = business.verificationLevel === "L2";
  async function share() {
    const url = `${window.location.origin}/b/${business.slug}`;
    const text = `${business.name} · ${verified ? (business.sellerType === "COMRADE" ? "Verified comrade seller" : "Physically verified campus shop") : "Campus business"} on Moi Mashinani. Check location, prices and verification before paying. ${url}`;
    try {
      if (navigator.share)
        await navigator.share({ title: business.name, text, url });
      else {
        await navigator.clipboard.writeText(text);
        setMessage(
          "Trust link copied. Paste it into your WhatsApp bio or Status.",
        );
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError"))
        setMessage(
          "Sharing unavailable. Copy your profile address from the browser.",
        );
    }
  }
  return (
    <div className="space-y-2">
      <Button variant="secondary" onClick={() => void share()}>
        {verified ? "Share verified trust link" : "Share shop & prices"}
      </Button>
      <p className="text-xs">
        Choose WhatsApp in your phone’s share menu, then select Status or a
        chat.
      </p>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
