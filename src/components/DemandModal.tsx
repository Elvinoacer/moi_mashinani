'use client';

import React, { useState } from 'react';
import { ZONES } from '@/lib/constants';
import { CheckCircle2 } from '@/components/icons';
import { ModalFrame } from '@/components/ModalFrame';

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
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/demand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          zone,
          contactPhone: phone.trim() || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not submit your request. Please try again.');
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalFrame title={'Tell us what you need'} onClose={onClose}>
        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#335e41] mx-auto" />
            <h3 className="font-display font-bold text-xl text-[#243b32]">Got It!</h3>
            <p className="text-sm text-[#667064]">
              Your request has been saved. Our team can use it to find providers around campus.
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-[#243b32] text-white px-6 py-2 rounded-full font-bold text-sm signboard-border press-action"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            {error && <p role="alert" className="rounded bg-[#fce7e1] p-3 text-sm text-[#a7302d]">{error}</p>}
            <p className="text-xs text-[#667064]">
              If you couldn&apos;t find a specific fundi, service, or product near campus, tell us. Our ambassadors onboard new shops every week.
            </p>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                What do you need?
              </label>
              <input
                type="text"
                required
                maxLength={200}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Electrician, Dentist, PS5 Lounge, Watch repair..."
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Preferred Campus Zone
              </label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              >
                {ZONES.filter((z) => z.slug !== 'all').map((z) => (
                  <option key={z.slug} value={z.slug}>
                    {z.name} ({z.landmarkHint})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
                Your WhatsApp Number (Optional)
              </label>
              <input
                type="tel"
                maxLength={20}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX (We'll notify you when listed)"
                className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-bold text-[#667064]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-[#183e35] hover:bg-[#335e41] text-white font-display font-bold text-sm uppercase px-5 py-2.5 rounded-full signboard-border signboard-shadow press-action"
              >
                {loading ? 'Submitting...' : 'Send Request'}
              </button>
            </div>
          </form>
        )}
    </ModalFrame>
  );
}
