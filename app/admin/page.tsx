'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Business, ProblemReport, ServiceRequest } from '@/lib/types';
import {
  ShieldAlert,
  RefreshCw,
  CheckCircle2,
  Rocket,
  AlertCircle,
  BarChart3,
  Check,
  WhatsAppIcon,
} from '@/src/components/icons';

export default function AdminConsolePage() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [demandRequests, setDemandRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState<'moderation' | 'renewal' | 'reports' | 'demand'>('moderation');
  const [actionMessage, setActionMessage] = useState('');

  const [expiringPromotions, setExpiringPromotions] = useState<Business[]>([]);

  const refreshData = React.useCallback(() => {
    Promise.all([
      fetch('/api/businesses?status=all').then((r) => r.json()),
      fetch('/api/reports').then((r) => r.json()),
      fetch('/api/demand').then((r) => r.json()),
    ])
      .then(([bizData, repData, demData]) => {
        const allBiz: Business[] = bizData.results || [];
        setBusinesses(allBiz);
        setReports(repData || []);
        setDemandRequests(demData || []);
        setLoading(false);

        const now = Date.now();
        setExpiringPromotions(
          allBiz.filter((b) => {
            if (b.activeTier === 'NONE' || !b.tierEndsAt) return false;
            const ends = new Date(b.tierEndsAt).getTime();
            const diffDays = (ends - now) / 864e5;
            return diffDays <= 7;
          })
        );
      })
      .catch((err) => {
        console.error('Failed to load admin data:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleAdminAction = async (action: string, targetId: string, reason?: string) => {
    try {
      const res = await fetch('/api/admin/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, targetId, reason }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Action successful: ${action}`);
        setTimeout(() => setActionMessage(''), 3000);
        refreshData();
      }
    } catch (err) {
      console.error('Admin action error:', err);
    }
  };

  const pendingListings = businesses.filter((b) => b.status === 'PENDING');
  const activeListings = businesses.filter((b) => b.status === 'ACTIVE');
  const openReports = reports.filter((r) => r.status === 'OPEN');

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="page-hero bg-white signboard-border-thick rounded-xl p-5 signboard-shadow flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#fce7e1] text-[#8f2424] font-display text-xs font-bold px-2.5 py-0.5 rounded signboard-border">
              <ShieldAlert className="w-3.5 h-3.5 text-[#8f2424]" />
              CAMPUS DIRECTORATE
            </div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-[#243b32] uppercase tracking-tight mt-1">
              Admin Moderation & Renewal Queue
            </h1>
          </div>

          <button
            onClick={refreshData}
            className="bg-[#243b32] text-white text-xs font-bold px-3.5 py-2 rounded-full signboard-border press-action flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>

        {actionMessage && (
          <div className="p-3 bg-[#edf2e5] text-[#183e35] font-bold text-xs rounded signboard-border">
            {actionMessage}
          </div>
        )}

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
            <div className="text-xs text-[#667064] font-semibold">Pending Approval</div>
            <div className="font-display font-bold text-3xl text-[#183e35] mt-1">
              {pendingListings.length}
            </div>
            <div className="text-[11px] text-[#667064]">Target: &lt; 12h SLA</div>
          </div>

          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
            <div className="text-xs text-[#667064] font-semibold">Expiring in &le; 7 Days</div>
            <div className="font-display font-bold text-3xl text-[#d9f279] mt-1">
              {expiringPromotions.length}
            </div>
            <div className="text-[11px] text-[#667064]">1-Tap WhatsApp Nudge</div>
          </div>

          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
            <div className="text-xs text-[#667064] font-semibold">Open Reports</div>
            <div className="font-display font-bold text-3xl text-[#a7302d] mt-1">
              {openReports.length}
            </div>
            <div className="text-[11px] text-[#667064]">Student flags</div>
          </div>

          <div className="bg-white p-4 rounded-xl signboard-border signboard-shadow">
            <div className="text-xs text-[#667064] font-semibold">Active Directory</div>
            <div className="font-display font-bold text-3xl text-[#335e41] mt-1">
              {activeListings.length}
            </div>
            <div className="text-[11px] text-[#667064]">Approved shops</div>
          </div>
        </div>

        {/* QUEUE TABS */}
        <div className="flex border-b-2 border-[#dfe5d8] gap-2 overflow-x-auto text-xs md:text-sm font-display font-bold uppercase no-scrollbar">
          {[
            { id: 'moderation', label: `Moderation Queue (${pendingListings.length})`, icon: CheckCircle2 },
            { id: 'renewal', label: `Renewal Queue (${expiringPromotions.length})`, icon: Rocket },
            { id: 'reports', label: `Reports Queue (${openReports.length})`, icon: AlertCircle },
            { id: 'demand', label: `Demand Insights (${demandRequests.length})`, icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveQueue(tab.id as typeof activeQueue)}
                className={`px-4 py-2.5 flex items-center gap-2 shrink-0 rounded-t-lg transition-colors ${
                  activeQueue === tab.id
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

        {/* 1. MODERATION QUEUE */}
        {activeQueue === 'moderation' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Listings Awaiting Moderation
              </h2>
              <p className="text-xs text-[#667064]">
                Review details, verify reachable phone number, and approve or reject.
              </p>
            </div>

            {pendingListings.length > 0 ? (
              <div className="divide-y divide-[#dfe5d8]">
                {pendingListings.map((biz) => (
                  <div key={biz.id} className="py-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <div className="font-display font-bold text-lg text-[#243b32]">
                          {biz.name}
                        </div>
                        <div className="text-xs text-[#667064]">
                          Category: <strong>{biz.primaryCategory}</strong> • Zone: <strong>{biz.zone}</strong>
                        </div>
                        <div className="text-xs text-[#243b32] mt-0.5">
                          Landmark: {biz.landmark} • Phone: {biz.phone}
                        </div>
                        {biz.ambassadorId && (
                          <div className="text-[11px] text-[#335e41] font-semibold mt-0.5">
                            Added by Ambassador: {biz.ambassadorId} • Claim Code: {biz.claimCode}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-2 sm:pt-0">
                        <button
                          onClick={() => handleAdminAction('approve_listing', biz.id)}
                          className="bg-[#335e41] text-white text-xs font-bold px-3.5 py-1.5 rounded-full signboard-border press-action flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Approve & Verify</span>
                        </button>
                        <button
                          onClick={() => handleAdminAction('reject_listing', biz.id, 'Invalid phone number')}
                          className="bg-[#a7302d] text-white text-xs font-bold px-3 py-1.5 rounded-full signboard-border press-action"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#667064]">
                No pending listings! All submissions are reviewed.
              </div>
            )}
          </div>
        )}

        {/* 2. RENEWAL QUEUE */}
        {activeQueue === 'renewal' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Promotions Expiring Soon
              </h2>
              <p className="text-xs text-[#667064]">
                Send a 1-tap WhatsApp nudge with their real performance stats to secure renewal.
              </p>
            </div>

            {expiringPromotions.length > 0 ? (
              <div className="divide-y divide-[#dfe5d8]">
                {expiringPromotions.map((biz) => {
                  const endsDate = new Date(biz.tierEndsAt || '').toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                  });

                  const cleanPhone = biz.whatsapp.replace(/\D/g, '');
                  const nudgeMessage = encodeURIComponent(
                    `Hi ${biz.name}, your ${biz.activeTier} promotion on MoiMashinani ends on ${endsDate}. You received ${biz.metrics.calls} calls and ${biz.metrics.whatsapp} WhatsApp chats this week! Renew in one tap here: moimashinani.co.ke/promote/${biz.slug}`
                  );
                  const whatsappNudgeUrl = `https://wa.me/${cleanPhone}?text=${nudgeMessage}`;

                  return (
                    <div key={biz.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-display font-bold text-base text-[#243b32]">
                            {biz.name}
                          </span>
                          <span className="text-[10px] font-bold bg-[#e9eedf] px-2 py-0.5 rounded signboard-border">
                            {biz.activeTier}
                          </span>
                        </div>
                        <div className="text-xs text-[#667064] mt-1">
                          Ends: <strong>{endsDate}</strong> • Stats: {biz.metrics.views} views, {biz.metrics.calls} calls, {biz.metrics.whatsapp} WhatsApp taps
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={whatsappNudgeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#25D366] text-[#243b32] font-display font-bold text-xs uppercase px-4 py-2 rounded-full signboard-border signboard-shadow press-action flex items-center gap-1.5"
                        >
                          <WhatsAppIcon className="w-4 h-4 text-[#243b32]" />
                          <span>1-Tap WhatsApp Nudge</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#667064]">
                No promotions expiring in the next 7 days.
              </div>
            )}
          </div>
        )}

        {/* 3. REPORTS QUEUE */}
        {activeQueue === 'reports' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Student Flagged Listings
              </h2>
              <p className="text-xs text-[#667064]">
                Reports submitted by campus students (e.g. wrong number, scam, closed down).
              </p>
            </div>

            {openReports.length > 0 ? (
              <div className="divide-y divide-[#dfe5d8]">
                {openReports.map((rep) => (
                  <div key={rep.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#a7302d] uppercase">
                          [{rep.reason.replace(/_/g, ' ')}]
                        </span>
                        <span className="font-display font-bold text-base text-[#243b32]">
                          {rep.businessName}
                        </span>
                      </div>
                      {rep.details && (
                        <div className="text-xs text-[#667064] mt-1 italic">
                          &ldquo;{rep.details}&rdquo;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAdminAction('resolve_report', rep.id)}
                        className="bg-[#335e41] text-white text-xs font-bold px-3 py-1.5 rounded-full signboard-border"
                      >
                        Dismiss
                      </button>
                      <button
                        onClick={() => handleAdminAction('suspend_reported', rep.id)}
                        className="bg-[#a7302d] text-white text-xs font-bold px-3 py-1.5 rounded-full signboard-border"
                      >
                        Suspend Shop
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-sm text-[#667064]">
                Zero active complaints! All reported listings have been handled.
              </div>
            )}
          </div>
        )}

        {/* 4. DEMAND INSIGHTS */}
        {activeQueue === 'demand' && (
          <div className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
            <div>
              <h2 className="font-display font-bold text-xl text-[#243b32] uppercase">
                Unmet Student Demands (Zero-Result Searches)
              </h2>
              <p className="text-xs text-[#667064]">
                What students searched for but could not find. Guide your field ambassadors to onboard these!
              </p>
            </div>

            <div className="divide-y divide-[#dfe5d8]">
              {demandRequests.map((req) => (
                <div key={req.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-display font-bold text-base text-[#243b32]">
                      &ldquo;{req.query}&rdquo;
                    </div>
                    <div className="text-xs text-[#667064]">
                      Zone: {req.zone} • {new Date(req.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  {req.contactPhone && (
                    <a
                      href={`https://wa.me/254${req.contactPhone.replace(/\D/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#25D366] text-[#243b32] text-xs font-bold px-3 py-1 rounded-full signboard-border"
                    >
                      WhatsApp Student
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
