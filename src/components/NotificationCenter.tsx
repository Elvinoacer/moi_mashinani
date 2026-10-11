'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Bell, Check, ShieldCheck } from 'lucide-react';
import { ModalFrame } from './ModalFrame';
import { disablePush, pushConfig, registerPushToken } from '@/lib/firebase-client';
import { notificationLink, promptEligible } from '@/lib/notification-content';

type Identity = {authenticated:boolean;accountId:string;role:string;declined:boolean;subscribed:boolean};
type Notice = {id:string;title:string;body:string;readAt:string|null;createdAt:string};
export function NotificationCenter() {
  const pathname = usePathname();
  const openInbox = useSearchParams().get('notifications') === '1';
  const [identity,setIdentity] = useState<Identity|null>(null);
  const [enabled,setEnabled] = useState(false);
  const [prompt,setPrompt] = useState(false);
  const [panel,setPanel] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [status,setStatus] = useState('');
  const [notices,setNotices] = useState<Notice[]>([]);
  const [health,setHealth] = useState<{pending:number;stopped:number;recentFailures:{id:string;channel:string;error:string;attempts:number}[]}|null>(null);
  const [unread,setUnread] = useState(0);
  const loadHealth = useCallback(async () => {const response = await fetch('/api/admin/notifications',{cache:'no-store'});if(response.ok)setHealth(await response.json());},[]);
  const [toast,setToast] = useState<{id:string;title:string}|null>(null);
  const lastSync = useRef('');
  const identityRef = useRef<Identity|null>(null);
  const dismissedThisVisit = useRef(false);
  const refreshInbox = useCallback(async () => {
    const response = await fetch('/api/notifications',{cache:'no-store'});
    if (response.ok) {const data = await response.json();setNotices(data.notifications);setUnread(data.unread);}
  },[]);
  useEffect(() => {
    let cancelled = false;
    async function load(actionContext = false) {
      try {
        const [response,config] = await Promise.all([fetch('/api/notifications/devices',{cache:'no-store'}),pushConfig()]);
        if (cancelled) return;
        setEnabled(config.enabled);
        if (!response.ok) {setIdentity(null);identityRef.current=null;setPrompt(false);setPanel(false);setNotices([]);setUnread(0);lastSync.current='';return;}
        const id:Identity = await response.json();
        try {if(localStorage.getItem(`mm-push-declined/${id.accountId}`) === '1')id.declined=true;} catch {}
        setIdentity(id);identityRef.current=id;if(openInbox)setPanel(true);
        await refreshInbox();
        if (!config.enabled || !('Notification' in window) || !('serviceWorker' in navigator) || !window.isSecureContext) return;
        const {isSupported} = await import('firebase/messaging');
        if (!await isSupported()) return;
        if (Notification.permission === 'granted' && !id.declined) {
          const key = `${id.accountId}/${new Date().toISOString().slice(0,10)}`;
          if (lastSync.current !== key) {await registerPushToken();lastSync.current=key;setIdentity({...id,subscribed:true});}
        } else if (Notification.permission === 'denied' && id.subscribed) {
          await disablePush('disable');setIdentity({...id,subscribed:false});
        } else {
          const context = actionContext || pathname.startsWith('/dashboard') || pathname === '/admin';
          let dismissed = 0;
          try {dismissed = Number(localStorage.getItem(`mm-push-dismissed/${id.accountId}`) || 0) || 0;} catch {}
          if (context && !openInbox && !dismissedThisVisit.current && promptEligible(Notification.permission,id.declined,dismissed)) {
            // Do not stack an automatic prompt on top of another dialog.
            if (!document.querySelector('[role="dialog"]') && !document.activeElement?.matches('input,textarea,select')) setPrompt(true);
          }
        }
      } catch {setError('Device notifications could not be checked. You can try enabling them from this inbox.');}
    }
    const timer = setTimeout(() => {void load();},4000);
    const enrolled = () => {void load(true);};
    const visibility = () => {if (document.visibilityState === 'visible') void load();};
    window.addEventListener('mm:listing-submitted',enrolled);
    document.addEventListener('visibilitychange',visibility);
    const poll = setInterval(() => {if (document.visibilityState === 'visible' && identityRef.current) void refreshInbox().catch(() => {});},60000);
    return () => {cancelled=true;clearTimeout(timer);clearInterval(poll);window.removeEventListener('mm:listing-submitted',enrolled);document.removeEventListener('visibilitychange',visibility);};
  },[pathname,openInbox,refreshInbox]);
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const message = (event:MessageEvent) => {
      if (event.data?.type !== 'MM_NOTIFICATION' || !identityRef.current) return;
      // The inbox checks account ownership before displaying a foreground alert.
      void fetch('/api/notifications',{cache:'no-store'}).then(async response => {
        if (!response.ok) return;
        const data = await response.json();const notice = data.notifications.find((n:Notice) => n.id === event.data.id);
        if (notice) {setNotices(data.notifications);setUnread(data.unread);setToast({id:notice.id,title:notice.title});}
      }).catch(() => {});
    };
    navigator.serviceWorker.addEventListener('message',message);
    return () => navigator.serviceWorker.removeEventListener('message',message);
  },[]);
  useEffect(() => {if (!toast) return;const timer=setTimeout(() => setToast(null),12000);return () => clearTimeout(timer);},[toast]);
  function closePrompt() {
    if (busy) return;
    if (identity) {try {localStorage.setItem(`mm-push-dismissed/${identity.accountId}`,String(Date.now()));} catch {}}
    dismissedThisVisit.current=true;setPrompt(false);setError('');
  }
  function rememberDecline(declined: boolean) {
    if (!identity) return;
    try {if(declined)localStorage.setItem(`mm-push-declined/${identity.accountId}`,'1');else localStorage.removeItem(`mm-push-declined/${identity.accountId}`);} catch {}
  }
  async function allow() {
    setBusy(true);setError('');setStatus('');
    try {
      // Browser permission is requested directly from this button gesture.
      if (Notification.permission === 'denied') throw new Error('Notifications are blocked in your browser. Allow them in site settings, then try again.');
      const permission = await Notification.requestPermission();
      if (permission === 'denied') {await disablePush('decline');rememberDecline(true);if(identity)setIdentity({...identity,declined:true,subscribed:false});setPrompt(false);setStatus('Notifications declined. You can still use email and your inbox.');return;}
      if (permission !== 'granted') {if(identity) {try {localStorage.setItem(`mm-push-dismissed/${identity.accountId}`,String(Date.now()));} catch {}}dismissedThisVisit.current=true;setPrompt(false);return;}
      await registerPushToken();rememberDecline(false);if(identity)setIdentity({...identity,declined:false,subscribed:true});setPrompt(false);setStatus('Notifications are enabled on this device.');
    } catch (cause) {setError(cause instanceof Error ? cause.message : 'Could not enable notifications. Try again.');}
    finally {setBusy(false);}
  }
  async function decline() {
    setBusy(true);setError('');
    try {await disablePush('decline');rememberDecline(true);if(identity)setIdentity({...identity,declined:true,subscribed:false});setPrompt(false);setStatus('Preference saved. Email and your inbox remain available.');}
    catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not save preference.');}
    finally {setBusy(false);}
  }
  async function turnOff() {
    setBusy(true);setError('');
    try {await disablePush('decline');rememberDecline(true);if(identity)setIdentity({...identity,subscribed:false,declined:true});setStatus('Notifications are off on this device.');}
    catch(cause) {setError(cause instanceof Error ? cause.message : 'Could not save preference.');}
    finally {setBusy(false);}
  }
  if (!identity) return null;
  const admin = identity.role === 'ADMIN';
  const button = 'rounded-xl bg-[#243b32] px-4 py-3 text-sm font-bold text-white disabled:opacity-50';
  const denied = typeof Notification !== 'undefined' && Notification.permission === 'denied';
  return <>
    <button aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} onClick={() => {setPanel(true);setError('');void refreshInbox().catch(() => {});if(identity.role === 'ADMIN')void loadHealth().catch(() => {});}} className="fixed bottom-24 right-4 z-40 flex h-12 min-w-12 items-center justify-center gap-1 rounded-full border border-[#dfe5d8] bg-white px-3 text-[#243b32] shadow-lg md:bottom-6"><Bell size={21}/>{unread>0 && <span className="rounded-full bg-[#335e41] px-1.5 text-xs text-white">{unread>99 ? '99+':unread}</span>}</button>
    {toast && <div role="status" className="fixed bottom-40 right-4 z-50 max-w-sm rounded-xl border border-[#dfe5d8] bg-white p-4 shadow-lg"><a href={notificationLink(toast.id)} className="font-bold text-[#335e41]">{toast.title} · Open update</a><button aria-label="Dismiss notification" onClick={() => setToast(null)} className="ml-3 p-1">×</button></div>}
    {prompt && <ModalFrame title={admin ? 'Keep up with your review queue' : 'Know when your business is ready'} onClose={closePrompt}><div className="space-y-5 p-5"><ShieldCheck size={36} className="text-[#335e41]"/><p className="text-sm leading-6">{admin ? 'Get timely alerts when a listing needs verification, a complaint needs review, or a new request, booking or payment arrives.' : 'We’ll tell you when your listing is reviewed and remind you to add profile and product photos. Once you’re live, receive new customer requests, bookings and important payment updates.'}</p><p className="text-xs leading-5 text-[#667064]">Only useful service updates. No permission request until you choose Allow. Email updates and your inbox remain available if you decline. You can turn notifications off here anytime.</p>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={busy} onClick={() => void allow()} className={`${button} w-full`}>{busy ? 'Please wait…':'Allow notifications'}</button><div className="flex justify-between gap-3 text-sm"><button disabled={busy} onClick={closePrompt} className="underline">Maybe later</button><button disabled={busy} onClick={() => void decline()} className="text-[#667064] underline">No thanks</button></div></div></ModalFrame>}
    {panel && <ModalFrame title="Your notifications" onClose={() => {if(!busy)setPanel(false);}}><div className="space-y-4 p-5"><div className="rounded-xl bg-[#f7f8f2] p-4 text-sm"><p className="font-bold">Device notifications</p><p className="mt-1 text-xs text-[#667064]">{identity.subscribed ? 'Enabled on this device.' : !enabled ? 'Push alerts will be available once setup is complete. Your inbox and email are available.' : denied ? 'Blocked by your browser. Change permission in site settings to enable alerts.' : 'Stay informed about verification and customer activity.'}</p>{enabled && ('Notification' in window) && <button disabled={busy} className="mt-3 font-bold underline" onClick={() => void (identity.subscribed ? turnOff():allow())}>{busy ? 'Saving…':identity.subscribed ? 'Turn off notifications':'Enable notifications'}</button>}</div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}{status && <p role="status" className="text-sm text-[#335e41]">{status}</p>}{unread>0 && <button className="flex items-center gap-1 text-xs font-bold underline" onClick={() => {void fetch('/api/notifications',{method:'PATCH',headers:{'Content-Type':'application/json'},body:'{}'}).then(response => {if(response.ok)return refreshInbox();setError('Could not mark notifications as read.');}).catch(() => setError('Could not mark notifications as read.'));}}><Check size={14}/>Mark all as read</button>}{admin && health && <details className="rounded-xl border border-[#dfe5d8] p-3 text-xs"><summary className="cursor-pointer font-bold">Delivery health: {health.pending} pending · {health.stopped} stopped</summary><ul className="mt-3 space-y-2">{health.recentFailures.map(f => <li key={f.id} className="rounded-lg bg-[#f7f8f2] p-3"><p>{f.channel}: {f.error} · {f.attempts} attempts</p><button disabled={busy} className="mt-2 font-bold underline" onClick={() => {setBusy(true);void fetch('/api/admin/notifications',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:f.id})}).then(async response => {if(!response.ok)throw new Error('Could not retry delivery.');await loadHealth();setStatus('Delivery queued for retry.');}).catch(() => setError('Could not retry delivery.')).finally(() => setBusy(false));}}>Retry delivery</button></li>)}</ul></details>}<ul className="space-y-2">{notices.map(n => <li key={n.id}><a href={notificationLink(n.id)} className={`block rounded-xl border p-4 ${n.readAt ? 'border-[#dfe5d8]' : 'border-[#335e41] bg-[#edf2e5]'}`}><p className="text-sm font-bold">{n.title}</p><p className="mt-2 text-xs leading-5">{n.body}</p><time className="mt-2 block text-[11px] text-[#667064]" dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString('en-KE',{timeZone:'Africa/Nairobi',dateStyle:'medium',timeStyle:'short'})}</time></a></li>)}</ul>{!notices.length && <p className="py-6 text-center text-sm text-[#667064]">{identity.authenticated ? 'You’re all caught up. Important updates will appear here.' : <>Verify your email using your invitation, then <a href="/login" className="font-bold underline">sign in</a> to read your account inbox.</>}</p>}</div></ModalFrame>}
  </>;
}
