'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Business } from '@/lib/types';
import { FREE_STORAGE_BYTES, formatStorage, hasPro, PRO_PRICE_KES } from '@/lib/catalog-plan';
import { useNow } from '@/lib/useNow';

export type CatalogUsage = {usedBytes:number;legacyBytes:number;storageLimit:number|null;productCount:number;plan:'FREE'|'PRO';proEndsAt:string|null};

export function CatalogPlanPanel({business,refreshKey = 0,onUsage}: {business:Business;refreshKey?:number;onUsage?:(usage:CatalogUsage)=>void}) {
  const [usage,setUsage] = useState<CatalogUsage|null>(null);
  const [error,setError] = useState('');
  const now = useNow();
  const pro = hasPro(business,now);
  const days = business.proEndsAt ? Math.ceil((Date.parse(business.proEndsAt)-now)/864e5) : null;
  const expiresSoon = pro && days !== null && days <= 7;
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/businesses/${encodeURIComponent(business.slug)}/plan`,{cache:'no-store',signal:controller.signal}).then(async response => {
      const data = await response.json();if (!response.ok) throw new Error(data.error || 'Could not load storage usage.');
      if (!controller.signal.aborted) {setUsage(data);setError('');onUsage?.(data);}
    }).catch(cause => {if (!controller.signal.aborted) setError(cause.message || 'Could not load storage usage.');});
    return () => controller.abort();
  },[business.slug,business.updatedAt,refreshKey,onUsage]);
  const date = business.proEndsAt ? new Date(business.proEndsAt).toLocaleString('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'}) : '';
  const hidden = !pro ? Math.max(0,business.services.length-5) : 0;
  return <section aria-label="Catalogue plan and storage" className={`space-y-4 rounded-2xl border p-5 ${expiresSoon ? 'border-[#c69c36] bg-[#fff8df]' : 'border-[#dfe5d8] bg-white'}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><span className="rounded-full bg-[#edf2e5] px-3 py-1 text-xs font-bold text-[#335e41]">{pro ? 'Pro catalogue' : 'Free catalogue'}</span><h2 className="mt-3 text-lg font-bold text-[#243b32]">{expiresSoon ? `Pro ends in ${days} ${days === 1 ? 'day' : 'days'}` : pro ? 'Room for your whole catalogue' : business.proEndsAt ? 'Your Pro plan has ended' : 'Your catalogue at a glance'}</h2></div>
      <Link href={`/pro/${business.slug}`} className="rounded-full bg-[#243b32] px-4 py-2.5 text-sm font-bold text-white">{pro || business.proEndsAt ? 'Renew Pro' : 'Upgrade to Pro'} · KES {PRO_PRICE_KES}/month</Link>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs text-[#667064]">Products & services</p><p className="mt-1 text-xl font-bold">{business.services.length}{pro ? ' · Unlimited' : ' / 5 public'}</p>{hidden > 0 && <p className="mt-1 text-xs text-[#667064]">{hidden} saved {hidden === 1 ? 'item is' : 'items are'} hidden until renewal. You can choose which five appear.</p>}</div>
      <div><p className="text-xs text-[#667064]">Image storage</p><p className="mt-1 text-xl font-bold">{usage ? formatStorage(usage.usedBytes) : 'Loading…'} {pro ? '· Unlimited' : '/ 25 MB'}</p>{usage && !pro && <progress className="mt-2 h-2 w-full accent-[#335e41]" aria-label="Image storage used" value={Math.min(usage.usedBytes,FREE_STORAGE_BYTES)} max={FREE_STORAGE_BYTES} />}{usage && usage.legacyBytes > 0 && <p className="mt-1 text-xs text-[#667064]">Older hosted photos reserve 5 MB each until replaced with a new compressed upload.</p>}</div>
    </div>
    {error && <p role="alert" className="text-sm text-[#a7302d]">{error}</p>}
    {usage && !pro && usage.usedBytes >= FREE_STORAGE_BYTES && <p className="rounded-lg bg-[#fff8df] p-3 text-sm">Your storage allocation is full. Existing photos remain saved. Remove photos or renew Pro before uploading more.</p>}
    <p className="text-xs leading-5 text-[#667064]">{pro ? `Active until ${date} (EAT). ` : business.proEndsAt ? `Ended ${date} (EAT). ` : ''}Manual renewal through checkout. We never charge automatically. Email reminders arrive 7, 3 and 1 day before expiry. Images can be up to 5 MB before compression; each stored image uses at most 1 MB. Both plans include an eight-photo shop gallery.</p>
  </section>;
}
