'use client';

import { CategorySelect } from '@/components/CategorySelect';

import Image from 'next/image';

import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { AccountGate } from '@/components/AccountGate';
import { Business, BusinessHours, BookingIntent, PaymentRecord, ServiceItem } from '@/lib/types';
import { ZONES } from '@/lib/constants';
import { useNow } from '@/lib/useNow';
import { CatalogPlanPanel, type CatalogUsage } from '@/components/CatalogPlanPanel';
import { hasPro, FREE_STORAGE_BYTES, photoReferences } from '@/lib/catalog-plan';
import { uploadBusinessPhotos } from '@/lib/photo-upload';
import { Eye, Rocket, Trash2, RefreshCw } from '@/components/icons';

const detailLabels = {name:'Business name',tagline:'Tagline',phone:'Phone number',whatsapp:'WhatsApp number',landmark:'Landmark',address:'Address',studentDiscount:'Student discount (optional)'};
const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const tabs = ['overview', 'bookings', 'services', 'details', 'photos', 'hours', 'billing', 'share'] as const;
type Tab = typeof tabs[number];
type Booking = BookingIntent & { status: 'NEW' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; contactPhone?: string };
type EditableService = ServiceItem & { photo?: string };
const inputClass = 'mt-1 w-full rounded border border-[#dfe5d8] bg-[#e9eedf] px-3 py-2 text-sm text-[#243b32]';
const buttonClass = 'rounded-full bg-[#335e41] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50';
const panelClass = 'space-y-4 rounded-xl bg-white p-5 signboard-border signboard-shadow md:p-6';

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'The request failed. Please try again.');
  return data as T;
}

