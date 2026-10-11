import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

export function firebaseMessaging() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!projectId || !clientEmail || !privateKey) throw new Error('Firebase delivery is not configured');
  const app = getApps().find(app => app.name === 'notifications') || initializeApp({credential:cert({projectId,clientEmail,privateKey})},'notifications');
  return getMessaging(app);
}
