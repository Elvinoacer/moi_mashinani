'use client';
import type { FirebaseOptions } from 'firebase/app';
let setup: Promise<{config:FirebaseOptions;vapidKey:string;enabled:boolean}> | undefined;
export function pushConfig() {
  setup ||= fetch('/api/notifications/config',{cache:'no-store'}).then(async response => {
    if (!response.ok) throw new Error('Notification setup is unavailable');
    return response.json();
  }).catch(error => {setup = undefined;throw error;});
  return setup;
}
export async function messagingClient() {
  const config = await pushConfig();
  if (!config.enabled) throw new Error('Notifications will be available once Firebase is configured.');
  const [{getApps,initializeApp},{isSupported,getMessaging}] = await Promise.all([import('firebase/app'),import('firebase/messaging')]);
  if (!await isSupported()) throw new Error('This browser does not support push notifications. On iPhone or iPad, add this site to your Home Screen and open it there.');
  const app = getApps().find(app => app.name === 'notifications') || initializeApp(config.config,'notifications');
  return {messaging:getMessaging(app),vapidKey:config.vapidKey};
}
export async function registerPushToken() {
  const {messaging,vapidKey} = await messagingClient();
  const {getToken} = await import('firebase/messaging');
  await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'});
  const serviceWorkerRegistration = await navigator.serviceWorker.ready;
  const token = await getToken(messaging,{vapidKey,serviceWorkerRegistration});
  if (!token) throw new Error('We could not register this device. Please try again.');
  const response = await fetch('/api/notifications/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'register',token})});
  if (!response.ok) throw new Error((await response.json()).error || 'Could not save your notification preference.');
}
export async function disablePush(action:'decline'|'disable') {
  const response = await fetch('/api/notifications/devices',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action})});
  if (!response.ok) throw new Error('Could not save your notification preference. Please try again.');
  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const subscription = await registration?.pushManager.getSubscription();
    // Declining before registration must not initialize Firebase or register a worker.
    if (!subscription) return;
    await subscription.unsubscribe();
    const {messaging} = await messagingClient();
    const {deleteToken} = await import('firebase/messaging');
    await deleteToken(messaging);
  } catch { /* Server binding is already disabled. */ }
}
