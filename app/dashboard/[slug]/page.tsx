'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Business, PaymentRecord } from '@/lib/types';
import { useNow } from '@/lib/useNow';
import {
  Eye,
  Rocket,
  CheckCircle2,
  Trash2,
  QrCode,
  BarChart3,
  Tag,
  SlidersHorizontal,
  Receipt,
} from '@/src/components/icons';

export default function BusinessDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const now = useNow();

  const [business, setBusiness] = useState<Business | null>(null);
  const [allBusinesses, setAllBusinesses] = useState<Business[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'services' | 'details' | 'share' | 'billing'>('overview');

  // Edit fields
  const [taglineInput, setTaglineInput] = useState('');
  const [descInput, setDescInput] = useState('');
  const [discountInput, setDiscountInput] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // New service fields
  const [newServiceName, setNewServiceName] = useState('');
  const [newServicePrice, setNewServicePrice] = useState('');
  const [newServiceNote, setNewServiceNote] = useState('');

  // Share kit copy toast
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetch(`/api/businesses/${slug}`)
      .then((res) => res.json())
      .then((data: Business) => {
        setBusiness(data);
        setTaglineInput(data.tagline || '');
        setDescInput(data.description || '');
        setDiscountInput(data.studentDiscount || '');
        setLoading(false);

        // Fetch payments for this business
        fetch(`/api/payments?businessId=${data.id}`)
          .then((r) => r.json())
          .then((pays) => setPayments(pays))
          .catch(() => {});
      })
      .catch((err) => {
        console.error('Failed to load dashboard business:', err);
        setLoading(false);
      });

    fetch('/api/businesses')
      .then((res) => res.json())
      .then((data) => setAllBusinesses(data.results || []))
      .catch(() => {});
  }, [slug]);

  if (loading) {
    return (
      <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
        <Navbar />
        <main className="flex-1 max-w-5xl w-full mx-auto p-8 text-center">
          <div className="inline-block p-4 bg-white signboard-border rounded-xl animate-pulse">
            Loading Merchant Hub...
          </div>
        </main>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
        <Navbar />
        <main className="flex-1 max-w-md w-full mx-auto p-8 text-center space-y-4">
          <h1 className="font-display font-bold text-2xl text-[#243b32]">
            Shop Not Found
          </h1>
          <Link href="/onboard" className="bg-[#183e35] text-white px-4 py-2 rounded-full font-bold text-xs uppercase">
            List Your Business
          </Link>
        </main>
      </div>
    );
  }

  const isAvailableNow = Boolean(
    business.availableNowUntil && new Date(business.availableNowUntil).getTime() > now
  );

  const handleToggleAvailable = async () => {
    try {
      const res = await fetch(`/api/businesses/${slug}/toggle-available`, { method: 'POST' });
      const updated = await res.json();
      setBusiness(updated);
    } catch (err) {
      console.error('Failed to toggle available:', err);
    }
  };

  const handleToggleClosed = async () => {
    try {
      const nextClosed = !business.isTemporarilyClosed;
      const res = await fetch(`/api/businesses/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTemporarilyClosed: nextClosed }),
      });
      const updated = await res.json();
      setBusiness(updated);
    } catch (err) {
      console.error('Failed to toggle closed:', err);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/businesses/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tagline: taglineInput.trim(),
          description: descInput.trim(),
          studentDiscount: discountInput.trim() || undefined,
        }),
      });
      const updated = await res.json();
      setBusiness(updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save details:', err);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;

    const newServicesList = [
      ...business.services,
      {
        id: `s_${Date.now()}`,
        name: newServiceName.trim(),
        priceFrom: newServicePrice ? Number(newServicePrice) : undefined,
        note: newServiceNote.trim() || undefined,
      },
    ];

    try {
      const res = await fetch(`/api/businesses/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: newServicesList }),
      });
      const updated = await res.json();
      setBusiness(updated);
      setNewServiceName('');
      setNewServicePrice('');
      setNewServiceNote('');
    } catch (err) {
      console.error('Failed to add service:', err);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    const updatedServices = business.services.filter((s) => s.id !== serviceId);
    try {
      const res = await fetch(`/api/businesses/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ services: updatedServices }),
      });
      const updated = await res.json();
      setBusiness(updated);
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/b/${business.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Top Header: Business Switcher & Public View Button */}
        <div className="bg-white signboard-border-thick rounded-xl p-4 md:p-5 signboard-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded signboard-border overflow-hidden bg-[#e9eedf] shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={business.coverPhoto || business.photos[0]}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-display font-bold text-2xl text-[#243b32] uppercase">
                  {business.name}
                </h1>
                <span className="text-[10px] font-bold bg-[#edf2e5] px-2 py-0.5 rounded signboard-border">
                  OWNER HUB
                </span>
              </div>
              <div className="text-xs text-[#667064] flex items-center gap-2 mt-0.5">
                <span>{business.landmark}</span>
                <span>•</span>
                <select
                  value={business.slug}
                  onChange={(e) => router.push(`/dashboard/${e.target.value}`)}
                  className="bg-[#e9eedf] font-bold text-[#183e35] text-xs px-2 py-0.5 rounded border-0 cursor-pointer"
                >
                  {allBusinesses.slice(0, 8).map((b) => (
                    <option key={b.id} value={b.slug}>
                      Switch to: {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/b/${business.slug}`}
              target="_blank"
              className="bg-white hover:bg-[#e9eedf] text-[#243b32] text-xs font-bold px-3 py-2 rounded-full signboard-border signboard-shadow press-action flex items-center gap-1.5"
            >
              <Eye className="w-4 h-4 text-[#243b32]" />
              <span>View Public Page</span>
            </Link>

            <Link
              href={`/promote/${business.slug}`}
              className="bg-[#d9f279] hover:bg-[#c7d989] text-[#243b32] text-xs font-display font-bold uppercase px-4 py-2 rounded-full signboard-border signboard-shadow press-action flex items-center gap-1.5"
            >
              <Rocket className="w-4 h-4 text-[#243b32]" />
              <span>Promote / Upgrade</span>
            </Link>
          </div>
        </div>

        {/* PROMOTION STATUS CARD (Section 4.5.3) */}
        <section className={`p-4 md:p-5 rounded-xl signboard-border-thick signboard-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          business.activeTier === 'FEATURED'
            ? 'bg-[#eff4da] border-l-[8px] border-l-[#d9f279]'
            : business.activeTier === 'RECOMMENDED'
            ? 'bg-[#edf2e5] border-l-[8px] border-l-[#335e41]'
            : 'bg-white'
        }`}>
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#667064]">
              <CheckCircle2 className="w-4 h-4 text-[#335e41]" />
              Placement Status
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display font-bold text-2xl text-[#243b32] uppercase">
                {business.activeTier === 'FEATURED'
                  ? 'Featured Tier Active'
                  : business.activeTier === 'RECOMMENDED'
                  ? 'Recommended Tier Active'
                  : 'Free Organic Listing'}
              </span>
              {business.activeTier !== 'NONE' && (
                <span className="text-xs bg-[#25D366] text-[#243b32] font-bold px-2 py-0.5 rounded-full">
                  Live
                </span>
              )}
            </div>
            <p className="text-xs text-[#667064] mt-1">
              {business.activeTier === 'FEATURED'
                ? `Guaranteed #1 top block of search results & homepage carousel. Ends: ${new Date(business.tierEndsAt || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`
                : business.activeTier === 'RECOMMENDED'
                ? `Ranked above all free listings in your category. Ends: ${new Date(business.tierEndsAt || '').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}.`
                : 'Your shop ranks organically by student search relevance. Upgrade to rank above competitors.'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {business.activeTier === 'RECOMMENDED' ? (
              <Link
                href={`/promote/${business.slug}`}
                className="bg-[#d9f279] text-[#243b32] font-display font-bold text-xs uppercase px-4 py-2.5 rounded-full signboard-border signboard-shadow press-action"
              >
                Upgrade to Featured
              </Link>
            ) : (
              <Link
                href={`/promote/${business.slug}`}
                className="bg-[#335e41] text-white font-display font-bold text-xs uppercase px-5 py-2.5 rounded-full signboard-border signboard-shadow press-action"
              >
                {business.activeTier === 'NONE' ? 'Promote My Shop (from KSh 100)' : 'Renew Promotion'}
              </Link>
            )}
          </div>
        </section>

        {/* QUICK TOGGLES & PROFILE STRENGTH */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Toggle: Available Now */}
          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-base text-[#243b32]">Available Now</div>
              <div className="text-xs text-[#667064]">Show live green dot for 4 hours</div>
            </div>
            <button
              onClick={handleToggleAvailable}
              className={`w-12 h-6 rounded-full transition-colors signboard-border relative p-0.5 ${
                isAvailableNow ? 'bg-[#25D366]' : 'bg-[#dfe5d8]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  isAvailableNow ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Toggle: Temporarily Closed */}
          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow flex items-center justify-between">
            <div>
              <div className="font-display font-bold text-base text-[#243b32]">Temporarily Closed</div>
              <div className="text-xs text-[#667064]">Pause shop during holiday/travel</div>
            </div>
            <button
              onClick={handleToggleClosed}
              className={`w-12 h-6 rounded-full transition-colors signboard-border relative p-0.5 ${
                business.isTemporarilyClosed ? 'bg-[#a7302d]' : 'bg-[#dfe5d8]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                  business.isTemporarilyClosed ? 'translate-x-6' : 'translate-x-0'
                }`}
              ></div>
            </button>
          </div>

          {/* Profile Strength */}
          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow space-y-1.5">
            <div className="flex justify-between items-center text-xs font-bold text-[#243b32]">
              <span>Profile Strength</span>
              <span className="text-[#183e35]">{business.profileStrength}%</span>
            </div>
            <div className="w-full bg-[#edf2e5] h-2.5 rounded-full overflow-hidden signboard-border">
              <div
                className="bg-[#335e41] h-full"
                style={{ width: `${business.profileStrength}%` }}
              ></div>
            </div>
            <div className="text-[11px] text-[#667064] truncate">
              {business.profileStrength >= 90
                ? 'Excellent profile! Ready for top ranking.'
                : 'Add 2 more photos or prices to reach 95%'}
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b-2 border-[#dfe5d8] gap-2 overflow-x-auto text-xs md:text-sm font-display font-bold uppercase no-scrollbar">
          {[
            { id: 'overview', label: 'Overview & Stats', icon: BarChart3 },
            { id: 'services', label: 'Services & Prices', icon: Tag },
            { id: 'details', label: 'Edit Info', icon: SlidersHorizontal },
            { id: 'share', label: 'Share Kit & QR', icon: QrCode },
            { id: 'billing', label: 'Billing & Receipts', icon: Receipt },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`px-4 py-2.5 flex items-center gap-2 shrink-0 rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white border-t-2 border-x-2 border-[#dfe5d8] text-[#183e35] -mb-[2px]'
                    : 'text-[#667064] hover:text-[#243b32]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW & STATS */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
                <div className="text-xs text-[#667064] font-semibold">Profile Views</div>
                <div className="font-display font-bold text-3xl text-[#243b32] mt-1">
                  {business.metrics.views}
                </div>
                <div className="text-[11px] text-[#335e41] font-bold mt-0.5">
                  +{business.metrics.views - (business.metrics.lastWeekViews || 0)} vs last week
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
                <div className="text-xs text-[#667064] font-semibold">Phone Calls</div>
                <div className="font-display font-bold text-3xl text-[#335e41] mt-1">
                  {business.metrics.calls}
                </div>
                <div className="text-[11px] text-[#335e41] font-bold mt-0.5">
                  +{business.metrics.calls - (business.metrics.lastWeekCalls || 0)} vs last week
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
                <div className="text-xs text-[#667064] font-semibold">WhatsApp Chats</div>
                <div className="font-display font-bold text-3xl text-[#25D366] mt-1">
                  {business.metrics.whatsapp}
                </div>
                <div className="text-[11px] text-[#335e41] font-bold mt-0.5">
                  +{business.metrics.whatsapp - (business.metrics.lastWeekWhatsapp || 0)} vs last week
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
                <div className="text-xs text-[#667064] font-semibold">Map Directions</div>
                <div className="font-display font-bold text-3xl text-[#243b32] mt-1">
                  {business.metrics.directions}
                </div>
                <div className="text-[11px] text-[#667064] mt-0.5">Walked to shop</div>
              </div>

              <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
                <div className="text-xs text-[#667064] font-semibold">Bookings</div>
                <div className="font-display font-bold text-3xl text-[#526936] mt-1">
                  {business.metrics.bookingRequests}
                </div>
                <div className="text-[11px] text-[#667064] mt-0.5">WhatsApp requests</div>
              </div>
            </div>

            {/* Performance summary note */}
            <div className="bg-[#edf2e5] signboard-border p-4 rounded-xl flex items-center justify-between">
              <div>
                <div className="font-bold text-sm text-[#243b32]">
                  Conversion Rate: {Math.round(((business.metrics.calls + business.metrics.whatsapp) / Math.max(1, business.metrics.views)) * 100)}%
                </div>
                <div className="text-xs text-[#667064]">
                  Over half of the students viewing your page tapped Call or WhatsApp!
                </div>
              </div>
              <button
                onClick={handleCopyShareLink}
                className="bg-[#243b32] text-white text-xs font-bold px-4 py-2 rounded-full press-action shrink-0"
              >
                Copy Link & Post on WhatsApp Status
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: SERVICES & PRICES */}
        {activeTab === 'services' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Manage Services & Prices
              </h2>
              <p className="text-xs text-[#667064]">
                Listings with at least 3 visible prices receive 3x more WhatsApp calls.
              </p>
            </div>

            {/* Current services list */}
            <div className="divide-y divide-[#dfe5d8]">
              {business.services.map((item) => (
                <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                  <div>
                    <div className="font-bold text-sm text-[#243b32]">{item.name}</div>
                    {item.note && <div className="text-xs text-[#667064]">{item.note}</div>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-display font-bold text-base text-[#243b32]">
                      {item.priceFrom ? `KSh ${item.priceFrom.toLocaleString()}` : 'Free / Inquiry'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(item.id)}
                      className="text-[#a7302d] hover:bg-[#fce7e1] p-1.5 rounded transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Service Form */}
            <form onSubmit={handleAddService} className="pt-4 border-t border-[#dfe5d8] space-y-3">
              <h3 className="font-display font-bold text-base text-[#243b32] uppercase">
                Add New Service / Price
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  required
                  value={newServiceName}
                  onChange={(e) => setNewServiceName(e.target.value)}
                  placeholder="Service Name (e.g. Broken Glass)"
                  className="bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
                />
                <input
                  type="number"
                  value={newServicePrice}
                  onChange={(e) => setNewServicePrice(e.target.value)}
                  placeholder="Starting Price in KES (e.g. 1500)"
                  className="bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
                />
                <input
                  type="text"
                  value={newServiceNote}
                  onChange={(e) => setNewServiceNote(e.target.value)}
                  placeholder="Note (e.g. 30 mins, includes glue)"
                  className="bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="bg-[#335e41] text-white font-display font-bold text-xs uppercase px-5 py-2.5 rounded-full signboard-border signboard-shadow press-action"
              >
                + Add Service to List
              </button>
            </form>
          </div>
        )}

        {/* TAB 3: DETAILS & DISCOUNT */}
        {activeTab === 'details' && (
          <form onSubmit={handleSaveDetails} className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
            <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
              Edit Business Details
            </h2>

            {saveSuccess && (
              <div className="p-3 bg-[#edf2e5] text-[#183e35] rounded text-xs font-bold signboard-border">
                Changes saved successfully!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                One-Line Tagline
              </label>
              <input
                type="text"
                value={taglineInput}
                onChange={(e) => setTaglineInput(e.target.value)}
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                About / Description
              </label>
              <textarea
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                rows={4}
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Student Discount Offer (Optional)
              </label>
              <input
                type="text"
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
                placeholder="e.g. 10% off any screen fix with student ID"
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="bg-[#243b32] hover:bg-[#335e41] text-white font-display font-bold text-sm uppercase px-6 py-2.5 rounded-full signboard-border signboard-shadow press-action"
            >
              Save Profile Updates
            </button>
          </form>
        )}

        {/* TAB 4: SHARE KIT & QR POSTER */}
        {activeTab === 'share' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-6">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Share Kit & QR Poster
              </h2>
              <p className="text-xs text-[#667064]">
                Hang a QR poster on your shop door or post on your WhatsApp Status to get direct inquiries.
              </p>
            </div>

            {/* QR Poster Simulation Preview */}
            <div className="max-w-xs mx-auto bg-[#ffffff] border border-[#dfe5d8] p-6 rounded-xl signboard-shadow-lg text-center space-y-3">
              <div className="text-sm font-display font-bold uppercase text-[#183e35]">
                MoiMashinani Verified
              </div>
              <div className="font-display font-bold text-xl text-[#243b32] uppercase">
                {business.name}
              </div>
              <div className="w-36 h-36 mx-auto bg-white signboard-border flex items-center justify-center p-2 rounded">
                <QrCode className="w-24 h-24 text-[#243b32]" />
              </div>
              <div className="text-[11px] text-[#667064] font-semibold">
                Scan with phone camera to see prices & tap WhatsApp
              </div>
              <div className="text-[10px] text-[#243b32] font-mono">
                moimashinani.co.ke/b/{business.slug}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCopyShareLink}
                className="bg-[#243b32] text-white text-xs font-bold px-4 py-2 rounded-full signboard-border press-action"
              >
                {copiedLink ? 'Link Copied!' : 'Copy Profile Link'}
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="bg-[#e9eedf] text-[#243b32] text-xs font-bold px-4 py-2 rounded-full signboard-border press-action"
              >
                Print Door Poster
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: BILLING & INVOICES */}
        {activeTab === 'billing' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Payment History & Receipts
              </h2>
              <p className="text-xs text-[#667064]">
                Official receipts for your weekly promotion payments via M-Pesa.
              </p>
            </div>

            {payments.length > 0 ? (
              <div className="divide-y divide-[#dfe5d8]">
                {payments.map((p) => (
                  <div key={p.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="font-bold text-sm text-[#243b32]">
                        {p.planId} Tier ({p.weeks} {p.weeks === 1 ? 'Week' : 'Weeks'})
                      </div>
                      <div className="text-xs text-[#667064]">
                        Receipt: {p.receiptNumber} • Ref: {p.mpesaRef || p.apiRef}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-display font-bold text-base text-[#243b32]">
                        KES {p.amountKes}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.state === 'COMPLETE' ? 'bg-[#edf2e5] text-[#183e35]' : 'bg-[#eff4da] text-[#526936]'
                      }`}>
                        {p.state}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-[#667064]">
                No payment receipts yet. Promote your shop to get more leads!
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
