'use client';
import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Business } from '@/lib/types';

export interface AccountSession {
  user: { id: string; email: string; name: string; role: 'ADMIN' | 'BUSINESS' };
  businesses: Business[];
}
export function AccountGate({ requiredRole, role, slug, children }: {
  requiredRole?: 'ADMIN' | 'BUSINESS'; role?: 'ADMIN' | 'BUSINESS'; slug?: string;
  children: ReactNode | ((account: AccountSession) => ReactNode);
}) {
  const pathname = usePathname();
  const [account, setAccount] = useState<AccountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not check your account.');
      setAccount(data.user ? { user: data.user, businesses: data.businesses || [] } : null);
      setError(''); setLoading(false);
    }).catch((cause) => {
      if (controller.signal.aborted) return;
      setError(cause instanceof Error ? cause.message : 'Could not check your account.'); setLoading(false);
    });
    return () => controller.abort();
  }, [attempt]);
  const panel = 'mx-auto my-10 max-w-lg rounded-2xl border border-[#dfe5d8] bg-white p-6 text-center space-y-4 text-[#243b32]';
  const loginNext = `${pathname}${typeof window === 'undefined' ? '' : window.location.search}`;
  const button = 'inline-block rounded-xl bg-[#243b32] px-5 py-3 text-sm font-bold text-white';
  if (loading) return <div className={panel} role="status">Checking your account…</div>;
  if (error) return <div className={panel}><p role="alert">{error}</p><button type="button" onClick={() => { setLoading(true); setAttempt((value) => value + 1); }} className={button}>Try again</button></div>;
  if (!account) return <div className={panel}><h1 className="font-display text-2xl font-bold">Sign in to your account</h1><p className="text-sm text-[#667064]">Business owners can use the verification link in their email to set up their account.</p><Link href={`/login?next=${encodeURIComponent(loginNext)}`} className={button}>Sign in</Link></div>;
  const neededRole = requiredRole || role;
  const allowed = (!neededRole || account.user.role === 'ADMIN' || account.user.role === neededRole) && (!slug || account.user.role === 'ADMIN' || account.businesses.some((business) => business.slug === slug));
  if (!allowed) return <div className={panel}><h1 className="font-display text-2xl font-bold">Account access required</h1><p className="text-sm text-[#667064]">{neededRole === 'ADMIN' ? 'This area is available to the main administrator.' : 'This business is managed by a different account.'}</p><Link href="/dashboard" className={button}>Go to your businesses</Link><Link href={`/login?next=${encodeURIComponent(loginNext)}`} className="block text-sm font-semibold underline">Use another account</Link></div>;
  return typeof children === 'function' ? children(account) : children;
}
