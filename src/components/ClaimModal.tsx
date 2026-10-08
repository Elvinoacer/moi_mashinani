'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, X } from '@/components/icons';

interface ClaimModalProps {
  businessSlug: string;
  businessName: string;
  onClose: () => void;
}

export function ClaimModal({ businessSlug, businessName, onClose }: ClaimModalProps) {
  const router = useRouter();
  const [claimCode, setClaimCode] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimCode.trim() || !phone.trim()) return;
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/businesses/${businessSlug}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          claimCode: claimCode.trim(),
          phone: phone.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid claim code. Please check SMS or talk to ambassador.');
      } else {
        router.push(`/dashboard/${businessSlug}`);
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#243b32]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-xl max-w-md w-full overflow-hidden">
        <div className="bg-[#edf2e5] px-4 py-3 border-b-2 border-[#dfe5d8] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#183e35]" />
            <h2 className="font-display font-bold text-base md:text-lg text-[#243b32] uppercase">
              Claim Your Shop: {businessName}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#243b32] hover:text-[#a7302d] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleClaim} className="p-4 md:p-6 space-y-4">
          <p className="text-xs text-[#667064]">
            Was this listing created by a student ambassador? Enter the 4-digit or 8-digit claim code sent to your phone to take ownership and manage prices.
          </p>

          {error && (
            <div className="p-2 bg-[#fce7e1] border border-[#a7302d] text-[#a7302d] rounded text-xs font-semibold">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
              Enter Claim Code
            </label>
            <input
              type="text"
              required
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
              placeholder="e.g. CLAIM-7821"
              className="w-full bg-[#e9eedf] signboard-border rounded px-3 py-2 text-sm text-[#243b32] font-mono tracking-wider focus:outline-none uppercase"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#243b32] uppercase mb-1">
              Your Mobile Phone (For Verification)
            </label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="07XX XXX XXX"
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
              className="bg-[#335e41] hover:bg-[#183e35] text-white font-display font-bold text-sm uppercase px-5 py-2.5 rounded-full signboard-border signboard-shadow press-action"
            >
              {loading ? 'Verifying...' : 'Claim & Open Dashboard'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
