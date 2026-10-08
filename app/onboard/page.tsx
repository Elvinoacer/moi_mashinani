'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { CATEGORIES, ZONES } from '@/lib/constants';
import { Store, CheckCircle2, PlusCircle } from '@/components/icons';

export default function BusinessOnboardPage() {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [successSlug, setSuccessSlug] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].slug);
  const [tagline, setTagline] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [zone, setZone] = useState('kesses-centre');
  const [landmark, setLandmark] = useState('');
  const [description, setDescription] = useState('');
  const [service1Name, setService1Name] = useState('');
  const [service1Price, setService1Price] = useState('');
  const [service2Name, setService2Name] = useState('');
  const [service2Price, setService2Price] = useState('');
  const [studentDiscount, setStudentDiscount] = useState('');

  const calculateStrength = () => {
    let score = 0;
    if (name && category) score += 20;
    if (phone) score += 15;
    if (zone && landmark) score += 20;
    if (description.length >= 40) score += 15;
    if (service1Name && service1Price) score += 15;
    if (studentDiscount) score += 15;
    return Math.min(100, score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const services = [];
    if (service1Name.trim()) {
      services.push({
        id: 's_1',
        name: service1Name.trim(),
        priceFrom: service1Price ? Number(service1Price) : undefined,
      });
    }
    if (service2Name.trim()) {
      services.push({
        id: 's_2',
        name: service2Name.trim(),
        priceFrom: service2Price ? Number(service2Price) : undefined,
      });
    }

    try {
      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          primaryCategory: category,
          tagline: tagline.trim(),
          phone: phone.startsWith('+') ? phone : `+254${phone.replace(/\D/g, '').replace(/^0/, '')}`,
          whatsapp: (whatsapp || phone).startsWith('+') ? (whatsapp || phone) : `+254${(whatsapp || phone).replace(/\D/g, '').replace(/^0/, '')}`,
          zone,
          landmark: landmark.trim(),
          description: description.trim() || `${name} offers trusted services in ${zone}.`,
          services,
          studentDiscount: studentDiscount.trim() || undefined,
          status: 'ACTIVE', // Instantly live
          verificationLevel: 'L1',
          isClaimed: true,
          ownerPhone: phone,
        }),
      });

      const data = await res.json();
      setSuccessSlug(data.slug);
    } catch (err) {
      console.error('Error submitting onboarding:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const strength = calculateStrength();

  return (
    <div className="min-h-screen flex flex-col bg-[#F2F5F8]">
      <Navbar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 md:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="bg-white border-2 border-[#001C3B] rounded-2xl p-6 shadow-[3px_3px_0px_#001C3B] text-center space-y-2">
          <Store className="w-10 h-10 text-[#C2185B] mx-auto" />
          <h1 className="font-display font-black text-2xl md:text-3xl text-[#001C3B] uppercase">
            List Your Business — Free
          </h1>
          <p className="text-xs md:text-sm text-[#594045] max-w-md mx-auto font-body">
            Get discovered by thousands of Moi University students. Setup takes less than 3 minutes.
          </p>

          {/* Profile Strength Progress Bar */}
          <div className="max-w-xs mx-auto pt-2 space-y-1">
            <div className="flex justify-between text-[11px] font-bold text-[#001C3B]">
              <span>Profile Completeness</span>
              <span>{strength}%</span>
            </div>
            <div className="w-full bg-[#E7EEFF] h-2.5 rounded-full overflow-hidden border border-[#001C3B]">
              <div
                className="bg-[#0B6E70] h-full transition-all duration-300"
                style={{ width: `${strength}%` }}
              ></div>
            </div>
          </div>
        </div>

        {successSlug ? (
          /* SUCCESS SCREEN */
          <div className="bg-white border-2 border-[#001C3B] rounded-2xl p-8 shadow-[4px_4px_0px_#001C3B] text-center space-y-4">
            <CheckCircle2 className="w-16 h-16 text-[#0B6E70] mx-auto" />
            <h2 className="font-display font-black text-3xl text-[#001C3B] uppercase">
              You&apos;re Live on MoiMashinani!
            </h2>
            <p className="text-sm text-[#594045] max-w-md mx-auto">
              Your business profile has been published. Students can now find your shop, check your prices, and contact you in two taps.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <Link
                href={`/b/${successSlug}`}
                className="bg-[#001C3B] text-white font-display font-bold text-xs uppercase px-5 py-2.5 rounded-full signboard-border press-action"
              >
                View Public Shop Page
              </Link>
              <Link
                href={`/dashboard/${successSlug}`}
                className="bg-[#C2185B] text-white font-display font-bold text-xs uppercase px-5 py-2.5 rounded-full signboard-border press-action"
              >
                Open Merchant Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* STEP WIZARD FORM */
          <form onSubmit={handleSubmit} className="bg-white signboard-border-thick rounded-xl p-6 signboard-shadow-lg space-y-5">
            {/* Step indicator */}
            <div className="flex items-center justify-between text-xs font-display font-bold uppercase pb-3 border-b border-[#D5DCE4]">
              <span className={step >= 1 ? 'text-[#9B0044]' : 'text-[#8D6F75]'}>1. Basic Info</span>
              <span>→</span>
              <span className={step >= 2 ? 'text-[#9B0044]' : 'text-[#8D6F75]'}>2. Location & Contact</span>
              <span>→</span>
              <span className={step >= 3 ? 'text-[#9B0044]' : 'text-[#8D6F75]'}>3. Prices & Publish</span>
            </div>

            {/* STEP 1 */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-[#001C3B] uppercase">
                  Business Identity
                </h2>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Modern Kinyozi & Barbershop"
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    One-Line Tagline
                  </label>
                  <input
                    type="text"
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value)}
                    placeholder="e.g. Clean fades, beards & student haircut rates"
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (name.trim()) setStep(2);
                  }}
                  className="w-full bg-[#001C3B] text-white font-display font-bold text-sm uppercase py-2.5 rounded-full signboard-border press-action mt-2"
                >
                  Continue to Step 2 →
                </button>
              </div>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-[#001C3B] uppercase">
                  Where & How Students Reach You
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0712 345 678"
                      className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                      WhatsApp Number
                    </label>
                    <input
                      type="tel"
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="Leave blank if same as phone"
                      className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    Campus Zone *
                  </label>
                  <select
                    value={zone}
                    onChange={(e) => setZone(e.target.value)}
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  >
                    {ZONES.slice(1).map((z) => (
                      <option key={z.slug} value={z.slug}>
                        {z.name} ({z.landmarkHint.split(',')[0]})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    Landmark & Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={landmark}
                    onChange={(e) => setLandmark(e.target.value)}
                    placeholder="e.g. Stage shopping complex, 1st floor next to Bata"
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    Description of Your Work
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe what you specialize in, turnaround times, and experience..."
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="px-4 py-2 text-xs font-bold text-[#594045]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (phone.trim() && landmark.trim()) setStep(3);
                    }}
                    className="flex-1 bg-[#001C3B] text-white font-display font-bold text-sm uppercase py-2.5 rounded-full signboard-border press-action"
                  >
                    Continue to Step 3 →
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <div className="space-y-4">
                <h2 className="font-display font-bold text-lg text-[#001C3B] uppercase">
                  Prices & Student Deals
                </h2>

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={service1Name}
                      onChange={(e) => setService1Name(e.target.value)}
                      placeholder="Main Service (e.g. Haircut)"
                      className="bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                    />
                    <input
                      type="number"
                      value={service1Price}
                      onChange={(e) => setService1Price(e.target.value)}
                      placeholder="Price in KES (e.g. 150)"
                      className="bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={service2Name}
                      onChange={(e) => setService2Name(e.target.value)}
                      placeholder="Second Service (e.g. Beard shave)"
                      className="bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                    />
                    <input
                      type="number"
                      value={service2Price}
                      onChange={(e) => setService2Price(e.target.value)}
                      placeholder="Price in KES (e.g. 100)"
                      className="bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                    Student Discount (Optional)
                  </label>
                  <input
                    type="text"
                    value={studentDiscount}
                    onChange={(e) => setStudentDiscount(e.target.value)}
                    placeholder="e.g. 10% discount for students on weekdays"
                    className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="px-4 py-2 text-xs font-bold text-[#594045]"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-[#C2185B] hover:bg-[#9E1049] text-white font-display font-bold text-sm uppercase py-3 rounded-full border border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action flex items-center justify-center gap-2"
                  >
                    <PlusCircle className="w-5 h-5" />
                    <span>{submitting ? 'Publishing Shop...' : 'Publish Business Profile'}</span>
                  </button>
                </div>
              </div>
            )}
          </form>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
