"use client";
import { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
export function PhoneSignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [phone, setPhone] = useState(""),
    [name, setName] = useState(""),
    [code, setCode] = useState("");
  const [challenge, setChallenge] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setBusy(true);
        setError("");
        try {
          const response = await fetch(
            `/api/auth/phone/${challenge ? "verify" : "request"}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(
                challenge ? { challengeId: challenge, code } : { phone, name },
              ),
            },
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Could not sign in.");
          if (challenge) onSignedIn();
          else setChallenge(data.challengeId);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Connection error.",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2 className="text-xl font-bold">Sign in with your phone</h2>
      <p className="text-sm">
        Get a six-digit SMS code. No email or password needed.
      </p>
      {challenge ? (
        <label className="block">
          SMS code
          <Input
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
        </label>
      ) : (
        <>
          <label className="block">
            Your phone
            <Input
              required
              type="tel"
              autoComplete="tel"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>
          <label className="block">
            Your name (for a new account)
            <Input
              maxLength={120}
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        </>
      )}
      {error && (
        <p role="alert" className="text-red-800">
          {error}
        </p>
      )}
      <Button type="submit" disabled={busy}>
        {busy
          ? "Please wait…"
          : challenge
            ? "Verify & sign in"
            : "Send SMS code"}
      </Button>
      {challenge && (
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setChallenge("");
            setCode("");
            setError("");
          }}
        >
          Use another number / request new code
        </Button>
      )}
    </form>
  );
}
