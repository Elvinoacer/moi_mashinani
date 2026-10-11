import { NextResponse } from 'next/server';
export async function GET() {
  const config = {
    apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  const enabled = Object.values(config).every(Boolean) && !!vapidKey && !!process.env.FIREBASE_CLIENT_EMAIL && !!process.env.FIREBASE_PRIVATE_KEY && config.projectId === process.env.FIREBASE_PROJECT_ID;
  return NextResponse.json({enabled,config:enabled ? config:null,vapidKey:enabled ? vapidKey:null},{headers:{'Cache-Control':'no-store'}});
}