function BusinessDashboard({ slug }: { slug: string }) {
  const router = useRouter();
  const now = useNow();
  const [business, setBusiness] = useState<Business | null>(null);
  const [ownedBusinesses, setOwnedBusinesses] = useState<Business[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingError, setBillingError] = useState('');
  const [bookingError, setBookingError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [draft, setDraft] = useState({ name: '', tagline: '', description: '', phone: '', whatsapp: '', landmark: '', address: '', zone: '', primaryCategory: '', studentDiscount: '', latitude:'', longitude:'' });
  const [hours, setHours] = useState<BusinessHours>({});
  const [serviceId, setServiceId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceNote, setServiceNote] = useState('');
  const [servicePhoto, setServicePhoto] = useState('');
  const [storageRefresh, setStorageRefresh] = useState(0);
  const [storageUsage, setStorageUsage] = useState<CatalogUsage | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const [data, account] = await Promise.all([
          fetch(`/api/businesses/${encodeURIComponent(slug)}`, { signal: controller.signal, cache: 'no-store' }).then(readResponse<Business>),
          fetch('/api/auth/me', { signal: controller.signal, cache: 'no-store' }).then(readResponse<{ businesses: Business[] }>),
        ]);
        if (controller.signal.aborted) return;
        setBusiness(data);
        setOwnedBusinesses(account.businesses || []);
        setDraft({ name: data.name, tagline: data.tagline || '', description: data.description || '', phone: data.phone,
          whatsapp: data.whatsapp, landmark: data.landmark, address: data.address || '', zone: data.zone,
          primaryCategory: data.primaryCategory, studentDiscount: data.studentDiscount || '', latitude:data.mapPin ? String(data.mapPin.lat):'', longitude:data.mapPin ? String(data.mapPin.lng):'' });
        setHours(Object.fromEntries(days.map((day) => [day, data.hours[day] || { open: '08:00', close: '18:00', closed: true }])));
        const query = `?businessId=${encodeURIComponent(data.id)}`;
        await Promise.all([
          fetch(`/api/payments${query}`, { signal: controller.signal, cache: 'no-store' }).then(readResponse<PaymentRecord[]>).then(setPayments)
            .catch((failure) => { if (!controller.signal.aborted) setBillingError(failure.message || 'Could not load payment history.'); }),
          fetch(`/api/bookings${query}`, { signal: controller.signal, cache: 'no-store' }).then(readResponse<Booking[]>).then(setBookings)
            .catch((failure) => { if (!controller.signal.aborted) setBookingError(failure.message || 'Could not load bookings.'); }),
        ]);
      } catch (failure) {
        if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : 'Could not load this business.');
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    return () => controller.abort();
  }, [slug]);

  async function patchBusiness(fields: Partial<Business>) {
    const updated = await fetch(`/api/businesses/${encodeURIComponent(slug)}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
    }).then(readResponse<Business>);
    setBusiness(updated);
    return updated;
  }

  async function runAction(key: string, action: () => Promise<unknown>, message = 'Changes saved.') {
    if (busy) return;
    setBusy(key); setError(''); setNotice('');
    try { await action(); setNotice(message); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Connection error. Please try again.'); }
    finally { setBusy(''); }
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files?.length || !business) return [];
    const photos = await uploadBusinessPhotos(Array.from(files), business.id);
    setStorageRefresh(value => value + 1);
    return photos;
  }

  function discardDraftPhoto(photo: string) {
    if (photo && business && !photoReferences(business).includes(photo)) {
      void fetch(`/api/uploads?url=${encodeURIComponent(photo)}`,{method:'DELETE'}).then(() => setStorageRefresh(value => value + 1)).catch(() => {});
    }
  }
  function resetService() { discardDraftPhoto(servicePhoto);setServiceId(''); setServiceName(''); setServicePrice(''); setServiceNote(''); setServicePhoto(''); }
  async function mutateProduct(method: 'POST' | 'PATCH' | 'DELETE', item: Partial<ServiceItem> & {publishFirst?:boolean}) {
    const updated = await fetch(`/api/businesses/${encodeURIComponent(slug)}/products`,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(item)}).then(readResponse<Business>);
    setBusiness(updated);setStorageRefresh(value => value + 1);
    return updated;
  }

  async function saveService(event: React.FormEvent) {
    event.preventDefault();
    if (!business || !serviceName.trim()) return;
    if (!serviceId && !hasPro(business,now) && business.services.length >= 5) {setError('Free includes 5 products or services. Upgrade or renew Pro to add more.');return;}
    const price = servicePrice === '' ? undefined : Number(servicePrice);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) { setError('Enter a valid non-negative price.'); return; }
    const existing = business.services.find((item) => item.id === serviceId);
    const service: EditableService = { ...existing, id: serviceId || crypto.randomUUID(), name: serviceName.trim(), priceFrom: price,
      note: serviceNote.trim() || undefined, photo: servicePhoto || undefined };
    await runAction('service', async () => {
      await mutateProduct(serviceId ? 'PATCH' : 'POST', service);
      setServiceId('');setServiceName('');setServicePrice('');setServiceNote('');setServicePhoto('');
    });
  }

  async function refreshCollection(kind: 'bookings' | 'payments') {
    if (!business) return;
    await runAction(kind, async () => {
      const response = await fetch(`/api/${kind}?businessId=${encodeURIComponent(business.id)}`, { cache: 'no-store' });
      if (kind === 'bookings') { setBookings(await readResponse<Booking[]>(response)); setBookingError(''); }
      else { setPayments(await readResponse<PaymentRecord[]>(response)); setBillingError(''); }
    }, `${kind === 'bookings' ? 'Bookings' : 'Payment history'} refreshed.`);
  }

  if (loading) return <main className="mx-auto w-full max-w-5xl flex-1 p-8 text-center"><p role="status">Loading your merchant hub...</p></main>;
  if (!business) return <main className="mx-auto w-full max-w-xl flex-1 space-y-4 p-8"><h1 className="font-display text-2xl font-bold">Could not open this business</h1><p role="alert" className="text-[#a7302d]">{error || 'Business not found.'}</p><Link href="/dashboard" className="font-bold text-[#335e41]">Return to your businesses</Link></main>;

  const isAvailable = !business.isTemporarilyClosed && Boolean(business.availableNowUntil && new Date(business.availableNowUntil).getTime() > now);
  const tierActive = business.activeTier !== 'NONE' && Boolean(business.tierEndsAt && new Date(business.tierEndsAt).getTime() > now);
  const pro = hasPro(business,now);
  const canAddProduct = pro || business.services.length < 5;
  const storageFull = !pro && Boolean(storageUsage && storageUsage.usedBytes >= FREE_STORAGE_BYTES);
  const switcherBusinesses = ownedBusinesses.some((item) => item.id === business.id) ? ownedBusinesses : [business, ...ownedBusinesses];

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 py-6 md:px-8">
      <div className={`${panelClass} flex flex-wrap items-center justify-between gap-4`}>
        <div><h1 className="font-display text-2xl font-bold text-[#243b32]">{business.name}</h1><p className="mt-1 text-xs text-[#667064]">{business.status} listing · {business.landmark}</p>
          {switcherBusinesses.length > 1 && <label className="mt-2 block text-xs font-bold text-[#243b32]">Your businesses<select aria-label="Switch business" value={business.slug} onChange={(event) => router.push(`/dashboard/${event.target.value}`)} className={inputClass}>{switcherBusinesses.map((item) => <option key={item.id} value={item.slug}>{item.name}</option>)}</select></label>}
        </div>
        <div className="flex flex-wrap gap-2"><Link href={`/b/${business.slug}`} target="_blank" className="inline-flex items-center gap-2 rounded-full border border-[#dfe5d8] px-4 py-2 text-sm font-bold"><Eye className="h-4 w-4" /> View profile</Link><Link href={`/promote/${business.slug}`} className="inline-flex items-center gap-2 rounded-full bg-[#d9f279] px-4 py-2 text-sm font-bold"><Rocket className="h-4 w-4" /> Promote</Link></div>
      </div>
      <CatalogPlanPanel business={business} refreshKey={storageRefresh} onUsage={setStorageUsage} />
      {business.status !== 'ACTIVE' && <p className="rounded bg-[#eff4da] p-4 text-sm text-[#526936]">This listing is {business.status.toLowerCase()}. You can update its information here; customers can book after admin approval.{business.moderationReason && <span className="mt-2 block font-semibold">Reason: {business.moderationReason}</span>}</p>}
      {error && <p role="alert" className="rounded bg-[#fce7e1] p-3 text-sm text-[#a7302d]">{error}</p>}
      {notice && <p role="status" className="rounded bg-[#edf2e5] p-3 text-sm text-[#335e41]">{notice}</p>}
      <nav aria-label="Business management" className="flex gap-2 overflow-x-auto pb-2">{tabs.map((tab) => <button key={tab} type="button" aria-current={activeTab === tab ? 'page' : undefined} onClick={() => { setActiveTab(tab); setNotice(''); }} className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold capitalize ${activeTab === tab ? 'bg-[#243b32] text-white' : 'bg-white text-[#243b32]'}`}>{tab}{tab === 'bookings' && bookings.filter((item) => item.status === 'NEW').length ? ` (${bookings.filter((item) => item.status === 'NEW').length})` : ''}</button>)}</nav>

      {activeTab === 'overview' && <div className="space-y-5">
        <div className={panelClass}><h2 className="font-display text-xl font-bold">Listing availability</h2><div className="flex flex-wrap gap-3">
          <button type="button" disabled={Boolean(busy) || business.isTemporarilyClosed || business.status !== 'ACTIVE'} aria-pressed={isAvailable} onClick={() => void runAction('available', async () => setBusiness(await fetch(`/api/businesses/${slug}/toggle-available`, { method: 'POST' }).then(readResponse<Business>)), isAvailable ? 'Available now turned off.' : 'Available now enabled for 4 hours.')} className={buttonClass}>{isAvailable ? 'Turn off Available now' : 'Available now for 4 hours'}</button>
          <button type="button" disabled={Boolean(busy)} aria-pressed={Boolean(business.isTemporarilyClosed)} onClick={() => void runAction('closed', () => patchBusiness({ isTemporarilyClosed: !business.isTemporarilyClosed }), business.isTemporarilyClosed ? 'Business reopened.' : 'Business marked temporarily closed.')} className="rounded-full border border-[#dfe5d8] px-5 py-2.5 text-sm font-bold disabled:opacity-50">{business.isTemporarilyClosed ? 'Reopen business' : 'Mark temporarily closed'}</button>
        </div><p className="text-xs text-[#667064]">Customers see your current availability. Temporarily closing the listing pauses booking requests.</p></div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{[['Profile views', business.metrics.views], ['Calls', business.metrics.calls], ['WhatsApp', business.metrics.whatsapp], ['Directions clicks', business.metrics.directions], ['Booking requests', business.metrics.bookingRequests]].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-4 signboard-border"><p className="text-xs text-[#667064]">{label}</p><p className="font-display text-3xl font-bold text-[#243b32]">{value}</p></div>)}</div>
        <div className={panelClass}><h2 className="font-display text-xl font-bold">Promotion status</h2><p className="text-sm">{tierActive ? `${business.activeTier} placement until ${new Date(business.tierEndsAt!).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}` : 'Free organic listing'}</p><p className="text-xs text-[#667064]">Paid placement activates after payment verification.</p></div>
      </div>}

      {activeTab === 'bookings' && <section className={panelClass}>
        <div className="flex items-center justify-between gap-3"><h2 className="font-display text-xl font-bold">Customer booking requests</h2><button type="button" disabled={Boolean(busy)} onClick={() => void refreshCollection('bookings')} className="flex items-center gap-1 text-xs font-bold text-[#335e41]"><RefreshCw className="h-4 w-4" /> Refresh</button></div>
        <p className="text-sm text-[#667064]">Contact the customer to agree on the appointment before confirming a request.</p>
        {bookingError ? <p role="alert" className="text-sm text-[#a7302d]">{bookingError}</p> : !bookings.length ? <p className="text-sm text-[#667064]">No booking requests yet.</p> : <div className="divide-y divide-[#dfe5d8]">{bookings.map((booking) => <article key={booking.id} className="space-y-2 py-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-bold">{booking.serviceName}</h3><p className="text-sm text-[#667064]">{booking.day} · {booking.time}</p></div><label className="text-xs font-bold">Request status<select aria-label={`Status for ${booking.studentName}'s booking`} disabled={Boolean(busy)} value={booking.status || 'NEW'} onChange={(event) => void runAction(booking.id, async () => { const updated = await fetch('/api/bookings', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: booking.id, status: event.target.value }) }).then(readResponse<Booking>); setBookings((items) => items.map((item) => item.id === updated.id ? updated : item)); }, 'Booking status updated.')} className={inputClass}>{['NEW', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].map((status) => <option key={status}>{status}</option>)}</select></label></div><p className="text-sm"><strong>{booking.studentName}</strong>{booking.contactPhone && <> · <a className="font-bold text-[#335e41]" href={`tel:${booking.contactPhone}`}>{booking.contactPhone}</a> · <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${booking.contactPhone.replace(/\D/g, '').replace(/^0/, '254')}`} className="font-bold text-[#335e41]">WhatsApp</a></>}</p>{booking.note && <p className="whitespace-pre-wrap text-sm text-[#667064]">{booking.note}</p>}</article>)}</div>}
      </section>}

      {activeTab === 'services' && <section className={panelClass}><h2 className="font-display text-xl font-bold">Services, products and prices</h2><p className="text-sm text-[#667064]">{pro ? 'Unlimited catalogue items on Pro.' : 'Free displays your first five items. Edit or remove saved items, or use Show on Free to move an item into the public five.'}</p>{!canAddProduct && <Link href={`/pro/${business.slug}`} className="inline-block text-sm font-bold text-[#335e41]">Need more products? Pro is KES 500/month →</Link>}
        <div className="divide-y divide-[#dfe5d8]">{(business.services as EditableService[]).map((service, index) => <div key={service.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><strong className="text-sm">{service.name}</strong>{!pro && index >= 5 && <span className="ml-2 rounded-full bg-[#fff8df] px-2 py-1 text-[10px] font-bold">Saved · hidden on Free</span>}<p className="text-xs text-[#667064]">{service.priceFrom !== undefined ? `KSh ${service.priceFrom.toLocaleString()}` : 'Contact for price'}{service.note ? ` · ${service.note}` : ''}</p></div><div className="flex flex-wrap gap-3">{!pro && index >= 5 && <button type="button" disabled={Boolean(busy)} onClick={() => void runAction('publish-product', () => mutateProduct('PATCH', {...service,publishFirst:true}))} className="text-xs font-bold text-[#335e41]">Show on Free</button>}<button type="button" disabled={Boolean(busy)} onClick={() => { discardDraftPhoto(servicePhoto);setServiceId(service.id); setServiceName(service.name); setServicePrice(service.priceFrom === undefined ? '' : String(service.priceFrom)); setServiceNote(service.note || ''); setServicePhoto(service.photo || ''); }} className="text-sm font-bold text-[#335e41]">Edit</button><button type="button" aria-label={`Remove ${service.name}`} disabled={Boolean(busy)} onClick={() => void runAction('remove-service', () => mutateProduct('DELETE', {id:service.id}))} className="p-2 text-[#a7302d]"><Trash2 className="h-4 w-4" /></button></div></div>)}</div>
        <form onSubmit={saveService} className="space-y-3 border-t border-[#dfe5d8] pt-4"><fieldset disabled={Boolean(busy) || (!serviceId && !canAddProduct)} className="space-y-3 disabled:opacity-50"><h3 className="font-bold">{serviceId ? 'Edit item' : 'Add a service or product'}</h3><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Name<input required maxLength={120} value={serviceName} onChange={(event) => setServiceName(event.target.value)} className={inputClass} /></label><label className="text-xs font-bold">Starting price (KSh, optional)<input type="number" min="0" step="0.01" value={servicePrice} onChange={(event) => setServicePrice(event.target.value)} className={inputClass} /></label></div><label className="block text-xs font-bold">Note<input maxLength={500} value={serviceNote} onChange={(event) => setServiceNote(event.target.value)} className={inputClass} /></label><label className="block text-xs font-bold">Product / service photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(busy) || storageFull} onChange={(event) => { const files = event.target.files; void runAction('service-photo', async () => { const photos = await uploadPhotos(files); if (photos[0]) {discardDraftPhoto(servicePhoto);setServicePhoto(photos[0]);} }, 'Photo ready. Save the item to attach it.'); event.target.value = ''; }} className={inputClass} /></label>{servicePhoto && <div className="flex items-center gap-3"><Image unoptimized width={1200} height={800} src={servicePhoto} alt="Selected product" className="h-20 w-20 rounded object-cover" /><button type="button" onClick={() => {discardDraftPhoto(servicePhoto);setServicePhoto('');}} className="text-xs font-bold text-[#a7302d]">Remove photo</button></div>}<div className="flex gap-3"><button disabled={Boolean(busy)} className={buttonClass} type="submit">{busy === 'service' ? 'Saving...' : serviceId ? 'Save item' : 'Add item'}</button>{serviceId && <button type="button" onClick={resetService} className="text-sm font-bold">Cancel edit</button>}</div></fieldset></form>
      </section>}

      {activeTab === 'details' && <form onSubmit={(event) => { event.preventDefault(); void runAction('details', () => { const update = {...draft}; Object.assign(update,{mapPin:draft.latitude && draft.longitude ? {lat:Number(draft.latitude),lng:Number(draft.longitude)}:null}); if ((draft.latitude === '') !== (draft.longitude === '')) return Promise.reject(new Error('Enter both map coordinates or leave both blank.')); return patchBusiness(update); }); }} className={panelClass}><h2 className="font-display text-xl font-bold">Edit business information</h2><div className="grid gap-4 sm:grid-cols-2">{(['name', 'tagline', 'phone', 'whatsapp', 'landmark', 'address', 'studentDiscount'] as const).map((field) => <label key={field} className="text-xs font-bold capitalize">{detailLabels[field]}<input type={field === 'phone' || field === 'whatsapp' ? 'tel' : 'text'} required={['name', 'phone', 'whatsapp', 'landmark'].includes(field)} maxLength={field === 'phone' || field === 'whatsapp' ? 20 : 300} value={draft[field]} onChange={(event) => setDraft((current) => ({ ...current, [field]: event.target.value }))} className={inputClass} /></label>)}<div className="text-xs font-bold"><span>Business type</span><CategorySelect required value={draft.primaryCategory} onChange={value => setDraft(current => ({ ...current, primaryCategory: value }))} className={inputClass} /></div><label className="text-xs font-bold">Zone<select aria-label="Zone" value={draft.zone} onChange={(event) => setDraft((current) => ({ ...current, zone: event.target.value }))} className={inputClass}>{ZONES.filter((zone) => zone.slug !== 'all').map((zone) => <option key={zone.slug} value={zone.slug}>{zone.name}</option>)}</select></label></div><div className="rounded-xl border border-[#dfe5d8] p-4 space-y-3"><p className="text-xs text-[#667064]">Update your map pin when the business moves. Leave both coordinates blank to remove the pin.</p><button type="button" className="text-xs font-bold text-[#335e41]" onClick={() => { if (!navigator.geolocation) { setError('Location is unavailable on this device.'); return; } navigator.geolocation.getCurrentPosition(position => setDraft(current => ({...current,latitude:String(position.coords.latitude),longitude:String(position.coords.longitude)})), () => setError('Allow location access or enter coordinates manually.'),{enableHighAccuracy:true,timeout:15000}); }}>Use current location</button><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">Latitude<input type="number" step="any" min="-90" max="90" value={draft.latitude} onChange={event => setDraft(current => ({...current,latitude:event.target.value}))} className={inputClass} /></label><label className="text-xs font-bold">Longitude<input type="number" step="any" min="-180" max="180" value={draft.longitude} onChange={event => setDraft(current => ({...current,longitude:event.target.value}))} className={inputClass} /></label></div></div><label className="block text-xs font-bold">Description<textarea rows={5} maxLength={5000} value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className={inputClass} /></label><button disabled={Boolean(busy)} type="submit" className={buttonClass}>{busy === 'details' ? 'Saving...' : 'Save business information'}</button></form>}

      {activeTab === 'photos' && <section className={panelClass}><h2 className="font-display text-xl font-bold">Business photos</h2><p className="text-sm text-[#667064]">Your shop gallery has room for 8 photos. Product photos are separate. JPEG, PNG or WebP up to 5 MB each, automatically compressed; Free includes 25 MB total and Pro has unlimited total image storage.</p><label className="block text-xs font-bold">Add photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={Boolean(busy) || storageFull || business.photos.length >= 8} onChange={(event) => { const files = event.target.files; if (files && business.photos.length + files.length > 8) { setError('Use at most 8 business photos. Remove a photo before adding more.'); event.target.value = ''; return; } void runAction('photos', async () => { const photos = await uploadPhotos(files); if (photos.length) await patchBusiness({ photos: [...business.photos, ...photos], coverPhoto: business.coverPhoto || photos[0] }); }); event.target.value = ''; }} className={inputClass} /></label><div className="grid grid-cols-2 gap-4 sm:grid-cols-3">{business.photos.map((photo, index) => <div key={`${photo}-${index}`} className="space-y-2"><Image unoptimized width={320} height={240} src={photo} alt={`${business.name} photo ${index + 1}`} className="h-36 w-full rounded-lg object-cover" /><div className="flex flex-wrap gap-2"><button type="button" disabled={Boolean(busy) || business.coverPhoto === photo} onClick={() => void runAction('cover', () => patchBusiness({ coverPhoto: photo }))} className="text-xs font-bold text-[#335e41] disabled:opacity-50">{business.coverPhoto === photo ? 'Cover photo' : 'Use as cover'}</button><button type="button" disabled={Boolean(busy)} onClick={() => void runAction('remove-photo', () => { const photos = business.photos.filter((_, position) => position !== index); return patchBusiness({ photos, coverPhoto: business.coverPhoto === photo ? photos[0] || '' : business.coverPhoto }); })} className="text-xs font-bold text-[#a7302d]">Remove</button></div></div>)}</div></section>}

      {activeTab === 'hours' && <form className={panelClass} onSubmit={(event) => { event.preventDefault(); void runAction('hours', () => patchBusiness({ hours })); }}><h2 className="font-display text-xl font-bold">Opening hours (Kenya time)</h2>{days.map((day) => <div key={day} className="flex flex-wrap items-center gap-3 border-b border-[#dfe5d8] pb-3"><strong className="w-24 text-sm">{day}</strong><label className="text-xs"><input type="checkbox" checked={Boolean(hours[day]?.closed)} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], closed: event.target.checked } }))} /> Closed</label><label className="text-xs">Open<input aria-label={`${day} opening time`} type="time" disabled={hours[day]?.closed} required={!hours[day]?.closed} value={hours[day]?.open || '08:00'} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], open: event.target.value } }))} className={inputClass} /></label><label className="text-xs">Close<input aria-label={`${day} closing time`} type="time" disabled={hours[day]?.closed} required={!hours[day]?.closed} value={hours[day]?.close || '18:00'} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], close: event.target.value } }))} className={inputClass} /></label><label className="text-xs"><input type="checkbox" checked={Boolean(hours[day]?.appointmentOnly)} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], appointmentOnly: event.target.checked } }))} /> Appointment only</label></div>)}<button disabled={Boolean(busy)} type="submit" className={buttonClass}>Save opening hours</button></form>}

      {activeTab === 'billing' && <section className={panelClass}><div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">Payment history</h2><button type="button" disabled={Boolean(busy)} onClick={() => void refreshCollection('payments')} className="text-xs font-bold text-[#335e41]">Refresh</button></div>{billingError ? <p role="alert" className="text-sm text-[#a7302d]">{billingError}</p> : payments.length ? <div className="divide-y divide-[#dfe5d8]">{payments.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-3 py-3"><div><p className="text-sm font-bold">{payment.planId} · {payment.planId === 'PRO' ? '1 calendar month' : `${payment.weeks} ${payment.weeks === 1 ? 'week' : 'weeks'}`}</p><p className="text-xs text-[#667064]">{new Date(payment.createdAt).toLocaleString('en-GB', { timeZone: 'Africa/Nairobi' })}</p>{payment.receiptNumber && <p className="text-xs">Receipt: {payment.receiptNumber}</p>}{payment.failedReason && <p className="text-xs text-[#a7302d]">{payment.failedReason}</p>}</div><div className="text-right"><p className="font-bold">KES {payment.amountKes.toLocaleString()}</p><p className="text-xs">{payment.state}</p></div></div>)}</div> : <p className="text-sm text-[#667064]">No payments yet. Upgrade to Pro or buy a promotion through IntaSend checkout.</p>}</section>}

      {activeTab === 'share' && <section className={panelClass}><h2 className="font-display text-xl font-bold">Share your public profile</h2><p className="text-sm text-[#667064]">Post your business link on WhatsApp Status or send it to customers.</p><button type="button" className={buttonClass} onClick={() => void runAction('copy', () => navigator.clipboard.writeText(`${window.location.origin}/b/${business.slug}`), 'Public profile link copied.')}>Copy profile link</button><Link href={`/b/${business.slug}`} className="block text-sm font-bold text-[#335e41]">Open public profile →</Link></section>}
    </main>
  );
}

export default function BusinessDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  return <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]"><Navbar /><AccountGate requiredRole="BUSINESS" slug={slug}><BusinessDashboard key={slug} slug={slug} /></AccountGate><Footer /><BottomNav /></div>;
}
