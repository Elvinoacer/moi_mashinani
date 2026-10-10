'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PasswordField } from '@/components/PasswordField';

function VerificationForm() {
  const params = useSearchParams();
  const token = params.get('token');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const inputClass = 'w-full rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] px-3 py-3 text-sm text-[#243b32]';
  async function verify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setError('');
    if (password !== confirmation) { setError('The passwords do not match.'); return; }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not verify this link. Request a new account link and try again.');
      router.replace(data.user?.role === 'ADMIN' ? '/admin' : data.business?.slug ? `/dashboard/${data.business.slug}` : '/dashboard');
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not verify this link. Request a new account link and try again.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-[#dfe5d8] bg-white p-6 md:p-8 space-y-5">
    <h1 className="font-display text-2xl font-bold text-[#243b32]">Verify your account</h1>
    {token ? <><p className="text-sm text-[#667064]">Set a password to complete account setup and sign in. Use at least 12 characters. If this invitation adds a business to an existing account, enter your existing password instead.</p>
      <form onSubmit={verify} className="space-y-4"><PasswordField label="Password" required autoComplete="new-password" minLength={12} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className={inputClass} /><PasswordField label="Confirm password" required autoComplete="new-password" minLength={12} maxLength={128} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} className={inputClass} />
      {error && <p role="alert" className="rounded-xl bg-[#fce7e1] p-3 text-sm text-[#8f2424]">{error}</p>}
      <button type="submit" disabled={busy} className="w-full rounded-xl bg-[#243b32] py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Verifying…' : 'Verify & open my account'}</button></form></> : <p role="alert" className="rounded-xl bg-[#fce7e1] p-3 text-sm text-[#8f2424]">This link is missing its verification code. Open the complete link from your email or request a new one.</p>}
    <Link href="/login" className="inline-block text-sm font-semibold text-[#335e41] underline">Link expired? Request a new account link</Link>
  </section>;
}
export default function VerifyPage() {
  return <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]"><Navbar /><main className="mx-auto w-full max-w-lg flex-1 px-4 py-10"><Suspense fallback={<p role="status">Loading verification…</p>}><VerificationForm /></Suspense></main><Footer /></div>;
}
