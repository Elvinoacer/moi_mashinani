'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AccountGate } from '@/components/AccountGate';
import { ModalFrame } from '@/components/ModalFrame';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
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

type AdminQueue = 'moderation' | 'renewal' | 'reports' | 'demand' | 'accounts' | 'listings';
function AdminConsoleContent() {
  const searchParams = useSearchParams();
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reports, setReports] = useState<ProblemReport[]>([]);
  const [demandRequests, setDemandRequests] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeQueue, setActiveQueue] = useState<AdminQueue>(() => {const queue=searchParams.get('queue');return ['moderation','renewal','reports','demand','accounts','listings'].includes(queue || '') ? queue as AdminQueue : 'moderation';});
  const [actionMessage, setActionMessage] = useState('');
  const [error, setError] = useState('');
  const [busyTarget, setBusyTarget] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [confirmationName, setConfirmationName] = useState('');
  const [ownerEditTarget, setOwnerEditTarget] = useState<Business | null>(null);
  const [ownerEditEmail, setOwnerEditEmail] = useState('');
  const [ownerEditName, setOwnerEditName] = useState('');
  const [auditTarget, setAuditTarget] = useState<Business | null>(null);
  const [auditEvents, setAuditEvents] = useState<Array<{id:string;action:string;actorId?:string|null;details?:string|null;createdAt:string}>>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [verificationTarget, setVerificationTarget] = useState<Business | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [siteOrigin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));
  const [rejectionReasons, setRejectionReasons] = useState<Record<string, string>>({});

  const [expiringPromotions, setExpiringPromotions] = useState<Business[]>([]);

  const refreshData = React.useCallback(() => {
    return Promise.all(['/api/businesses?status=all', '/api/reports', '/api/demand'].map(async (url) => {
      const response = await fetch(url, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not load the admin queues.');
      return data;
    })).then((results) => {
      setError('');
      const allBiz: Business[] = results[0].results || [];
      setBusinesses(allBiz);
      setReports(results[1] || []);
      setDemandRequests(results[2] || []);
      const now = Date.now();
      setExpiringPromotions(allBiz.filter((business) => business.activeTier !== 'NONE' && business.tierEndsAt && (new Date(business.tierEndsAt).getTime() - now) / 864e5 <= 7));
    }).catch((cause) => {
      setError(cause instanceof Error ? cause.message : 'Could not load the admin queues.');
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { void refreshData(); }, [refreshData]);

  const handleAdminAction = async (action: string, targetId: string, reason?: string) => {
    if (busyTarget) return;
    if (action === 'reject_listing' && !reason?.trim()) { setError('Enter a reason before rejecting a listing.'); return; }
    setBusyTarget(targetId); setError(''); setActionMessage('');
    try {
      const response = await fetch('/api/admin/actions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, targetId, reason }) });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'The action could not be completed.');
      setActionMessage('Action completed successfully.');
      setLoading(true);
      await refreshData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The action could not be completed.'); }
    finally { setBusyTarget(''); }
  };

  const resendInvitation = async (businessId: string) => {
    if (busyTarget) return;
    setBusyTarget(businessId); setError(''); setActionMessage('');
    try {
      const response = await fetch('/api/admin/invitations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ businessId }) });
      const data = await response.json();
      if (!response.ok || data.invitation?.sent === false) throw new Error(data.error || data.invitation?.error || 'The invitation could not be sent.');
      setActionMessage('Verification email sent to the business owner.');
      setLoading(true);
      await refreshData();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The invitation could not be sent.'); }
    finally { setBusyTarget(''); }
  };

  const reassignOwner = async () => {
    if (!ownerEditTarget || busyTarget) return;
    setBusyTarget(ownerEditTarget.id);setError('');setActionMessage('');
    try {
      const response = await fetch('/api/admin/ownership',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({businessId:ownerEditTarget.id,ownerEmail:ownerEditEmail,ownerName:ownerEditName})});
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not update owner');
      setOwnerEditTarget(null);
      setActionMessage(data.invitation?.sent ? 'Owner updated; invitation accepted by the email provider.' : 'Owner updated, but invitation delivery failed. Retry from Owner Accounts.');
      setLoading(true);await refreshData();
    } catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not change owner');}
    finally {setBusyTarget('');}
  };
  const openAudit = async (business:Business) => {
    setAuditTarget(business);setAuditEvents([]);setAuditLoading(true);
    try {
      const response = await fetch(`/api/admin/audit?businessId=${encodeURIComponent(business.id)}`,{cache:'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Audit history unavailable');
      setAuditEvents(data.events || []);
    } catch(cause) {setError(cause instanceof Error ? cause.message:'Could not load audit history');}
    finally {setAuditLoading(false);}
  };
  const deleteBusiness = async () => {
    if (!deleteTarget || busyTarget || confirmationName !== deleteTarget.name) return;
    setBusyTarget(deleteTarget.id); setDeleteError(''); setActionMessage('');
    try {
      const response = await fetch('/api/admin/actions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'delete_listing',targetId:deleteTarget.id,confirmationName})});
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Could not delete the business.');
      setDeleteTarget(null); setConfirmationName('');
      setActionMessage('Business deleted. Owner notification queued.');
      setLoading(true); await refreshData();
    } catch (cause) { setDeleteError(cause instanceof Error ? cause.message : 'Could not delete the business.'); }
    finally { setBusyTarget(''); }
  };

  const pendingListings = businesses.filter((b) => b.status === 'PENDING');
  const activeListings = businesses.filter((b) => b.status === 'ACTIVE');
  const openReports = reports.filter((r) => r.status === 'OPEN');

  return (
    <div className="space-y-6">
      {verificationTarget && <ModalFrame title={`Verify ${verificationTarget.name}`} onClose={()=>setVerificationTarget(null)}>
        <div className="space-y-4 p-5">
          <p className="text-sm text-[#667064]">Describe what you personally checked before restoring the field verification badge.</p>
          <textarea aria-label="Field verification evidence" maxLength={500} rows={3} value={verificationNote} onChange={event=>setVerificationNote(event.target.value)} className="w-full rounded-xl border border-[#dfe5d8] px-3 py-2" />
          <div className="flex justify-end gap-2"><button type="button" onClick={()=>setVerificationTarget(null)} className="rounded-xl border px-4 py-2">Cancel</button><button type="button" disabled={verificationNote.trim().length<12 || !!busyTarget} onClick={()=>{void handleAdminAction('toggle_verified',verificationTarget.id,verificationNote).then(()=>setVerificationTarget(null));}} className="rounded-xl bg-[#243b32] px-4 py-2 text-white">Confirm verification</button></div>
        </div>
      </ModalFrame>}
      {ownerEditTarget && <ModalFrame title={`Update owner for ${ownerEditTarget.name}`} onClose={() => {if(!busyTarget)setOwnerEditTarget(null);}}>
        <div className="space-y-4 p-5">
          <p className="text-sm text-[#667064]">The previous owner loses access to this listing. The new owner must accept an invitation. Confirm the new email in person.</p>
          <label className="block text-sm font-bold">Owner name<input type="text" maxLength={100} required value={ownerEditName} onChange={event=>setOwnerEditName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5d8] px-3 py-2" /></label>
          <label className="block text-sm font-bold">Owner email<input type="email" maxLength={254} required value={ownerEditEmail} onChange={event=>setOwnerEditEmail(event.target.value)} className="mt-1 w-full rounded-xl border border-[#dfe5d8] px-3 py-2" /></label>
          <div className="flex flex-wrap justify-end gap-2"><button type="button" disabled={!!busyTarget} onClick={()=>setOwnerEditTarget(null)} className="rounded-xl border border-[#dfe5d8] px-4 py-2">Cancel</button><button type="button" disabled={!!busyTarget || !ownerEditEmail.includes('@') || !ownerEditName.trim()} onClick={()=>void reassignOwner()} className="rounded-xl bg-[#243b32] px-4 py-2 text-white">Save owner & send invitation</button></div>
        </div>
      </ModalFrame>}
      {auditTarget && <ModalFrame title={`Audit history — ${auditTarget.name}`} onClose={()=>setAuditTarget(null)}>
        <div className="max-h-[65vh] space-y-3 overflow-y-auto p-5">
          {auditLoading ? <p role="status">Loading history…</p> : !auditEvents.length ? <p>No recorded enrollment or moderation events.</p> : auditEvents.map(event=><article key={event.id} className="border-b border-[#dfe5d8] pb-3"><p className="text-sm font-bold">{event.action.replaceAll('_',' ')}</p><p className="text-xs text-[#667064]">{new Date(event.createdAt).toLocaleString('en-KE',{timeZone:'Africa/Nairobi'})}{event.actorId ? ` · Actor ${event.actorId}` : ' · System'}</p>{event.details && <p className="mt-1 text-xs">{event.details}</p>}</article>)}
        </div>
      </ModalFrame>}
      {deleteTarget && <ModalFrame title="Delete business permanently" onClose={() => {if (!busyTarget) setDeleteTarget(null);}}>
        <div className="space-y-4 p-5">
          <p className="text-sm text-[#243b32]">Delete <strong>{deleteTarget.name}</strong>? This permanently removes the listing and its bookings. Payment records, complaint history and the owner account are kept. This cannot be undone.</p>
          <label className="block text-sm font-bold text-[#243b32]">Type the business name to confirm<input value={confirmationName} onChange={event => setConfirmationName(event.target.value)} disabled={!!busyTarget} autoComplete="off" className="mt-2 w-full rounded-xl border border-[#dfe5d8] px-3 py-2" /></label>
          {deleteError && <p role="alert" className="text-sm text-[#a7302d]">{deleteError}</p>}
          <div className="flex justify-end gap-3"><button type="button" disabled={!!busyTarget} onClick={() => setDeleteTarget(null)} className="rounded-xl border border-[#dfe5d8] px-4 py-2 text-sm font-bold">Cancel</button><button type="button" disabled={!!busyTarget || confirmationName !== deleteTarget.name} onClick={deleteBusiness} className="rounded-xl bg-[#a7302d] px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{busyTarget ? 'Deleting…' : 'Delete permanently'}</button></div>
        </div>
      </ModalFrame>}
        {/* Header */}
        <div className="page-hero bg-white signboard-border-thick rounded-xl p-5 signboard-shadow flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#fce7e1] text-[#8f2424] font-display text-xs font-bold px-2.5 py-0.5 rounded signboard-border">
              <ShieldAlert className="w-3.5 h-3.5 text-[#8f2424]" />
              CAMPUS DIRECTORATE
            </div>
            <h1 className="font-display font-bold text-2xl md:text-3xl text-[#243b32] uppercase tracking-tight mt-1">
              Business enrollment & admin console
            </h1>
          </div>

          <div className="flex flex-wrap gap-2 justify-end">
          <Link href="/admin/enroll" className="bg-[#335e41] text-white text-xs font-bold px-3.5 py-2 rounded-full signboard-border">Enroll business</Link>
          <button
            disabled={loading || !!busyTarget}
            onClick={() => { setLoading(true); setError(''); void refreshData(); }}
            className="bg-[#243b32] text-white text-xs font-bold px-3.5 py-2 rounded-full signboard-border press-action flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Loading...' : 'Refresh'}</span>
          </button>
          </div>
        </div>

        {error && <div role="alert" className="p-3 bg-[#fce7e1] text-[#8f2424] text-sm rounded-xl border border-[#e3c0b5]">{error}</div>}
        {actionMessage && (
          <div role="status" className="p-3 bg-[#edf2e5] text-[#183e35] font-bold text-xs rounded signboard-border">
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
            <div className="font-display font-bold text-3xl text-[#335e41] mt-1">
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
            { id: 'listings', label: `All listings (${businesses.length})`, icon: CheckCircle2 },
            { id: 'accounts', label: `Owner Accounts (${businesses.filter((business) => business.ownerEmail).length})`, icon: ShieldAlert },
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

        {loading && <p role="status" className="text-sm text-[#667064]">Loading admin queues…</p>}

        {!loading && !error && activeQueue === 'accounts' && <section className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
          <h2 className="font-display font-bold text-xl text-[#243b32]">Business owner accounts</h2>
          <p className="text-sm text-[#667064]">Track account verification and resend email invitations when needed.</p>
          {businesses.filter((business) => business.ownerEmail).length === 0 ? <p className="py-5 text-sm text-[#667064]">No enrolled owner accounts yet. Enroll a business to get started.</p> : businesses.filter((business) => business.ownerEmail).map((business) => <div key={business.id} className="border-t border-[#dfe5d8] py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="font-bold text-[#243b32]">{business.name}</p><p className="text-sm text-[#667064]">{business.ownerName} · {business.ownerEmail}</p><p className="mt-1 text-xs text-[#335e41]">{business.isClaimed ? 'Owner accepted business invitation' : business.invitationSentAt ? 'Invitation sent · awaiting owner acceptance' : 'Owner invitation not yet accepted'}</p>{business.invitationError && <p className="mt-1 text-xs text-[#8f2424]">Email delivery: {business.invitationError}</p>}</div>
            <div className="flex flex-wrap gap-2"><Link href={`/dashboard/${business.slug}`} className="rounded-xl border border-[#dfe5d8] px-3 py-2 text-xs font-bold text-[#243b32]">Manage listing</Link>{!business.isClaimed && <button type="button" onClick={() => resendInvitation(business.id)} disabled={!!busyTarget} className="rounded-xl bg-[#335e41] px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busyTarget === business.id ? 'Sending…' : 'Resend invitation'}</button>}<button type="button" disabled={!!busyTarget} onClick={()=>{setOwnerEditTarget(business);setOwnerEditEmail(business.ownerEmail || '');setOwnerEditName(business.ownerName || '');}} className="rounded-xl border border-[#dfe5d8] px-3 py-2 text-xs font-bold">Correct owner</button></div>
          </div>)}
        </section>}

        {!loading && !error && activeQueue === 'listings' && <section className="bg-white signboard-border rounded-xl p-5 md:p-6 signboard-shadow space-y-4">
          <h2 className="font-display text-xl font-bold text-[#243b32]">Manage directory listings</h2>
          <label className="block text-xs font-bold text-[#243b32]">Find a business<input value={listingSearch} onChange={event => setListingSearch(event.target.value)} placeholder="Business name, owner email or area" className="mt-2 w-full rounded-xl border border-[#dfe5d8] px-3 py-2 text-sm" /></label>
          {businesses.filter(business => `${business.name} ${business.ownerEmail || ''} ${business.zone}`.toLowerCase().includes(listingSearch.toLowerCase())).map(business => <article key={business.id} className="border-t border-[#dfe5d8] py-4 space-y-3">
            <div><h3 className="font-bold text-[#243b32]">{business.name}</h3><p className="text-xs text-[#667064]">{business.status} · {business.verificationLevel === 'L2' ? 'Field verified' : 'Awaiting field verification'} · {business.zone}</p>{business.moderationReason && <p className="mt-1 text-xs text-[#8f2424]">{business.moderationReason}</p>}</div>
            <div className="flex flex-wrap gap-2"><Link href={`/dashboard/${business.slug}`} className="rounded-xl border border-[#dfe5d8] px-3 py-2 text-xs font-bold text-[#243b32]">Edit listing & photos</Link>
            <button type="button" disabled={!!busyTarget || (['PENDING','REJECTED'].includes(business.status) && !business.isClaimed)} onClick={() => handleAdminAction(business.status === 'ACTIVE' ? 'suspend_listing':business.status === 'PENDING' ? 'approve_listing':'restore_listing',business.id)} className={`rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${business.status === 'ACTIVE' ? 'bg-[#a7302d]' : 'bg-[#335e41]'}`}>{business.status === 'ACTIVE' ? 'Suspend listing' : business.status === 'PENDING' ? 'Approve listing' : 'Restore listing'}</button>
            <button type="button" disabled={!!busyTarget} onClick={() => {if(business.verificationLevel === 'L2') void handleAdminAction('toggle_verified',business.id); else {setVerificationTarget(business);setVerificationNote('');}}} className="rounded-xl border border-[#dfe5d8] px-3 py-2 text-xs font-bold text-[#243b32] disabled:opacity-50">{business.verificationLevel === 'L2' ? 'Remove field verification' : 'Mark field verified'}</button>
            <button type="button" disabled={!!busyTarget} onClick={()=>void openAudit(business)} className="rounded-xl border border-[#dfe5d8] px-3 py-2 text-xs font-bold">Audit history</button><button type="button" disabled={!!busyTarget} onClick={() => {setDeleteTarget(business);setConfirmationName('');setDeleteError('');}} className="rounded-xl border border-[#a7302d] px-3 py-2 text-xs font-bold text-[#a7302d] disabled:opacity-50">Delete business</button>
            </div>
          </article>)}
        </section>}

        {/* 1. MODERATION QUEUE */}
        {!loading && !error && activeQueue === 'moderation' && (
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
                    <Link href={`/dashboard/${biz.slug}`} className="text-xs font-semibold text-[#335e41] underline">Review full listing & photos</Link>
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
                          disabled={!!busyTarget || !biz.isClaimed || !biz.emailVerifiedAt}
                          onClick={() => handleAdminAction('approve_listing', biz.id)}
                          className="bg-[#335e41] text-white text-xs font-bold px-3.5 py-1.5 rounded-full signboard-border press-action flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{biz.isClaimed ? 'Approve listing' : 'Awaiting owner acceptance'}</span>
                        </button>
                        <button
                          disabled={!!busyTarget}
                          onClick={() => handleAdminAction('reject_listing', biz.id, rejectionReasons[biz.id])}
                          className="bg-[#a7302d] text-white text-xs font-bold px-3 py-1.5 rounded-full signboard-border press-action"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                    <label className="block max-w-md text-xs text-[#667064]">Rejection reason<input value={rejectionReasons[biz.id] || ''} onChange={(event) => setRejectionReasons((current) => ({ ...current, [biz.id]: event.target.value }))} maxLength={300} placeholder="Required when rejecting" className="mt-1 w-full rounded-lg border border-[#dfe5d8] px-3 py-2 text-sm text-[#243b32]" /></label>
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
        {!loading && !error && activeQueue === 'renewal' && (
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
                    `Hi ${biz.name}, your ${biz.activeTier} promotion on MoiMashinani ends on ${endsDate}. Your profile has received ${biz.metrics.calls} call taps and ${biz.metrics.whatsapp} WhatsApp taps. Renew here: ${siteOrigin}/promote/${biz.slug}`
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
        {!loading && !error && activeQueue === 'reports' && (
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
                        disabled={!!busyTarget}
                        onClick={() => handleAdminAction('resolve_report', rep.id)}
                        className="bg-[#335e41] text-white text-xs font-bold px-3 py-1.5 rounded-full signboard-border"
                      >
                        Mark resolved
                      </button>
                      <button
                        disabled={!!busyTarget}
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
        {!loading && !error && activeQueue === 'demand' && (
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
                      href={`https://wa.me/${req.contactPhone.replace(/\D/g, '').replace(/^0/, '254')}`}
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
    </div>
  );
}

export default function AdminConsolePage() {
  return <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]"><Navbar /><main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-6"><AccountGate requiredRole="ADMIN"><Suspense fallback={<p role="status">Loading admin queue…</p>}><AdminConsoleContent /></Suspense></AccountGate></main><Footer /><BottomNav /></div>;
}
