'use client';

import React, { useState } from 'react';
import { ZONES } from '@/lib/constants';
import { HelpCircle, X, CheckCircle2 } from '@/components/icons';

interface DemandModalProps {
  initialQuery?: string;
  onClose: () => void;
}

export function DemandModal({ initialQuery = '', onClose }: DemandModalProps) {
  const [query, setQuery] = useState(initialQuery);
  const [zone, setZone] = useState('kesses-centre');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);

    try {
      await fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          zone,
          contactPhone: phone.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting demand request:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001C3B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-xl max-w-md w-full overflow-hidden">
        <div className="bg-[#E7EEFF] px-4 py-3 border-b-2 border-[#001C3B] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#9B0044]" />
            <h2 className="font-display font-bold text-base md:text-lg text-[#001C3B] uppercase">
              Can&apos;t Find It? Tell Us
            </h2>
          </div>
          <button onClick={onClose} className="text-[#001C3B] hover:text-[#BA1A1A] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#0B6E70] mx-auto" />
            <h3 className="font-display font-bold text-xl text-[#001C3B]">Got It!</h3>
            <p className="text-sm text-[#594045]">
              We&apos;ve sent your request to our student field ambassadors. We&apos;ll scout and onboard a verified provider around campus soon!
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-[#001C3B] text-white px-6 py-2 rounded-full font-bold text-sm signboard-border press-action"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <p className="text-xs text-[#594045]">
              If you couldn&apos;t find a specific fundi, service, or product near campus, tell us. Our ambassadors onboard new shops every week.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                What do you need?
              </label>
              <input
                type="text"
                required
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Electrician, Dentist, PS5 Lounge, Watch repair..."
                className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                Preferred Campus Zone
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
              >
                {ZONES.map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name} ({z.landmarkHint})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                Your WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX (We'll notify you when listed)"
                className="w-full bg-[#F0F3FF] signboard-border rounded px-3 py-2 text-sm text-[#001C3B] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-[#594045]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#9B0044] hover:bg-[#C2185B] text-white font-display font-bold text-sm uppercase px-5 py-2.5 rounded-full signboard-border signboard-shadow press-action"
              >
                {loading ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
