import fs from 'node:fs';
import path from 'node:path';
import {
  Business,
  ProblemReport,
  PaymentRecord,
  ServiceRequest,
  BookingIntent,
} from './types';
import {
  ZONES,
  CATEGORIES,
  SEED_BUSINESSES,
  SEED_REPORTS,
  SEED_PAYMENTS,
  SEED_SERVICE_REQUESTS,
} from './constants';

export { ZONES, CATEGORIES };

interface DatabaseData {
  businesses: Business[];
  reports: ProblemReport[];
  payments: PaymentRecord[];
  serviceRequests: ServiceRequest[];
  bookings: BookingIntent[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'data', 'moimashinani_db.json');
const BUSINESSES_FILE_PATH = path.join(process.cwd(), 'data', 'businesses.json');

function ensureDirectoryExists(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

function loadDatabase(): DatabaseData {
  try {
    const dbExists = fs.existsSync(DB_FILE_PATH);
    const bizExists = fs.existsSync(BUSINESSES_FILE_PATH);

    // If businesses.json is newer than moimashinani_db.json (e.g. edited directly or seeded), sync from it
    if (bizExists && (!dbExists || fs.statSync(BUSINESSES_FILE_PATH).mtimeMs > fs.statSync(DB_FILE_PATH).mtimeMs)) {
      const bizContent = fs.readFileSync(BUSINESSES_FILE_PATH, 'utf-8');
      const parsedBiz = JSON.parse(bizContent);
      if (Array.isArray(parsedBiz)) {
        let existingDb: Partial<DatabaseData> = {};
        if (dbExists) {
          try {
            existingDb = JSON.parse(fs.readFileSync(DB_FILE_PATH, 'utf-8'));
          } catch {}
        }
        const data: DatabaseData = {
          businesses: parsedBiz,
          reports: existingDb.reports || SEED_REPORTS,
          payments: existingDb.payments || SEED_PAYMENTS,
          serviceRequests: existingDb.serviceRequests || SEED_SERVICE_REQUESTS,
          bookings: existingDb.bookings || [],
        };
        saveDatabase(data);
        return data;
      }
    }

    if (dbExists) {
      const content = fs.readFileSync(DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.businesses)) {
        // Ensure businesses have accurate mapPins from seed if not yet set
        let updated = false;
        for (const biz of parsed.businesses) {
          if (!biz.mapPin) {
            const seed = SEED_BUSINESSES.find((s) => s.id === biz.id);
            if (seed?.mapPin) {
              biz.mapPin = seed.mapPin;
              updated = true;
            }
          }
        }
        if (updated || !bizExists) {
          saveDatabase(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Error reading database file, loading seed defaults:', err);
  }

  const initial: DatabaseData = {
    businesses: SEED_BUSINESSES,
    reports: SEED_REPORTS,
    payments: SEED_PAYMENTS,
    serviceRequests: SEED_SERVICE_REQUESTS,
    bookings: [],
  };

  saveDatabase(initial);
  return initial;
}

function saveDatabase(data: DatabaseData) {
  try {
    ensureDirectoryExists(DB_FILE_PATH);
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    fs.writeFileSync(BUSINESSES_FILE_PATH, JSON.stringify(data.businesses, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving database to file:', err);
  }
}

export function computeProfileStrength(b: Partial<Business>): number {
  let score = 0;
  if (b.name && b.primaryCategory) score += 15;
  if (b.phone) score += 10;
  if (b.zone && b.landmark) score += 15;
  if (b.photos && b.photos.length >= 1) score += 10;
  if (b.photos && b.photos.length >= 3) score += 10;
  if (b.description && b.description.length >= 80) score += 10;
  if (b.services && b.services.length >= 3) score += 10;
  if (b.hours && Object.keys(b.hours).length > 0) score += 10;
  if (b.mapPin && b.mapPin.lat) score += 5;
  if (b.tagline || b.studentDiscount) score += 5;
  return Math.min(100, score);
}

// Global in-memory cache synchronized with disk
let cachedDb: DatabaseData = loadDatabase();

export const Store = {
  getBusinesses(): Business[] {
    cachedDb = loadDatabase();
    return cachedDb.businesses;
  },

  getBusinessBySlug(slug: string): Business | undefined {
    cachedDb = loadDatabase();
    return cachedDb.businesses.find((b) => b.slug === slug);
  },

  getBusinessById(id: string): Business | undefined {
    cachedDb = loadDatabase();
    return cachedDb.businesses.find((b) => b.id === id);
  },

  createBusiness(payload: Partial<Business>): Business {
    cachedDb = loadDatabase();
    const id = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const baseSlug = (payload.name || 'business')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const suffix = Math.random().toString(36).substring(2, 6);
    const slug = `${baseSlug}-${suffix}`;

    const newBiz: Business = {
      id,
      name: payload.name || 'Untitled Business',
      slug,
      tagline: payload.tagline || '',
      description: payload.description || '',
      primaryCategory: payload.primaryCategory || 'phone-laptop-repair',
      extraCategories: payload.extraCategories || [],
      tags: payload.tags || [],
      serviceModes: payload.serviceModes || ['at_shop'],
      phone: payload.phone || '+254700000000',
      whatsapp: payload.whatsapp || payload.phone || '+254700000000',
      campus: 'Moi University (Kesses Main Campus)',
      zone: payload.zone || 'kesses-centre',
      servesZones: payload.servesZones || [payload.zone || 'kesses-centre'],
      landmark: payload.landmark || 'Near Campus Gate',
      address: payload.address || '',
      mapPin: payload.mapPin,
      walkTime: payload.walkTime || '5 min walk',
      hours: payload.hours || {
        Monday: { open: '08:00', close: '20:00' },
        Tuesday: { open: '08:00', close: '20:00' },
        Wednesday: { open: '08:00', close: '20:00' },
        Thursday: { open: '08:00', close: '20:00' },
        Friday: { open: '08:00', close: '20:00' },
        Saturday: { open: '08:30', close: '20:00' },
        Sunday: { open: '10:00', close: '18:00' },
      },
      services: payload.services || [],
      priceLevel: payload.priceLevel || 1,
      studentDiscount: payload.studentDiscount,
      photos: payload.photos || ['https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?auto=format&fit=crop&w=800&q=80'],
      coverPhoto: payload.coverPhoto || payload.photos?.[0] || 'https://images.unsplash.com/photo-1597740985671-2a8a3b80532e?auto=format&fit=crop&w=800&q=80',
      activeTier: 'NONE',
      status: payload.status || 'PENDING',
      verificationLevel: payload.verificationLevel || 'L0',
      claimCode: payload.claimCode,
      isClaimed: payload.isClaimed || false,
      ownerPhone: payload.ownerPhone,
      ambassadorId: payload.ambassadorId,
      profileStrength: computeProfileStrength(payload),
      metrics: {
        views: 0,
        calls: 0,
        whatsapp: 0,
        directions: 0,
        bookingRequests: 0,
        impressions: 0,
        lastWeekViews: 0,
        lastWeekCalls: 0,
        lastWeekWhatsapp: 0,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    cachedDb.businesses.unshift(newBiz);
    saveDatabase(cachedDb);
    return newBiz;
  },

  updateBusiness(id: string, updates: Partial<Business>): Business | undefined {
    cachedDb = loadDatabase();
    const idx = cachedDb.businesses.findIndex((b) => b.id === id);
    if (idx === -1) return undefined;

    const existing = cachedDb.businesses[idx];
    const merged: Business = {
      ...existing,
      ...updates,
      profileStrength: computeProfileStrength({ ...existing, ...updates }),
      updatedAt: new Date().toISOString(),
    };

    cachedDb.businesses[idx] = merged;
    saveDatabase(cachedDb);
    return merged;
  },

  claimBusiness(slug: string, claimCode: string, ownerPhone: string): boolean {
    cachedDb = loadDatabase();
    const biz = cachedDb.businesses.find((b) => b.slug === slug);
    if (!biz) return false;

    if (biz.claimCode && biz.claimCode.toLowerCase() === claimCode.trim().toLowerCase()) {
      biz.isClaimed = true;
      biz.ownerPhone = ownerPhone;
      biz.verificationLevel = 'L1';
      biz.updatedAt = new Date().toISOString();
      saveDatabase(cachedDb);
      return true;
    }
    return false;
  },

  recordEvent(businessId: string, eventType: 'view' | 'call' | 'whatsapp' | 'directions' | 'booking'): void {
    cachedDb = loadDatabase();
    const biz = cachedDb.businesses.find((b) => b.id === businessId);
    if (!biz) return;

    if (!biz.metrics) {
      biz.metrics = { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0, impressions: 0, lastWeekViews: 0, lastWeekCalls: 0, lastWeekWhatsapp: 0 };
    }

    if (eventType === 'view') biz.metrics.views++;
    else if (eventType === 'call') biz.metrics.calls++;
    else if (eventType === 'whatsapp') biz.metrics.whatsapp++;
    else if (eventType === 'directions') biz.metrics.directions++;
    else if (eventType === 'booking') biz.metrics.bookingRequests++;

    saveDatabase(cachedDb);
  },

  toggleAvailableNow(businessId: string, durationHours = 4): Business | undefined {
    cachedDb = loadDatabase();
    const biz = cachedDb.businesses.find((b) => b.id === businessId);
    if (!biz) return undefined;

    const isCurrentlyActive = biz.availableNowUntil && new Date(biz.availableNowUntil).getTime() > Date.now();
    if (isCurrentlyActive) {
      biz.availableNowUntil = undefined;
    } else {
      biz.availableNowUntil = new Date(Date.now() + durationHours * 3600e3).toISOString();
    }
    biz.updatedAt = new Date().toISOString();
    saveDatabase(cachedDb);
    return biz;
  },

  getReports(): ProblemReport[] {
    cachedDb = loadDatabase();
    return cachedDb.reports;
  },

  createReport(report: Partial<ProblemReport>): ProblemReport {
    cachedDb = loadDatabase();
    const newRep: ProblemReport = {
      id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId: report.businessId || '',
      businessName: report.businessName || '',
      reason: report.reason || 'other',
      details: report.details || '',
      sessionId: report.sessionId || 'session_anon',
      createdAt: new Date().toISOString(),
      status: 'OPEN',
    };
    cachedDb.reports.unshift(newRep);
    saveDatabase(cachedDb);
    return newRep;
  },

  resolveReport(reportId: string, action: 'DISMISSED' | 'SUSPENDED'): boolean {
    cachedDb = loadDatabase();
    const rep = cachedDb.reports.find((r) => r.id === reportId);
    if (!rep) return false;
    rep.status = action === 'SUSPENDED' ? 'RESOLVED' : 'DISMISSED';

    if (action === 'SUSPENDED') {
      const biz = cachedDb.businesses.find((b) => b.id === rep.businessId);
      if (biz) biz.status = 'SUSPENDED';
    }

    saveDatabase(cachedDb);
    return true;
  },

  getPayments(): PaymentRecord[] {
    cachedDb = loadDatabase();
    return cachedDb.payments;
  },

  createPayment(payload: Partial<PaymentRecord>): PaymentRecord {
    cachedDb = loadDatabase();
    const id = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newPay: PaymentRecord = {
      id,
      apiRef: payload.apiRef || `API_REF_${Date.now()}`,
      businessId: payload.businessId || '',
      businessName: payload.businessName || '',
      planId: payload.planId || 'RECOMMENDED',
      weeks: payload.weeks || 1,
      amountKes: payload.amountKes || 100,
      phone: payload.phone || '254700000000',
      state: payload.state || 'PENDING',
      receiptNumber: payload.receiptNumber || `R-2026-${Math.floor(100000 + Math.random() * 900000)}`,
      method: payload.method || 'STK_PUSH',
      mpesaRef: payload.mpesaRef,
      createdAt: new Date().toISOString(),
    };
    cachedDb.payments.unshift(newPay);
    saveDatabase(cachedDb);
    return newPay;
  },

  settlePayment(paymentId: string, success = true, mpesaRef?: string): PaymentRecord | undefined {
    cachedDb = loadDatabase();
    const payment = cachedDb.payments.find((p) => p.id === paymentId);
    if (!payment) return undefined;

    if (success) {
      payment.state = 'COMPLETE';
      payment.paidAt = new Date().toISOString();
      payment.mpesaRef = mpesaRef || `MPESA_${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      // Activate promotion on business
      const biz = cachedDb.businesses.find((b) => b.id === payment.businessId);
      if (biz) {
        const now = new Date();
        const durationMs = payment.weeks * 7 * 864e5;
        const currentEnds = biz.tierEndsAt ? new Date(biz.tierEndsAt).getTime() : 0;
        const startsAt = currentEnds > now.getTime() ? new Date(currentEnds) : now;
        const endsAt = new Date(startsAt.getTime() + durationMs);

        biz.activeTier = payment.planId;
        biz.tierStartsAt = startsAt.toISOString();
        biz.tierEndsAt = endsAt.toISOString();
        biz.updatedAt = now.toISOString();
      }
    } else {
      payment.state = 'FAILED';
      payment.failedReason = 'M-Pesa payment rejected or cancelled by user';
    }

    saveDatabase(cachedDb);
    return payment;
  },

  getServiceRequests(): ServiceRequest[] {
    cachedDb = loadDatabase();
    return cachedDb.serviceRequests;
  },

  createServiceRequest(payload: Partial<ServiceRequest>): ServiceRequest {
    cachedDb = loadDatabase();
    const newReq: ServiceRequest = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      query: payload.query || '',
      zone: payload.zone || 'all',
      contactPhone: payload.contactPhone,
      createdAt: new Date().toISOString(),
    };
    cachedDb.serviceRequests.unshift(newReq);
    saveDatabase(cachedDb);
    return newReq;
  },

  createBookingIntent(payload: Partial<BookingIntent>): BookingIntent {
    cachedDb = loadDatabase();
    const newBook: BookingIntent = {
      id: `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      businessId: payload.businessId || '',
      serviceName: payload.serviceName || 'General inquiry',
      day: payload.day || 'Today',
      time: payload.time || 'Afternoon',
      studentName: payload.studentName || 'Student',
      note: payload.note,
      createdAt: new Date().toISOString(),
    };
    if (!cachedDb.bookings) cachedDb.bookings = [];
    cachedDb.bookings.unshift(newBook);

    // Track on business metrics
    const biz = cachedDb.businesses.find((b) => b.id === payload.businessId);
    if (biz) {
      biz.metrics.bookingRequests = (biz.metrics.bookingRequests || 0) + 1;
    }

    saveDatabase(cachedDb);
    return newBook;
  },
};
