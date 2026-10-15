"use client";
import { useState } from "react";
import { Button } from "./ui/Button";
export function MerchantActionButton({
  token,
  label,
}: {
  token: string;
  label: string;
}) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  return (
    <div className="space-y-4">
      <Button
        disabled={busy || Boolean(message)}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const response = await fetch("/api/merchant-actions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ token }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            setMessage(data.message);
            if (data.url) {
              setUrl(data.url);
              window.location.assign(data.url);
            }
          } catch (cause) {
            setError(
              cause instanceof Error ? cause.message : "Connection error.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Please wait…" : label}
      </Button>
      {message && <p role="status">{message}</p>}
      {url && (
        <a className="ui-button ui-button-primary" href={url} rel="noreferrer">
          Continue on WhatsApp
        </a>
      )}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
