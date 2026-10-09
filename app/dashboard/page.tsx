'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { AccountGate } from '@/components/AccountGate';
import { Business } from '@/lib/types';

function OwnedBusinesses() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/auth/me', { signal: controller.signal, cache: 'no-store' });
        const account = await response.json();
        if (!response.ok) throw new Error(account.error || 'Could not load your businesses.');
        setBusinesses(account.businesses || []);
        setIsAdmin(account.user?.role === 'ADMIN');
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Connection error. Please reload.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-5 px-4 py-8 md:px-8">
      <div className="rounded-xl bg-white p-6 signboard-border signboard-shadow">
        <h1 className="font-display text-3xl font-bold text-[#243b32]">Your Merchant Hub</h1>
        <p className="mt-2 text-sm text-[#667064]">Choose a business to update its details, manage bookings and view promotion payments.</p>
        {isAdmin && <Link href="/admin" className="mt-3 inline-block text-sm font-bold text-[#335e41]">Open admin console →</Link>}
      </div>
      {loading ? <p role="status">Loading your businesses...</p> : error ? <p role="alert" className="rounded bg-[#fce7e1] p-4 text-[#a7302d]">{error}</p> : businesses.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {businesses.map((business) => (
            <Link key={business.id} href={`/dashboard/${business.slug}`} className="rounded-xl bg-white p-5 signboard-border signboard-shadow hover:bg-[#edf2e5]">
              <h2 className="font-display text-xl font-bold text-[#243b32]">{business.name}</h2>
              <p className="mt-1 text-sm text-[#667064]">{business.landmark}</p>
              <p className="mt-3 text-xs font-bold text-[#335e41]">{business.status} · Manage business →</p>
            </Link>
          ))}
        </div>
      ) : <div className="rounded-xl bg-white p-6 text-sm text-[#667064] signboard-border">No business is linked to this account yet. Use the owner invitation emailed by the admin, or ask them to confirm which email is registered for your business.</div>}
    </main>
  );
}

export default function DashboardIndex() {
  return <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]"><Navbar /><AccountGate requiredRole="BUSINESS"><OwnedBusinesses /></AccountGate><Footer /><BottomNav /></div>;
}
