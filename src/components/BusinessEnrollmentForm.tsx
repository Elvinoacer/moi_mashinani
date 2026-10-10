'use client';

import { useState, type FormEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Plus, Trash2 } from 'lucide-react';
import { ZONES } from '@/lib/constants';
import { CategorySelect } from '@/components/CategorySelect';
import { FREE_PRODUCT_LIMIT } from '@/lib/catalog-plan';
import { PhotoUploader } from '@/components/PhotoUploader';
import type { Business, BusinessHours } from '@/lib/types';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_LABELS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const inputClass = 'w-full rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] px-3 py-2.5 text-sm text-[#243b32] focus:outline-2 focus:outline-[#335e41]';
const labelClass = 'block text-xs font-bold text-[#243b32] mb-1.5';
type ProductDraft = { id: string; name: string; price: string; unit: string; photo: string };
type EnrollmentResult = { business: Business; invitation: { sent: boolean; error?: string } };
function initialHours(): BusinessHours { return Object.fromEntries(DAYS.map((day) => [day, { open: '08:00', close: '18:00', closed: day === 'Sunday' }])); }

export function BusinessEnrollmentForm({ mode = 'admin', onEnrolled }: { mode?: 'admin' | 'public'; onEnrolled?: () => void }) {
  const [details, setDetails] = useState({ ownerName: '', ownerEmail: '', name: '', primaryCategory: '', tagline: '', description: '', phone: '', whatsapp: '', zone: 'kesses-centre', landmark: '', address: '', latitude: '', longitude: '', studentDiscount: '' });
  const [hours, setHours] = useState(initialHours);
  const [serviceModes, setServiceModes] = useState<string[]>(['at_shop']);
  const [products, setProducts] = useState<ProductDraft[]>([{ id: 'initial-product', name: '', price: '', unit: '', photo: '' }]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<EnrollmentResult | null>(null);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  function detailInput(key: keyof typeof details, label: string, options: { required?: boolean; type?: string; step?: string; placeholder?: string; maxLength?: number; autoComplete?: string } = {}) {
    return <label><span className={labelClass}>{label}{options.required && ' *'}</span><input {...options} value={details[key]} onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))} className={inputClass} /></label>;
  }
  function updateProduct(id: string, values: Partial<ProductDraft>) { setProducts((current) => current.map((product) => product.id === id ? { ...product, ...values } : product)); }
  function useCurrentLocation() {
    if (!navigator.geolocation) { setError('Location is unavailable on this device. You can enter coordinates manually.'); return; }
    setLocating(true); setError('');
    navigator.geolocation.getCurrentPosition((position) => {
      setDetails((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) }));
      setLocating(false);
    }, () => { setError('Could not get your location. Allow location access, or enter coordinates manually.'); setLocating(false); }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (submitting || uploading) return;
    setError(''); setSubmitting(true);
    try {
      const services = products.filter((product) => product.name.trim()).map((product) => ({ id: product.id, name: product.name.trim(), priceFrom: product.price === '' ? undefined : Number(product.price), unit: product.unit.trim() || undefined, photo: product.photo || undefined }));
      if (!serviceModes.length) throw new Error('Select at least one way the business serves customers.');
      if (services.some((product) => product.priceFrom !== undefined && (!Number.isFinite(product.priceFrom) || product.priceFrom < 0))) throw new Error('Enter valid product or service prices.');
      const { latitude, longitude, ...businessDetails } = details;
      if ((latitude === '') !== (longitude === '')) throw new Error('Enter both latitude and longitude, or leave both blank.');
      const mapPin = latitude && longitude ? { lat: Number(latitude), lng: Number(longitude) } : undefined;
      if (mapPin && (!Number.isFinite(mapPin.lat) || !Number.isFinite(mapPin.lng) || Math.abs(mapPin.lat) > 90 || Math.abs(mapPin.lng) > 180)) throw new Error('Enter valid map coordinates.');
      const response = await fetch(mode === 'admin' ? '/api/admin/enroll' : '/api/businesses', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...Object.fromEntries(Object.entries(businessDetails).map(([key, value]) => [key, value.trim()])), whatsapp: (details.whatsapp || details.phone).trim(), mapPin, hours, serviceModes, services, photos, coverPhoto: photos[0] || '' }),
      });
      const data = await response.json();
      if (!response.ok || !data.business) throw new Error(data.error || 'Could not save the business. Your details are still here; please try again.');
      setResult(data); window.scrollTo({ top: 0, behavior: 'smooth' }); onEnrolled?.();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save the business. Please try again.'); }
    finally { setSubmitting(false); }
  }
  async function resend() {
    if (!result) return;
    setResending(true); setResendMessage('');
    try {
      const response = await fetch(mode === 'admin' ? '/api/admin/invitations' : '/api/auth/request-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mode === 'admin' ? { businessId: result.business.id } : { email: details.ownerEmail }) });
      const data = await response.json();
      if (!response.ok || data.invitation?.sent === false) throw new Error(data.error || data.invitation?.error || 'Could not send the email. Try again shortly.');
      setResendMessage('A new verification email has been requested. Ask the owner to check their inbox and spam folder.');
      setResult((current) => current ? { ...current, invitation: { sent: true } } : current);
    } catch (cause) { setResendMessage(cause instanceof Error ? cause.message : 'Could not resend the email.'); }
    finally { setResending(false); }
  }
  if (result) return <section className="rounded-2xl border border-[#dfe5d8] bg-white p-6 md:p-8 space-y-4" aria-live="polite">
    <CheckCircle2 className="h-10 w-10 text-[#335e41]" /><h2 className="font-display text-2xl font-bold text-[#243b32]">{result.business.name} has been enrolled</h2>
    <p className="text-sm text-[#667064]">{result.invitation.sent ? <>A verification email has been sent to <strong className="text-[#243b32]">{details.ownerEmail}</strong>. The owner can open the link, set up their password, and manage their profile, products, opening hours and promotions.</> : 'The business was saved, but its verification email could not be sent. Retry below to give the owner access.'}</p>
    {!result.invitation.sent && <p role="alert" className="rounded-xl bg-[#fce7e1] p-3 text-sm text-[#8f2424]">{result.invitation.error || 'Email delivery is unavailable. Please contact the administrator.'}</p>}
    <p className="text-sm text-[#667064]">{result.business.status === 'ACTIVE' ? 'The business is approved for the directory.' : 'The listing is awaiting administrator approval before it appears in the directory.'} Email verification confirms account access.</p>
    {resendMessage && <p role="status" className="rounded-xl bg-[#edf2e5] p-3 text-sm text-[#243b32]">{resendMessage}</p>}
    <div className="flex flex-wrap gap-3"><button type="button" disabled={resending} onClick={resend} className="rounded-xl border border-[#dfe5d8] px-4 py-2.5 text-sm font-bold text-[#243b32] disabled:opacity-50">{resending ? 'Sending…' : 'Resend verification email'}</button>{mode === 'admin' && <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-[#243b32] px-4 py-2.5 text-sm font-bold text-white">Enroll another business</button>}{result.business.status === 'ACTIVE' && <Link href={`/b/${result.business.slug}`} className="rounded-xl border border-[#dfe5d8] px-4 py-2.5 text-sm font-bold text-[#243b32]">View business</Link>}{mode === 'public' && <Link href="/login" className="rounded-xl bg-[#243b32] px-4 py-2.5 text-sm font-bold text-white">Sign in</Link>}</div>
  </section>;
  return <form onSubmit={submit} className="space-y-6 rounded-2xl border border-[#dfe5d8] bg-white p-5 md:p-7">
    <p className="text-sm text-[#667064]">{mode === 'admin' ? 'Collect the owner’s details during your visit. Save the listing and send their account verification email in one step.' : 'Tell us about your business. We will email you a link to verify your account and review your listing.'} Fields marked * are required.</p>
    <fieldset disabled={submitting} className="space-y-5 disabled:opacity-75"><legend className="mb-4 font-display text-xl font-bold text-[#243b32]">Owner & business</legend><div className="grid gap-4 sm:grid-cols-2">
      {detailInput('ownerName', 'Owner name', { required: true, maxLength: 100, autoComplete: 'name' })}{detailInput('ownerEmail', 'Owner email', { required: true, type: 'email', maxLength: 254, autoComplete: 'email', placeholder: 'owner@example.com' })}{detailInput('name', 'Business name', { required: true, maxLength: 120, placeholder: 'e.g. Kesses Fresh Groceries' })}
      <div><span className={labelClass}>Business type *</span><CategorySelect value={details.primaryCategory} onChange={value => setDetails(current => ({ ...current, primaryCategory: value }))} className={inputClass} required /></div>
    </div><div>{detailInput('tagline', 'Short tagline', { maxLength: 160, placeholder: 'What makes this business useful to students?' })}</div><label className="block"><span className={labelClass}>Description *</span><textarea required minLength={20} maxLength={3000} rows={3} value={details.description} onChange={(event) => setDetails((current) => ({ ...current, description: event.target.value }))} className={inputClass} placeholder="Describe what the business sells, services offered, and what customers should know." /></label></fieldset>
    <fieldset disabled={submitting} className="space-y-4 disabled:opacity-75"><legend className="mb-4 font-display text-xl font-bold text-[#243b32]">Location & contact</legend><div className="grid gap-4 sm:grid-cols-2">
      {detailInput('phone', 'Phone number', { required: true, type: 'tel', autoComplete: 'tel', placeholder: '0712 345 678' })}{detailInput('whatsapp', 'WhatsApp number', { type: 'tel', placeholder: 'Same as phone if left blank' })}
      <label><span className={labelClass}>Area *</span><select aria-label="Area" value={details.zone} onChange={(event) => setDetails((current) => ({ ...current, zone: event.target.value }))} className={inputClass}>{ZONES.filter((item) => item.slug !== 'all').map((item) => <option key={item.slug} value={item.slug}>{item.name}</option>)}</select></label>
      {detailInput('landmark', 'Nearby landmark', { required: true, maxLength: 240, placeholder: 'e.g. Opposite the main gate' })}{detailInput('address', 'Address or directions', { maxLength: 300 })}
    </div><div className="rounded-xl border border-[#dfe5d8] p-4 space-y-3"><p className="text-xs text-[#667064]">Optional map pin: capture your location while standing at the business, or enter its coordinates.</p><button type="button" onClick={useCurrentLocation} disabled={locating || submitting} className="text-sm font-bold text-[#335e41] disabled:opacity-50">{locating ? 'Finding location…' : 'Use current location'}</button><div className="grid gap-3 sm:grid-cols-2">{detailInput('latitude', 'Latitude', { type: 'number', step: 'any', placeholder: 'e.g. 0.2831' })}{detailInput('longitude', 'Longitude', { type: 'number', step: 'any', placeholder: 'e.g. 35.2905' })}</div></div><div><span className={labelClass}>How customers are served *</span><div className="flex flex-wrap gap-3">{[['at_shop', 'At the shop'], ['comes_to_you', 'Comes to you'], ['delivery', 'Delivery'], ['online', 'Online']].map(([value, label]) => <label key={value} className="flex items-center gap-2 text-sm text-[#243b32]"><input type="checkbox" checked={serviceModes.includes(value)} onChange={(event) => setServiceModes((current) => event.target.checked ? [...current, value] : current.filter((item) => item !== value))} className="accent-[#335e41]" />{label}</label>)}</div></div></fieldset>
    <fieldset disabled={submitting} className="space-y-3 disabled:opacity-75"><legend className="mb-4 font-display text-xl font-bold text-[#243b32]">Opening hours</legend><p className="text-xs text-[#667064]">Times are in Kenya time. Closing time can be the next morning for overnight businesses.</p>
      {DAYS.map((day, index) => <div key={day} className="grid grid-cols-[85px_1fr_1fr] gap-2 items-center sm:grid-cols-[100px_1fr_1fr_90px]"><span className="text-xs font-bold text-[#243b32]">{DAY_LABELS[index]}</span><input type="time" aria-label={`${DAY_LABELS[index]} opening time`} disabled={hours[day].closed || submitting} required={!hours[day].closed} value={hours[day].open} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], open: event.target.value } }))} className={`${inputClass} disabled:opacity-40`} /><input type="time" aria-label={`${DAY_LABELS[index]} closing time`} disabled={hours[day].closed || submitting} required={!hours[day].closed} value={hours[day].close} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], close: event.target.value } }))} className={`${inputClass} disabled:opacity-40`} /><label className="col-start-2 flex gap-2 items-center text-xs text-[#243b32] sm:col-start-auto"><input type="checkbox" checked={!!hours[day].closed} onChange={(event) => setHours((current) => ({ ...current, [day]: { ...current[day], closed: event.target.checked } }))} className="accent-[#335e41]" />Closed</label></div>)}
    </fieldset>
    {mode === 'admin' ? <fieldset disabled={submitting} className="space-y-4"><legend className="mb-4 font-display text-xl font-bold text-[#243b32]">Place & product photos</legend><p className="text-sm text-[#667064]">Add up to 8 clear photos of the shop and a few products. The first photo is the cover. JPG, PNG or WebP; up to 5 MB each before automatic compression. Free includes 25 MB total.</p><PhotoUploader label="Business and product photos" multiple camera maxFiles={8-photos.length} disabled={submitting || photos.length>=8} disabledReason="Your gallery is full. Remove a photo before adding more." onBusyChange={setUploading} onUploaded={urls=>setPhotos(current=>[...current,...urls])} readyMessage="Uploaded. Submit this form to save the photos with the business." saveMessage="Adding photos to this form…" />
      {photos.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{photos.map((photo, index) => <div key={photo} className="overflow-hidden rounded-xl border border-[#dfe5d8]"><Image src={photo} alt={`Business photo ${index + 1}`} width={320} height={240} unoptimized className="aspect-[4/3] w-full object-cover" /><div className="flex items-center justify-between p-2 text-xs text-[#243b32]"><span>{index === 0 ? 'Cover photo' : `Photo ${index + 1}`}</span>{index > 0 && <button type="button" aria-label={`Use photo ${index + 1} as cover`} disabled={uploading} onClick={() => setPhotos((current) => [photo, ...current.filter((item) => item !== photo)])} className="text-[#335e41] underline">Cover</button>}<button type="button" aria-label={`Remove photo ${index + 1}`} disabled={uploading} onClick={() => { void fetch(`/api/uploads?url=${encodeURIComponent(photo)}`,{method:'DELETE'}).catch(() => {});setPhotos((current) => current.filter((item) => item !== photo)); setProducts((current) => current.map((product) => product.photo === photo ? { ...product, photo: '' } : product)); }} className="p-1 text-[#a7302d]"><Trash2 size={15} /></button></div></div>)}</div>}
    </fieldset> : <p className="rounded-xl bg-[#edf2e5] p-4 text-sm text-[#335e41]">After verifying your account, you can upload shop and product photos from your merchant dashboard.</p>}
    <fieldset disabled={submitting} className="space-y-4 disabled:opacity-75"><legend className="mb-4 font-display text-xl font-bold text-[#243b32]">Products, services & prices</legend><p className="text-sm text-[#667064]">Free includes 5 products or services and 25 MB of total image storage. After approval, Pro adds unlimited catalogue items and total image storage for KES 500/month. Prices are in Kenyan shillings.</p>
      {products.map((product, index) => <div key={product.id} className="rounded-xl border border-[#dfe5d8] bg-[#f7f8f2] p-4 space-y-3"><div className="flex items-center justify-between"><span className="text-xs font-bold text-[#243b32]">Item {index + 1}</span>{products.length > 1 && <button type="button" aria-label={`Remove item ${index + 1}`} onClick={() => setProducts((current) => current.filter((item) => item.id !== product.id))} className="text-[#a7302d] p-1"><Trash2 size={16} /></button>}</div><div className="grid gap-3 sm:grid-cols-2"><label><span className={labelClass}>Product or service name</span><input maxLength={100} value={product.name} onChange={(event) => updateProduct(product.id, { name: event.target.value })} className={inputClass} placeholder="e.g. Haircut, 6 kg gas refill" /></label><label><span className={labelClass}>Price from (KES)</span><input type="number" min="0" max="1000000" step="0.01" value={product.price} onChange={(event) => updateProduct(product.id, { price: event.target.value })} className={inputClass} placeholder="e.g. 200" /></label><label><span className={labelClass}>Price unit</span><input maxLength={60} value={product.unit} onChange={(event) => updateProduct(product.id, { unit: event.target.value })} className={inputClass} placeholder="e.g. per item, per kg" /></label>{photos.length > 0 && <label><span className={labelClass}>Product photo</span><select aria-label="Product photo" value={product.photo} onChange={(event) => updateProduct(product.id, { photo: event.target.value })} className={inputClass}><option value="">No item photo</option>{photos.map((photo, photoIndex) => <option key={photo} value={photo}>Photo {photoIndex + 1}{photoIndex === 0 ? ' (cover)' : ''}</option>)}</select></label>}</div></div>)}
      {products.length < FREE_PRODUCT_LIMIT && <button type="button" onClick={() => setProducts((current) => [...current, { id: crypto.randomUUID(), name: '', price: '', unit: '', photo: '' }])} className="inline-flex items-center gap-2 text-sm font-bold text-[#335e41]"><Plus size={17} />Add another item</button>}{detailInput('studentDiscount', 'Student discount or offer', { maxLength: 240, placeholder: 'e.g. 10% off with a student ID' })}
    </fieldset>
    {error && <p role="alert" className="rounded-xl bg-[#fce7e1] p-4 text-sm font-semibold text-[#8f2424]">{error}</p>}<p className="text-xs text-[#667064]">Confirm the email address with the owner before submitting. The owner receives a secure verification link and can update these details after signing in.</p><button type="submit" disabled={submitting || uploading || locating} className="w-full rounded-xl bg-[#243b32] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-50">{submitting ? 'Saving business & sending email…' : uploading ? 'Uploading photos…' : mode === 'admin' ? 'Enroll business & email owner' : 'Submit listing & verify email'}</button>
  </form>;
}
