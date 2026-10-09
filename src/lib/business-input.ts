import { randomUUID } from 'node:crypto';
import { ApiError, textField } from './api';
import { CATEGORIES, ZONES } from './constants';
import { formatKenyanPhone } from './payments';
import type { Business, BusinessHours, ServiceItem } from './types';

export function phoneField(value: unknown, required = true) {
  const raw = textField(value, 'Phone number', 30, required);
  if (!raw && !required) return '';
  const formatted = formatKenyanPhone(raw);
  if (!/^254[17]\d{8}$/.test(formatted)) throw new ApiError(400, 'Use a valid Kenyan mobile number (07…, 01… or +254…)');
  return `+${formatted}`;
}
function list(value: unknown, label: string, max = 20): string[] {
  if (!Array.isArray(value) || value.length > max) throw new ApiError(400, `${label} must be a list of at most ${max} items`);
  return value.map(item => textField(item, label, 100, true));
}
function photo(value: unknown) {
  const url = textField(value, 'Photo URL', 1500, true);
  if (/^\/api\/uploads\/[0-9a-f-]{36}$/.test(url)) return url;
  try { const parsed = new URL(url); if (parsed.protocol === 'https:' && !parsed.username && !parsed.password) return url; } catch { /* invalid */ }
  throw new ApiError(400, 'Use an uploaded image or an HTTPS photo URL');
}
export function businessInput(body: Record<string, unknown>, partial = false): Partial<Business> {
  const result: Partial<Business> = {};
  for (const [key, max] of Object.entries({ name: 120, tagline: 200, description: 6000, landmark: 300, address: 500, walkTime: 80, studentDiscount: 500 })) {
    if (body[key] !== undefined || !partial && ['name','description','landmark'].includes(key)) {
      const required = !partial && ['name','landmark'].includes(key) || key === 'name';
      Object.assign(result, { [key]: textField(body[key], key, max, required) });
    }
  }
  for (const key of ['primaryCategory','zone'] as const) {
    if (body[key] !== undefined || !partial) {
      const value = textField(body[key], key, 100, true);
      if (!(key === 'zone' ? ZONES : CATEGORIES).some(item => item.slug === value)) throw new ApiError(400, `Choose a valid ${key}`);
      result[key] = value;
    }
  }
  if (body.phone !== undefined || !partial) result.phone = phoneField(body.phone);
  if (body.whatsapp !== undefined || !partial) result.whatsapp = phoneField(body.whatsapp || body.phone);
  for (const key of ['tags','extraCategories','servesZones'] as const) {
    if (body[key] !== undefined) result[key] = list(body[key], key);
  }
  if (result.extraCategories?.some(item => !CATEGORIES.some(c => c.slug === item))) throw new ApiError(400, 'Unknown extra category');
  if (result.servesZones?.some(item => !ZONES.some(z => z.slug === item))) throw new ApiError(400, 'Unknown service zone');
  if (body.serviceModes !== undefined) {
    const modes = list(body.serviceModes, 'Service modes', 4);
    if (modes.some(mode => !['at_shop','comes_to_you','delivery','online'].includes(mode))) throw new ApiError(400, 'Unknown service mode');
    result.serviceModes = modes as Business['serviceModes'];
  }
  if (body.priceLevel !== undefined) {
    if (![1,2,3].includes(body.priceLevel as number)) throw new ApiError(400, 'Invalid price level');
    result.priceLevel = body.priceLevel as Business['priceLevel'];
  }
  if (body.mapPin === null) result.mapPin = undefined;
  else if (body.mapPin !== undefined) {
    const pin = body.mapPin as {lat?:number;lng?:number};
    if (!pin || !Number.isFinite(pin.lat) || !Number.isFinite(pin.lng) || Math.abs(pin.lat!) > 90 || Math.abs(pin.lng!) > 180) throw new ApiError(400, 'Invalid map coordinates');
    result.mapPin = {lat:pin.lat!,lng:pin.lng!};
  }
  if (body.photos !== undefined) {
    if (!Array.isArray(body.photos) || body.photos.length > 8) throw new ApiError(400, 'Add at most eight photos');
    result.photos = body.photos.map(photo);
  }
  if (body.coverPhoto !== undefined) result.coverPhoto = body.coverPhoto ? photo(body.coverPhoto) : '';
  if (result.photos !== undefined && body.coverPhoto === undefined) result.coverPhoto = result.photos[0] || '';
  if (body.hours !== undefined) {
    if (!body.hours || typeof body.hours !== 'object' || Array.isArray(body.hours)) throw new ApiError(400, 'Invalid opening hours');
    const hours: BusinessHours = {};
    for (const [day, value] of Object.entries(body.hours)) {
      if (!['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].includes(day)) throw new ApiError(400, 'Invalid day in opening hours');
      const h = value as BusinessHours[string];
      if (!h || typeof h !== 'object' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.open) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(h.close)) throw new ApiError(400, 'Opening hours must use HH:MM');
      hours[day] = {open:h.open,close:h.close,closed:Boolean(h.closed),appointmentOnly:Boolean(h.appointmentOnly)};
    }
    result.hours = hours;
  }
  if (body.services !== undefined) {
    if (!Array.isArray(body.services) || body.services.length > 30) throw new ApiError(400, 'Add at most 30 products or services');
    result.services = body.services.map((item):ServiceItem => {
      if (!item || typeof item !== 'object') throw new ApiError(400, 'Invalid product or service');
      const service: ServiceItem = {id:textField(item.id,'Service ID',100) || randomUUID(),name:textField(item.name,'Product or service name',150,true)};
      for (const key of ['priceFrom','priceTo'] as const) if (item[key] !== undefined && item[key] !== null && item[key] !== '') {
        if (typeof item[key] !== 'number' || !Number.isFinite(item[key]) || item[key] < 0 || item[key] > 10000000) throw new ApiError(400, 'Prices must be positive numbers');
        service[key] = item[key];
      }
      if (service.priceTo !== undefined && service.priceFrom !== undefined && service.priceTo < service.priceFrom) throw new ApiError(400, 'Maximum price must be at least minimum price');
      if (item.unit) service.unit = textField(item.unit,'Price unit',80);
      if (item.note) service.note = textField(item.note,'Service note',500);
      if (item.photo) service.photo = photo(item.photo);
      return service;
    });
  }
  if (body.isTemporarilyClosed !== undefined) {
    if (typeof body.isTemporarilyClosed !== 'boolean') throw new ApiError(400, 'Invalid closure status');
    result.isTemporarilyClosed = body.isTemporarilyClosed;
  }
  if (body.temporarilyClosedUntil !== undefined) {
    const value = body.temporarilyClosedUntil;
    if (value !== null && value !== '' && (typeof value !== 'string' || !Number.isFinite(Date.parse(value)))) throw new ApiError(400, 'Invalid closure end date');
    result.temporarilyClosedUntil = value ? String(value) : '';
  }
  return result;
}
export function publicBusiness(business: Business): Business {
  const { ownerId, ownerEmail, ownerName, ownerPhone, claimCode, ambassadorId, invitationSentAt, invitationError, emailVerifiedAt, moderationReason, ...safe } = business;
  void ownerId; void ownerEmail; void ownerName; void ownerPhone; void claimCode; void ambassadorId; void invitationSentAt; void invitationError; void emailVerifiedAt; void moderationReason;
  return { ...safe, metrics: {views:0,calls:0,whatsapp:0,directions:0,bookingRequests:0,impressions:0,lastWeekViews:0,lastWeekCalls:0,lastWeekWhatsapp:0} };
}
