'use client';

import { Suspense, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PasswordField } from '@/components/PasswordField';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [requestLink, setRequestLink] = useState(false);
  const inputClass = 'w-full rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] px-3 py-3 text-sm text-[#243b32]';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch(requestLink ? '/api/auth/request-link' : '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestLink ? { email: email.trim() } : { email: email.trim(), password }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not sign in. Please try again.');
      if (requestLink) { setMessage('If this email has an account, a secure account link will arrive shortly. Check your inbox and spam folder.'); return; }
      const next = params.get('next');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.includes('\\') && !/[\u0000-\u001f]/.test(next) ? next : null;
      router.replace(safeNext || (data.user?.role === 'ADMIN' ? '/admin' : '/dashboard'));
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not sign in. Please try again.'); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-[#dfe5d8] bg-white p-6 md:p-8 space-y-5">
    <div><h1 className="font-display text-2xl font-bold text-[#243b32]">{requestLink ? 'Get an account link' : 'Sign in'}</h1><p className="mt-2 text-sm text-[#667064]">{requestLink ? 'Request a new link if your invitation expired, you need to verify your email, or you forgot your password.' : 'Manage your business profile, customer requests and promotions.'}</p></div>
    <form onSubmit={submit} className="space-y-4"><label className="block"><span className="mb-1.5 block text-xs font-bold text-[#243b32]">Email address</span><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} className={inputClass} /></label>
      {!requestLink && <PasswordField label="Password" required autoComplete="current-password" maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} className={inputClass} />}
      {error && <p role="alert" className="rounded-xl bg-[#fce7e1] p-3 text-sm text-[#8f2424]">{error}</p>}{message && <p role="status" className="rounded-xl bg-[#edf2e5] p-3 text-sm text-[#335e41]">{message}</p>}
      <button disabled={busy} type="submit" className="w-full rounded-xl bg-[#243b32] py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Please wait…' : requestLink ? 'Email account link' : 'Sign in'}</button>
    </form>
    <button type="button" onClick={() => { setRequestLink((value) => !value); setError(''); setMessage(''); }} disabled={busy} className="text-sm font-semibold text-[#335e41] underline">{requestLink ? 'Back to sign in' : 'Verify your email or reset your password'}</button>
    <p className="text-xs text-[#667064]">New business? <Link href="/onboard" className="font-semibold text-[#335e41] underline">Create a free listing</Link></p>
  </section>;
}
export default function LoginPage() {
  return <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]"><Navbar /><main className="mx-auto w-full max-w-lg flex-1 px-4 py-10"><Suspense fallback={<p role="status">Loading sign in…</p>}><LoginForm /></Suspense></main><Footer /></div>;
}
