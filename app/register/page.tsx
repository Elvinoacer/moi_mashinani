"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { PasswordField } from "@/components/PasswordField";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputClass = "ui-input mt-1.5";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError("");
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to create account.");
      setMessage(data.message);
      setPassword("");
      setConfirm("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Connection error.");
    } finally { setBusy(false); }
  }
  return (
    <div className="interior-page flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-lg flex-1 px-3 py-5 sm:px-4 sm:py-10">
        <section className="ui-card space-y-5 !p-5 sm:!p-8">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-[#335e41]">Free account</p>
            <h1 className="text-2xl font-bold text-[#183e35]">Create your account</h1>
            <p className="text-sm leading-relaxed text-[#667064]">Sign up using email and a password. We&apos;ll send a verification link by email. No SMS needed.</p>
          </div>
          {message ? (
            <div className="space-y-4">
              <p role="status" className="rounded-xl bg-[#edf2e5] p-4 text-sm text-[#183e35]">{message}</p>
              <Link href="/login" className="ui-button ui-button-primary w-full">Go to sign in</Link>
              <p className="text-sm text-[#667064]">Didn&apos;t receive an email? Request another account link on the sign-in page.</p>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <label className="block text-sm font-semibold">Your name
                <input className={inputClass} type="text" autoComplete="name" maxLength={120} required value={name} onChange={e=>setName(e.target.value)} disabled={busy} />
              </label>
              <label className="block text-sm font-semibold">Email address
                <input className={inputClass} type="email" autoComplete="email" maxLength={254} required value={email} onChange={e=>setEmail(e.target.value)} disabled={busy} />
              </label>
              <PasswordField label="Password (12+ characters)" className={inputClass} minLength={12} maxLength={128} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} disabled={busy} />
              <PasswordField label="Confirm password" className={inputClass} minLength={12} maxLength={128} required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} disabled={busy} />
              {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
              <button type="submit" disabled={busy} className="ui-button ui-button-primary w-full">{busy ? "Creating account…" : "Create account"}</button>
            </form>
          )}
          <p className="text-sm text-[#667064]">Already have an account or an owner invitation? <Link href="/login" className="font-semibold text-[#335e41] underline">Sign in</Link></p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
