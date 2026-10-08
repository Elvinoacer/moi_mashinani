'use client';

import React, { useState } from 'react';
import { Business } from '@/lib/types';
import { AlertCircle, X, CheckCircle2 } from '@/components/icons';

interface ReportModalProps {
  business: Business;
  onClose: () => void;
}

export function ReportModal({ business, onClose }: ReportModalProps) {
  const [reason, setReason] = useState<'wrong_number' | 'not_responding' | 'closed_down' | 'scam' | 'inappropriate' | 'other'>('not_responding');
  const [details, setDetails] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: business.id,
          businessName: business.name,
          reason,
          details: details.trim() || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting report:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001C3B]/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white signboard-border-thick signboard-shadow-lg rounded-xl max-w-md w-full overflow-hidden">
        <div className="bg-[#FFDAD6] px-4 py-3 border-b-2 border-[#001C3B] flex items-center justify-between">
          <div className="flex items-center gap-2 text-[#BA1A1A]">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <h2 className="font-display font-bold text-base md:text-lg text-[#001C3B] uppercase">
              Report a Problem: {business.name}
            </h2>
          </div>
          <button onClick={onClose} className="text-[#001C3B] hover:text-[#BA1A1A] p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-[#0B6E70] mx-auto" />
            <h3 className="font-display font-bold text-xl text-[#001C3B]">Report Received</h3>
            <p className="text-sm text-[#594045]">
              Thanks. Our student verification team will review this business within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="mt-4 bg-[#001C3B] text-white px-6 py-2 rounded-full font-bold text-sm signboard-border press-action"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                What is the issue?
              </label>
              <div className="space-y-2 text-sm">
                {[
                  { id: 'not_responding', label: 'Not responding / phone switched off' },
                  { id: 'wrong_number', label: 'Wrong number / someone else answered' },
                  { id: 'closed_down', label: 'Shop is permanently closed or moved' },
                  { id: 'scam', label: 'Scam / asked for deposit and blocked me' },
                  { id: 'inappropriate', label: 'Inappropriate or offensive content' },
                  { id: 'other', label: 'Other issue' },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded signboard-border hover:bg-[#F0F3FF] cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="reportReason"
                      value={item.id}
                      checked={reason === item.id}
                      onChange={() => setReason(item.id as typeof reason)}
                      className="text-[#9B0044] focus:ring-[#9B0044]"
                    />
                    <span className="text-[#001C3B] font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#001C3B] uppercase mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={2}
                placeholder="Give any helpful context for our campus moderator..."
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
                className="bg-[#BA1A1A] hover:bg-[#93000A] text-white font-display font-bold text-sm uppercase px-5 py-2.5 rounded-full signboard-border signboard-shadow press-action"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
