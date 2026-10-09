'use client';
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { AccountGate } from '@/components/AccountGate';
import { hasPro, nextProEnd, PRO_PRICE_KES } from '@/lib/catalog-plan';
import type { Business, PaymentRecord } from '@/lib/types';
import { useNow } from '@/lib/useNow';

const panel = 'space-y-5 rounded-2xl border border-[#dfe5d8] bg-white p-6';
const button = 'rounded-full bg-[#243b32] px-5 py-3 text-sm font-bold text-white disabled:opacity-50';
async function read<T>(response:Response):Promise<T> {const data=await response.json();if(!response.ok)throw new Error(data.error || 'Please try again.');return data;}

function ProCheckout({slug}:{slug:string}) {
  const [business,setBusiness]=useState<Business|null>(null);
  const [payment,setPayment]=useState<PaymentRecord|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const now=useNow();
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){try{
      const business=await fetch(`/api/businesses/${encodeURIComponent(slug)}`,{cache:'no-store',signal:controller.signal}).then(read<Business>);
      const records=await fetch(`/api/payments?businessId=${encodeURIComponent(business.id)}`,{cache:'no-store',signal:controller.signal}).then(read<PaymentRecord[]>);
      const returnedId=new URLSearchParams(window.location.search).get('payment');
      const pending=returnedId ? records.find(p=>p.id===returnedId) : records.find(p=>['CREATED','PENDING','PROCESSING'].includes(p.state));
      if(returnedId && !pending)throw new Error('This payment does not belong to your business.');
      if(controller.signal.aborted)return;
      setBusiness(business);setPayment(pending || null);
      if(returnedId && pending?.planId==='PRO' && pending.state!=='COMPLETE'){
        const verified=await fetch(`/api/payments/${encodeURIComponent(pending.id)}/verify`,{method:'POST',signal:controller.signal}).then(read<PaymentRecord>);
        if(!controller.signal.aborted)setPayment(verified);
      }
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:'Could not load checkout.');}finally{if(!controller.signal.aborted)setLoading(false);}}
    void load();return()=>controller.abort();
  },[slug]);
  const pendingId=payment?.planId==='PRO' && ['CREATED','PENDING','PROCESSING'].includes(payment.state)?payment.id:null;
  useEffect(()=>{
    if(!pendingId)return;
    const controller=new AbortController();let running=false;
    const timer=setInterval(async()=>{if(running)return;running=true;try{const result=await fetch(`/api/payments/${pendingId}`,{cache:'no-store',signal:controller.signal}).then(read<PaymentRecord>);if(!controller.signal.aborted)setPayment(result);}catch{/* Explicit verification remains available. */}finally{running=false;}},5000);
    return()=>{controller.abort();clearInterval(timer);};
  },[pendingId]);
  const verifiedPaymentId = payment?.state === 'COMPLETE' ? payment.id : null;
  useEffect(() => {
    if (!verifiedPaymentId) return;
    const controller = new AbortController();
    fetch(`/api/businesses/${encodeURIComponent(slug)}`,{cache:'no-store',signal:controller.signal}).then(read<Business>).then(data => {if(!controller.signal.aborted)setBusiness(data);}).catch(() => {});
    return () => controller.abort();
  },[verifiedPaymentId,slug]);
  async function checkout(){if(!business)return;setBusy(true);setError('');try{
    const response=payment ? await fetch(`/api/payments/${payment.id}/retry`,{method:'POST'}) : await fetch('/api/payments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId:business.id,planId:'PRO',weeks:1,phone:business.phone,method:'INTASEND_CHECKOUT'})});
    const data=await response.json();if(data.payment)setPayment(data.payment);if(!response.ok || !data.checkoutUrl)throw new Error(data.error || 'Checkout is unavailable.');window.location.assign(data.checkoutUrl);
  }catch(cause){setError(cause instanceof Error?cause.message:'Could not open checkout.');setBusy(false);}}
  async function verify(){if(!payment)return;setBusy(true);setError('');try{setPayment(await fetch(`/api/payments/${payment.id}/verify`,{method:'POST'}).then(read<PaymentRecord>));}catch(cause){setError(cause instanceof Error?cause.message:'Could not verify payment.');}finally{setBusy(false);}}
  if(loading)return <p role="status">Loading your Pro plan…</p>;
  if(!business)return <div className={panel}><p role="alert">{error || 'Business not found.'}</p><Link href="/dashboard">Back to dashboard</Link></div>;
  const pro=hasPro(business,now);
  const end=nextProEnd(business.proEndsAt,new Date(now)).toLocaleString('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'});
  return <>
    <Link href={`/dashboard/${business.slug}`} className="text-sm font-semibold text-[#335e41]">← Back to dashboard</Link>
    <section className={panel}><p className="text-xs font-bold uppercase tracking-wide text-[#335e41]">MoiMashinani Pro</p><h1 className="text-3xl font-bold">Grow your catalogue</h1><p className="text-sm text-[#667064]">{business.name} · More room for everything you sell.</p><p className="text-4xl font-bold">KES {PRO_PRICE_KES}<span className="text-sm font-normal text-[#667064]"> / calendar month</span></p>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Free and Pro catalogue plans</caption><thead><tr className="border-b border-[#dfe5d8]"><th className="py-3">Included</th><th>Free</th><th>Pro</th></tr></thead><tbody>{[['Products / services','5 public','Unlimited'],['Total image storage','25 MB','Unlimited'],['Shop gallery','8 photos','8 photos'],['Image upload size','5 MB each','5 MB each'],['Automatic image compression','Included','Included']].map(row=><tr key={row[0]} className="border-b border-[#edf2e5]"><th className="py-3 pr-3 font-medium">{row[0]}</th><td className="pr-3">{row[1]}</td><td className="font-semibold">{row[2]}</td></tr>)}</tbody></table></div>
      <p className="text-xs leading-6 text-[#667064]">Each stored image is compressed to at most 1 MB. Pro covers catalogue capacity; Recommended and Featured promotions are purchased separately. We never renew or charge automatically.</p>
    </section>
    {error && <p role="alert" className="rounded-xl bg-[#fce7e1] p-4 text-sm text-[#a7302d]">{error}</p>}
    {payment && payment.planId!=='PRO' ? <section className={panel}><h2 className="font-bold">Finish your pending payment first</h2><p className="text-sm">You already have a promotion checkout in progress. Complete or verify it before buying Pro.</p><Link href={`/promote/${business.slug}?payment=${payment.id}`} className={`${button} inline-block`}>View pending checkout</Link></section> : payment?.state==='COMPLETE' ? <section className={panel}><h2 className="text-xl font-bold">Your Pro payment is verified</h2><p className="text-sm">Unlimited products and image storage are active for the purchased month. Your dashboard shows the confirmed end date.</p><p className="text-xs">Receipt: {payment.receiptNumber || payment.id}</p><Link href={`/dashboard/${business.slug}`} className={`${button} inline-block`}>Open your dashboard</Link><button type="button" onClick={()=>setPayment(null)} className="block text-sm font-semibold text-[#335e41]">Purchase another month</button></section> : <section className={panel}>
      <h2 className="text-xl font-bold">{payment ? 'Complete your checkout' : pro ? 'Renew for another month' : 'Start one month of Pro'}</h2>
      {payment ? <><p className="text-sm">Payment status: {payment.state}. {payment.failedReason || 'Pro activates only after payment is verified.'}</p><div className="flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={checkout} className={button}>Open IntaSend checkout</button><button type="button" disabled={busy} onClick={verify} className="rounded-full border border-[#dfe5d8] px-5 py-3 text-sm font-bold">Check payment status</button></div></> : <><p className="text-sm">{pro ? 'Your remaining time is preserved. ' : ''}Estimated end after payment: <strong>{end} EAT</strong>.</p><button type="button" disabled={busy || business.status!=='ACTIVE'} onClick={checkout} className={button}>{busy?'Opening checkout…':`Continue to checkout · KES ${PRO_PRICE_KES}`}</button>{business.status!=='ACTIVE' && <p className="text-sm text-[#a7302d]">Your listing needs approval before buying Pro.</p>}</>}
      <p className="text-xs leading-6 text-[#667064]">We’ll email you 7, 3 and 1 day before expiry. To continue, return here and pay through a new checkout. After expiry, the first five products remain public, additional products stay saved, and new uploads follow the 25 MB Free allowance. We don’t delete your existing content automatically.</p>
    </section>}
  </>;
}
export default function ProCheckoutPage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=use(params);
  return <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]"><Navbar /><main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-8"><AccountGate requiredRole="BUSINESS" slug={slug}><ProCheckout slug={slug}/></AccountGate></main><Footer /><BottomNav /></div>;
}
