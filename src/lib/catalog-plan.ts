import type { Business, ServiceItem } from './types';

export const FREE_PRODUCT_LIMIT = 5;
export const FREE_STORAGE_BYTES = 25 * 1024 * 1024;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 1024 * 1024;
export const PRO_PRICE_KES = 500;
export const REMINDER_DAYS = [7, 3, 1, 0] as const;
export type CatalogBusiness = Pick<Business, 'proEndsAt'>;

export function hasPro(business: CatalogBusiness, now = Date.now()): boolean {
  return Boolean(business.proEndsAt && Date.parse(business.proEndsAt) > now);
}

/** Calendar-month billing, clamped for Jan 31 → Feb 28 and leap years. */
export function nextProEnd(currentEnd: string | Date | null | undefined, now = new Date()): Date {
  const current = currentEnd ? new Date(currentEnd) : now;
  const start = current > now ? current : now;
  const end = new Date(start);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, last));
  return end;
}

export function productLimitError(business: CatalogBusiness, before: ServiceItem[], after: ServiceItem[], now = Date.now()): string | undefined {
  if (new Set(after.map(item => item.id)).size !== after.length) return 'Each product must have a unique ID.';
  if (hasPro(business, now) || after.length <= FREE_PRODUCT_LIMIT) return;
  // An expired owner may edit or remove existing saved products, but cannot add new ones above Free.
  const oldIds = new Set(before.map(item => item.id));
  if (after.length <= before.length && after.every(item => oldIds.has(item.id))) return;
  return 'Free includes 5 products or services. Renew Pro for KES 500/month to add more.';
}

export function visibleProducts(business: Pick<Business, 'proEndsAt' | 'services'>, now = Date.now()): ServiceItem[] {
  return hasPro(business, now) ? business.services : business.services.slice(0, FREE_PRODUCT_LIMIT);
}

export function reminderStage(endsAt: Date, now = new Date()): number | undefined {
  const days = (endsAt.getTime() - now.getTime()) / 864e5;
  return REMINDER_DAYS.findLast(stage => days <= stage);
}

export function formatStorage(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function photoReferences(business: Pick<Business, 'photos' | 'coverPhoto' | 'services'>): string[] {
  return [...new Set([...business.photos, business.coverPhoto, ...business.services.map(item => item.photo ?? '')].filter(Boolean))];
}
