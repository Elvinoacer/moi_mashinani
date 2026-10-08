'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { CATEGORIES, ZONES } from '@/lib/constants';
import { Award, CheckCircle2, PlusCircle, Check } from '@/components/icons';

export default function AmbassadorFieldPage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [zone, setZone] = useState('kesses-centre');
  const [landmark, setLandmark] = useState('');
  const [tagline, setTagline] = useState('');
  const [consentChecked, setConsentChecked] = useState(true);
  const [ambassadorName, setAmbassadorName] = useState('Brian (Student Ambassador)');

  const [createdResult, setCreatedResult] = useState<{
    claimCode: string;
    businessName: string;
    phone: string;
    slug: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Field stats
  const [stats, setStats] = useState({
    todayCount: 3,
    verifiedTotal: 14,
    earningsKes: 700, // KES 50 per approved listing
  });

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !landmark.trim()) return;

    setSubmitting(true);
    const claimCode = `CLAIM-${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.startsWith('+') ? phone : `+254${phone.replace(/\D/g, '').replace(/^0/, '')}`,
          primaryCategory: category,
          zone,
          landmark: landmark.trim(),
          tagline: tagline.trim() || 'Local campus service provider',
          description: `${name.trim()} located near ${landmark.trim()}. Field-verified by student ambassador ${ambassadorName}.`,
          claimCode,
          isClaimed: false,
          ambassadorId: ambassadorName,
          verificationLevel: 'L1',
          status: 'PENDING', // Goes to admin approval queue
        }),
      });

      const data = await res.json();
      setCreatedResult({
        claimCode,
        businessName: name.trim(),
        phone,
        slug: data.slug,
      });

      setStats((prev) => ({
        ...prev,
        todayCount: prev.todayCount + 1,
        verifiedTotal: prev.verifiedTotal + 1,
        earningsKes: prev.earningsKes + 50,
      }));

      // Reset form
      setName('');
      setPhone('');
      setLandmark('');
      setTagline('');
    } catch (err) {
      console.error('Error adding field listing:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="page-hero bg-white border border-[#dfe5d8] rounded-2xl p-5 shadow-[0_10px_28px_#243b3212] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#edf2e5] text-[#335e41] font-display text-xs font-bold px-2.5 py-0.5 rounded-full border border-[#dfe5d8]">
              <Award className="w-3.5 h-3.5" />
              <span>FIELD AGENT PORTAL</span>
            </div>
            <h1 className="font-display font-black text-2xl md:text-3xl text-[#243b32] uppercase tracking-tight mt-1">
              Ambassador Quick-Add Tool
            </h1>
            <p className="text-xs text-[#667064]">
              Onboard local kiosks, technicians, and salon owners around Kesses in under 2 minutes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={ambassadorName}
              onChange={(e) => setAmbassadorName(e.target.value)}
              className="bg-[#e9eedf] border border-[#dfe5d8] text-xs font-bold px-2.5 py-1.5 rounded-lg focus:outline-none"
              title="Ambassador Name"
            />
          </div>
        </div>

        {/* COMMISSION TRACKER & STATS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-[#dfe5d8] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667064]">Added Today</div>
            <div className="font-display font-black text-2xl text-[#243b32] mt-0.5">
              {stats.todayCount}
            </div>
            <div className="text-[10px] text-[#335e41] font-bold">Target: 5 shops</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#dfe5d8] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667064]">Total Verified</div>
            <div className="font-display font-black text-2xl text-[#335e41] mt-0.5">
              {stats.verifiedTotal}
            </div>
            <div className="text-[10px] text-[#667064]">Across 4 zones</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#dfe5d8] shadow-sm">
            <div className="text-[11px] font-semibold text-[#667064]">Payout Accrued</div>
            <div className="font-display font-black text-2xl text-[#183e35] mt-0.5">
              KSh {stats.earningsKes}
            </div>
            <div className="text-[10px] text-[#335e41] font-bold">KES 50 / listing</div>
          </div>
        </div>

        {/* SUCCESS CLAIM CODE BANNER */}
        {createdResult && (
          <div className="bg-[#edf2e5] border-2 border-[#335e41] rounded-xl p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-[#335e41]">
              <CheckCircle2 className="w-6 h-6" />
              <h3 className="font-display font-bold text-lg uppercase text-[#243b32]">
                Listing Created & Code Generated!
              </h3>
            </div>
            <p className="text-xs text-[#243b32]">
              Show this code to the owner or text it to them so they can claim and edit their shop:
            </p>
            <div className="p-3 bg-white signboard-border rounded-lg flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase text-[#667064]">Claim Code for {createdResult.businessName}</div>
                <div className="text-2xl font-mono font-bold text-[#183e35]">{createdResult.claimCode}</div>
              </div>
              <a
                href={`https://wa.me/254${createdResult.phone.replace(/\D/g, '').replace(/^0/, '')}?text=${encodeURIComponent(
                  `Hi ${createdResult.businessName}, we listed your shop on Moi University directory (MoiMashinani). Claim your page with code: ${createdResult.claimCode} at moimashinani.co.ke/b/${createdResult.slug}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#25D366] text-[#243b32] text-xs font-bold px-3 py-2 rounded-full signboard-border press-action"
              >
                Send SMS/WhatsApp
              </a>
            </div>
          </div>
        )}

        {/* 2-MINUTE FIELD ONBOARDING FORM */}
        <form onSubmit={handleQuickAdd} className="bg-white signboard-border-thick rounded-xl p-5 md:p-6 signboard-shadow-lg space-y-4">
          <div className="border-b border-[#dfe5d8] pb-2">
            <h2 className="font-display font-bold text-lg text-[#243b32] uppercase">
              Field Registration Form
            </h2>
            <p className="text-xs text-[#667064]">
              Quickly capture the essential merchant information while standing in their shop.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Business / Shop Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mama Caro Fast Foods"
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Owner Mobile Phone *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0712 345 678"
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Campus Zone *
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              >
                {ZONES.slice(1).map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name} ({z.landmarkHint.split(',')[0]})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
              Physical Landmark / Directions *
            </label>
            <input
              type="text"
              required
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              placeholder="e.g. Stage market row, behind Bata, opposite Equity agent"
              className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
              Tagline / Popular Specialty
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Special smokie pasua, fries & fresh juices"
              className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-[#243b32] cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="rounded text-[#335e41]"
            />
            <span>Owner verbally confirmed consent to be listed on Moi University directory</span>
          </label>

          <button
            type="submit"
            disabled={submitting || !consentChecked}
            className="w-full bg-[#335e41] hover:bg-[#183e35] text-white font-display font-bold text-sm uppercase py-3 rounded-full border border-[#dfe5d8] shadow-[0_10px_28px_#243b3212] press-action flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{submitting ? 'Creating Listing...' : 'Submit Shop & Generate Claim Code'}</span>
          </button>
        </form>

        {/* ZONE COVERAGE ROUTE GUIDE */}
        <section className="bg-white border border-[#dfe5d8] rounded-2xl p-5 shadow-sm space-y-3">
          <h2 className="font-display font-bold text-lg text-[#243b32] uppercase">
            Campus Zone Coverage Checklist
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            {ZONES.slice(1).map((z) => (
              <div key={z.slug} className="p-2.5 bg-[#e9eedf] rounded-lg border border-[#dfe5d8] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#243b32]">{z.name}</div>
                  <div className="text-[10px] text-[#667064]">{z.landmarkHint.split(',')[0]}</div>
                </div>
                <Check className="w-4 h-4 text-[#335e41]" />
              </div>
            ))}
          </div>
        </section>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
