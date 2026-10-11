import { after, type NextResponse } from 'next/server';
import { deliverNotifications } from './notifications';

/** Call after a successful committed mutation; failed requests cannot trigger dispatch. */
export function withNotificationDelivery<T extends NextResponse>(response: T): T {
  after(async () => {
    try {await deliverNotifications(10,10000);} catch {console.error('Notification delivery needs retry');}
  });
  return response;
}
