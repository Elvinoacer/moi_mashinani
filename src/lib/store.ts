import { nextProEnd, productLimitError, PRO_PRICE_KES } from './catalog-plan';
import { attachMedia, mediaReferences } from './media-storage';
import { randomUUID } from 'node:crypto';
import { ApiError } from './api';
import { Prisma } from '../generated/prisma/client';
import { prisma } from './prisma';
import type {
  Business as PrismaBusiness,
  ProblemReport as PrismaProblemReport,
  PaymentRecord as PrismaPaymentRecord,
  ServiceRequest as PrismaServiceRequest,
  BookingIntent as PrismaBookingIntent,
} from '../generated/prisma/client';
import {
  Business,
  ProblemReport,
  PaymentRecord,
  ServiceRequest,
  BookingIntent,
  Tier,
  ListingStatus,
  VerificationLevel,
  BusinessHours,
  ServiceItem,
  BusinessMetrics,
  Category,
  Zone,
} from './types';
import {
  ZONES,
  CATEGORIES,
} from './constants';

export { ZONES, CATEGORIES };

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
  if (b.mapPin && Number.isFinite(b.mapPin.lat) && Number.isFinite(b.mapPin.lng)) score += 5;
  if (b.tagline || b.studentDiscount) score += 5;
  return Math.min(100, score);
}

export function mapPrismaBusiness(b: PrismaBusiness): Business {
  const existingMetrics = (b.metrics as unknown as Partial<BusinessMetrics>) || {};
  const metrics: BusinessMetrics = {
    views: existingMetrics.views || 0,
    calls: existingMetrics.calls || 0,
    whatsapp: existingMetrics.whatsapp || 0,
    directions: existingMetrics.directions || 0,
    bookingRequests: existingMetrics.bookingRequests || 0,
    impressions: existingMetrics.impressions || 0,
    lastWeekViews: existingMetrics.lastWeekViews || 0,
    lastWeekCalls: existingMetrics.lastWeekCalls || 0,
    lastWeekWhatsapp: existingMetrics.lastWeekWhatsapp || 0,
  };

  return {
    id: b.id,
    name: b.name,
    slug: b.slug,
    tagline: b.tagline,
    description: b.description,
    primaryCategory: b.primaryCategory,
    extraCategories: Array.isArray(b.extraCategories) ? b.extraCategories : [],
    tags: Array.isArray(b.tags) ? b.tags : [],
    serviceModes: (Array.isArray(b.serviceModes) ? b.serviceModes : ['at_shop']) as Business['serviceModes'],
    phone: b.phone,
    whatsapp: b.whatsapp,
    campus: b.campus,
    zone: b.zone,
    servesZones: Array.isArray(b.servesZones) ? b.servesZones : [],
    landmark: b.landmark,
    address: b.address || undefined,
    mapPin: b.mapPin ? (b.mapPin as unknown as { lat: number; lng: number }) : undefined,
    walkTime: b.walkTime || undefined,
    hours: (b.hours || {}) as unknown as BusinessHours,
    services: (Array.isArray(b.services) ? b.services : []) as unknown as ServiceItem[],
    priceLevel: (typeof b.priceLevel === 'number' ? b.priceLevel : 1) as 1 | 2 | 3,
    studentDiscount: b.studentDiscount || undefined,
    photos: Array.isArray(b.photos) ? b.photos : [],
    coverPhoto: b.coverPhoto || '',
    activeTier: (b.activeTier || 'NONE') as Tier,
    tierEndsAt: b.tierEndsAt ? new Date(b.tierEndsAt).toISOString() : undefined,
    tierStartsAt: b.tierStartsAt ? new Date(b.tierStartsAt).toISOString() : undefined,
    proStartsAt: b.proStartsAt?.toISOString(),
    proEndsAt: b.proEndsAt?.toISOString(),
    availableNowUntil: b.availableNowUntil ? new Date(b.availableNowUntil).toISOString() : undefined,
    isTemporarilyClosed: Boolean(b.isTemporarilyClosed),
    temporarilyClosedUntil: b.temporarilyClosedUntil ? new Date(b.temporarilyClosedUntil).toISOString() : undefined,
    status: (b.status || 'PENDING') as ListingStatus,
    verificationLevel: (b.verificationLevel || 'L0') as VerificationLevel,
    moderationReason: b.moderationReason || undefined,
    claimCode: b.claimCode || undefined,
    isClaimed: Boolean(b.isClaimed),
    ownerPhone: b.ownerPhone || undefined,
    ownerId: b.ownerId || undefined,
    ownerEmail: b.ownerEmail || undefined,
    ownerName: b.ownerName || undefined,
    invitationSentAt: b.invitationSentAt?.toISOString(),
    invitationError: b.invitationError || undefined,
    ambassadorId: b.ambassadorId || undefined,
    profileStrength: typeof b.profileStrength === 'number' ? b.profileStrength : 0,
    metrics,
    createdAt: b.createdAt ? new Date(b.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: b.updatedAt ? new Date(b.updatedAt).toISOString() : new Date().toISOString(),
  };
}

export function mapPrismaReport(r: PrismaProblemReport): ProblemReport {
  return {
    id: r.id,
    businessId: r.businessId,
    businessName: r.businessName,
    reason: r.reason as ProblemReport['reason'],
    details: r.details || undefined,
    sessionId: r.sessionId,
    createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    status: r.status as ProblemReport['status'],
  };
}

export function mapPrismaPayment(p: PrismaPaymentRecord): PaymentRecord {
  return {
    id: p.id,
    apiRef: p.apiRef,
    businessId: p.businessId,
    businessName: p.businessName,
    planId: p.planId as PaymentRecord['planId'],
    weeks: p.weeks,
    amountKes: p.amountKes,
    phone: p.phone,
    state: p.state as PaymentRecord['state'],
    receiptNumber: p.receiptNumber || undefined,
    method: p.method as PaymentRecord['method'],
    mpesaRef: p.mpesaRef || undefined,
    failedReason: p.failedReason || undefined,
    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
    paidAt: p.paidAt ? new Date(p.paidAt).toISOString() : undefined,
    provider: p.provider, currency: p.currency,
    checkoutId: p.checkoutId || undefined, checkoutUrl: p.checkoutUrl || undefined,
    checkoutSignature: p.checkoutSignature || undefined,
    providerInvoiceId: p.providerInvoiceId || undefined, providerRef: p.providerRef || undefined,
    verifiedAt: p.verifiedAt?.toISOString(), quoteTier: p.quoteTier || undefined,
    quoteTierEndsAt: p.quoteTierEndsAt?.toISOString(),
  };
}

export function mapPrismaServiceRequest(sr: PrismaServiceRequest): ServiceRequest {
  return {
    id: sr.id,
    query: sr.query,
    zone: sr.zone,
    contactPhone: sr.contactPhone || undefined,
    createdAt: sr.createdAt ? new Date(sr.createdAt).toISOString() : new Date().toISOString(),
  };
}

export function mapPrismaBooking(bk: PrismaBookingIntent): BookingIntent {
  return {
    id: bk.id,
    businessId: bk.businessId,
    serviceName: bk.serviceName,
    day: bk.day,
    time: bk.time,
    studentName: bk.studentName,
    note: bk.note || undefined,
    contactPhone: bk.contactPhone || undefined,
    status: bk.status as BookingIntent['status'],
    createdAt: bk.createdAt ? new Date(bk.createdAt).toISOString() : new Date().toISOString(),
  };
}

export const Store = {
  async getBusinesses(): Promise<Business[]> {
    const records = await prisma.business.findMany({
      orderBy: { createdAt: 'desc' }, include: { owner: { select: { emailVerifiedAt: true } } },
    });
    return records.map(record => ({...mapPrismaBusiness(record), emailVerifiedAt: record.owner?.emailVerifiedAt?.toISOString()}));
  },

  async getBusinessBySlug(slug: string): Promise<Business | undefined> {
    const record = await prisma.business.findUnique({
      where: { slug },
    });
    return record ? mapPrismaBusiness(record) : undefined;
  },

  async getBusinessById(id: string): Promise<Business | undefined> {
    const record = await prisma.business.findUnique({
      where: { id },
    });
    return record ? mapPrismaBusiness(record) : undefined;
  },

  async createBusiness(payload: Partial<Business>, client: Prisma.TransactionClient = prisma): Promise<Business> {
    const id = payload.id || `biz_${randomUUID()}`;
    const baseSlug = (payload.name || 'business')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const suffix = randomUUID().slice(0,8);
    const slug = payload.slug || `${baseSlug}-${suffix}`;

    const defaultHours: BusinessHours = {
      Monday: { open: '08:00', close: '20:00' },
      Tuesday: { open: '08:00', close: '20:00' },
      Wednesday: { open: '08:00', close: '20:00' },
      Thursday: { open: '08:00', close: '20:00' },
      Friday: { open: '08:00', close: '20:00' },
      Saturday: { open: '08:30', close: '20:00' },
      Sunday: { open: '10:00', close: '18:00' },
    };

    const defaultMetrics: BusinessMetrics = {
      views: 0,
      calls: 0,
      whatsapp: 0,
      directions: 0,
      bookingRequests: 0,
      impressions: 0,
      lastWeekViews: 0,
      lastWeekCalls: 0,
      lastWeekWhatsapp: 0,
    };

    const strength = computeProfileStrength(payload);
    const zoneSlug = payload.zone || 'kesses-centre';

    const created = await client.business.create({
      data: {
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
        campus: payload.campus || 'Moi University (Kesses Main Campus)',
        zone: zoneSlug,
        servesZones: payload.servesZones || [zoneSlug],
        landmark: payload.landmark || 'Near Campus Gate',
        address: payload.address || null,
        mapPin: payload.mapPin ? JSON.parse(JSON.stringify(payload.mapPin)) : undefined,
        walkTime: payload.walkTime || null,
        hours: JSON.parse(JSON.stringify(payload.hours || defaultHours)),
        services: JSON.parse(JSON.stringify(payload.services || [])),
        priceLevel: payload.priceLevel || 1,
        studentDiscount: payload.studentDiscount || null,
        photos: payload.photos || [],
        coverPhoto: payload.coverPhoto || payload.photos?.[0] || '',
        activeTier: payload.activeTier || 'NONE',
        tierStartsAt: payload.tierStartsAt ? new Date(payload.tierStartsAt) : null,
        tierEndsAt: payload.tierEndsAt ? new Date(payload.tierEndsAt) : null,
        availableNowUntil: payload.availableNowUntil ? new Date(payload.availableNowUntil) : null,
        isTemporarilyClosed: Boolean(payload.isTemporarilyClosed),
        temporarilyClosedUntil: payload.temporarilyClosedUntil ? new Date(payload.temporarilyClosedUntil) : null,
        status: payload.status || 'PENDING',
        verificationLevel: payload.verificationLevel || 'L0',
        claimCode: payload.claimCode || null,
        isClaimed: Boolean(payload.isClaimed),
        ownerPhone: payload.ownerPhone || null,
        ownerId: payload.ownerId || null, ownerEmail: payload.ownerEmail || null, ownerName: payload.ownerName || null,
        ambassadorId: payload.ambassadorId || null,
        profileStrength: strength,
        metrics: JSON.parse(JSON.stringify(payload.metrics || defaultMetrics)),
      },
    });

    return mapPrismaBusiness(created);
  },

  async updateBusiness(id: string, updates: Partial<Business>, mediaAccountId?: string): Promise<Business | undefined> {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${id} FOR UPDATE`;
      const existing = await tx.business.findUnique({ where: { id } });
      if (!existing) return undefined;

      const mappedExisting = mapPrismaBusiness(existing);
      const merged = { ...mappedExisting, ...updates };
      const limitError = updates.services !== undefined ? productLimitError(mappedExisting, mappedExisting.services, updates.services) : undefined;
      if (limitError) throw new ApiError(409, limitError);
      if (updates.services !== undefined || updates.photos !== undefined || updates.coverPhoto !== undefined) {
        await attachMedia(tx, id, mediaReferences(mappedExisting), mediaReferences(merged), mediaAccountId);
      }
      const newStrength = computeProfileStrength(merged);

      const prismaUpdateData: Record<string, unknown> = {};
      if (updates.name !== undefined) prismaUpdateData.name = updates.name;
      if (updates.slug !== undefined) prismaUpdateData.slug = updates.slug;
      if (updates.tagline !== undefined) prismaUpdateData.tagline = updates.tagline;
      if (updates.description !== undefined) prismaUpdateData.description = updates.description;
      if (updates.primaryCategory !== undefined) prismaUpdateData.primaryCategory = updates.primaryCategory;
      if (updates.extraCategories !== undefined) prismaUpdateData.extraCategories = updates.extraCategories;
      if (updates.tags !== undefined) prismaUpdateData.tags = updates.tags;
      if (updates.serviceModes !== undefined) prismaUpdateData.serviceModes = updates.serviceModes;
      if (updates.phone !== undefined) prismaUpdateData.phone = updates.phone;
      if (updates.whatsapp !== undefined) prismaUpdateData.whatsapp = updates.whatsapp;
      if (updates.campus !== undefined) prismaUpdateData.campus = updates.campus;
      if (updates.zone !== undefined) prismaUpdateData.zone = updates.zone;
      if (updates.servesZones !== undefined) prismaUpdateData.servesZones = updates.servesZones;
      if (updates.landmark !== undefined) prismaUpdateData.landmark = updates.landmark;
      if (updates.address !== undefined) prismaUpdateData.address = updates.address;
      if ('mapPin' in updates) prismaUpdateData.mapPin = updates.mapPin ? JSON.parse(JSON.stringify(updates.mapPin)) : Prisma.DbNull;
      if (updates.walkTime !== undefined) prismaUpdateData.walkTime = updates.walkTime;
      if (updates.hours !== undefined) prismaUpdateData.hours = JSON.parse(JSON.stringify(updates.hours));
      if (updates.services !== undefined) prismaUpdateData.services = JSON.parse(JSON.stringify(updates.services));
      if (updates.priceLevel !== undefined) prismaUpdateData.priceLevel = updates.priceLevel;
      if (updates.studentDiscount !== undefined) prismaUpdateData.studentDiscount = updates.studentDiscount;
      if (updates.photos !== undefined) prismaUpdateData.photos = updates.photos;
      if (updates.coverPhoto !== undefined) prismaUpdateData.coverPhoto = updates.coverPhoto;
      if (updates.activeTier !== undefined) prismaUpdateData.activeTier = updates.activeTier;
      if (updates.tierEndsAt !== undefined) prismaUpdateData.tierEndsAt = updates.tierEndsAt ? new Date(updates.tierEndsAt) : null;
      if (updates.tierStartsAt !== undefined) prismaUpdateData.tierStartsAt = updates.tierStartsAt ? new Date(updates.tierStartsAt) : null;
      if (updates.availableNowUntil !== undefined) prismaUpdateData.availableNowUntil = updates.availableNowUntil ? new Date(updates.availableNowUntil) : null;
      if (updates.isTemporarilyClosed !== undefined) prismaUpdateData.isTemporarilyClosed = updates.isTemporarilyClosed;
      if (updates.temporarilyClosedUntil !== undefined) prismaUpdateData.temporarilyClosedUntil = updates.temporarilyClosedUntil ? new Date(updates.temporarilyClosedUntil) : null;
      if (updates.status !== undefined) prismaUpdateData.status = updates.status;
      if (updates.verificationLevel !== undefined) prismaUpdateData.verificationLevel = updates.verificationLevel;
      if (updates.moderationReason !== undefined) prismaUpdateData.moderationReason = updates.moderationReason || null;
      if (updates.claimCode !== undefined) prismaUpdateData.claimCode = updates.claimCode;
      if (updates.isClaimed !== undefined) prismaUpdateData.isClaimed = updates.isClaimed;
      if (updates.ownerPhone !== undefined) prismaUpdateData.ownerPhone = updates.ownerPhone;
      if (updates.ambassadorId !== undefined) prismaUpdateData.ambassadorId = updates.ambassadorId;
      if (updates.metrics !== undefined) prismaUpdateData.metrics = JSON.parse(JSON.stringify(updates.metrics));
      prismaUpdateData.profileStrength = newStrength;

      const updated = await tx.business.update({
        where: { id },
        data: prismaUpdateData,
      });
      return mapPrismaBusiness(updated);
    }, {maxWait:20000,timeout:30000});
  },

  async claimBusiness(slug: string, claimCode: string, ownerPhone: string): Promise<boolean> {
    const biz = await prisma.business.findUnique({ where: { slug } });
    if (!biz) return false;

    if (biz.claimCode && biz.claimCode.toLowerCase() === claimCode.trim().toLowerCase()) {
      await prisma.business.update({
        where: { id: biz.id },
        data: {
          isClaimed: true,
          ownerPhone,
          verificationLevel: 'L1',
        },
      });
      return true;
    }
    return false;
  },

  async recordEvent(businessId: string, eventType: 'view' | 'call' | 'whatsapp' | 'directions' | 'booking'): Promise<void> {
    const key = {view:'views',call:'calls',whatsapp:'whatsapp',directions:'directions',booking:'bookingRequests'}[eventType];
    if (!key) return;
    // Increment in SQL so simultaneous customer interactions cannot overwrite one another.
    await prisma.$executeRaw`
      UPDATE "Business" SET "metrics" = jsonb_set("metrics"::jsonb, ARRAY[${key}]::text[],
        to_jsonb(COALESCE(("metrics"->>${key})::int, 0) + 1)), "updatedAt" = NOW() WHERE "id" = ${businessId}`;
  },

  async toggleAvailableNow(businessId: string, durationHours = 4): Promise<Business | undefined> {
    const biz = await prisma.business.findUnique({ where: { id: businessId } });
    if (!biz) return undefined;

    const isCurrentlyActive = biz.availableNowUntil && new Date(biz.availableNowUntil).getTime() > Date.now();
    const newUntil = isCurrentlyActive ? null : new Date(Date.now() + durationHours * 3600e3);

    const updated = await prisma.business.update({
      where: { id: businessId },
      data: { availableNowUntil: newUntil },
    });
    return mapPrismaBusiness(updated);
  },

  async getReports(): Promise<ProblemReport[]> {
    const records = await prisma.problemReport.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapPrismaReport);
  },

  async createReport(report: Partial<ProblemReport>): Promise<ProblemReport> {
    const id = `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await prisma.problemReport.create({
      data: {
        id,
        businessId: report.businessId || '',
        businessName: report.businessName || '',
        reason: report.reason || 'other',
        details: report.details || null,
        sessionId: report.sessionId || 'session_anon',
        status: 'OPEN',
      },
    });
    return mapPrismaReport(created);
  },

  async resolveReport(reportId: string, action: 'DISMISSED' | 'RESOLVED' | 'SUSPENDED'): Promise<boolean> {
    return prisma.$transaction(async tx => {
      const report = await tx.problemReport.findUnique({where:{id:reportId}});
      if (!report) return false;
      await tx.problemReport.update({where:{id:reportId},data:{status:action === 'DISMISSED' ? 'DISMISSED':'RESOLVED'}});
      if (action === 'SUSPENDED') await tx.business.update({where:{id:report.businessId},data:{status:'SUSPENDED',moderationReason:`Customer report: ${report.reason.replaceAll('_',' ')}`}});
      return true;
    });
  },

  async getPayments(): Promise<PaymentRecord[]> {
    const records = await prisma.paymentRecord.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapPrismaPayment);
  },

  async getPaymentById(id: string): Promise<PaymentRecord | undefined> {
    const record = await prisma.paymentRecord.findUnique({where:{id}});
    return record ? mapPrismaPayment(record) : undefined;
  },

  async getPaymentByApiRef(apiRef: string): Promise<PaymentRecord | undefined> {
    const record = await prisma.paymentRecord.findUnique({where:{apiRef}});
    return record ? mapPrismaPayment(record) : undefined;
  },

  async createPayment(payload: Partial<PaymentRecord>): Promise<PaymentRecord> {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${payload.businessId || ''} FOR UPDATE`;
      if (payload.method === 'INTASEND_CHECKOUT') {
        const pending = await tx.paymentRecord.findFirst({where:{businessId:payload.businessId,method:'INTASEND_CHECKOUT',state:{in:['CREATED','PENDING','PROCESSING']}}});
        if (pending) throw new ApiError(409,'A payment is already pending for this business. Check its status or retry it.');
      }
      const created = await tx.paymentRecord.create({data:{
        id: payload.id || `pay_${randomUUID()}`,apiRef:payload.apiRef || randomUUID(),
        businessId:payload.businessId || '',businessName:payload.businessName || '',
        planId:payload.planId || 'RECOMMENDED',weeks:payload.weeks ?? 1,amountKes:payload.amountKes ?? 100,
        phone:payload.phone || '',state:payload.state || 'CREATED',method:payload.method || 'INTASEND_CHECKOUT',
        provider:payload.provider || 'INTASEND',currency:payload.currency || 'KES',
        checkoutId:payload.checkoutId,checkoutUrl:payload.checkoutUrl,checkoutSignature:payload.checkoutSignature,
        quoteTier:payload.quoteTier,quoteTierEndsAt:payload.quoteTierEndsAt ? new Date(payload.quoteTierEndsAt) : null,
      }});
      return mapPrismaPayment(created);
    });
  },

  async updatePayment(id: string, updates: Partial<PaymentRecord>): Promise<PaymentRecord | undefined> {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentRecord" WHERE "id" = ${id} FOR UPDATE`;
      const current = await tx.paymentRecord.findUnique({where:{id}});
      if (!current) return undefined;
      if (current.state === 'COMPLETE') return mapPrismaPayment(current);
      const data: Prisma.PaymentRecordUpdateInput = {};
      for (const key of ['state','checkoutId','checkoutUrl','checkoutSignature','failedReason','providerRef'] as const) {
        if (updates[key] !== undefined) data[key] = updates[key];
      }
      // Completion must always pass through confirmVerifiedPayment and its atomic activation.
      if (data.state === 'COMPLETE') throw new ApiError(400,'Verified completion is required');
      return mapPrismaPayment(await tx.paymentRecord.update({where:{id},data}));
    });
  },

  async confirmVerifiedPayment(id: string, proof: {invoiceId: string; providerRef?: string; state: string; failedReason?: string}): Promise<PaymentRecord | undefined> {
    if (proof.state !== 'COMPLETE' || !proof.invoiceId) throw new ApiError(400,'A verified complete invoice is required');
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "PaymentRecord" WHERE "id" = ${id} FOR UPDATE`;
      const payment = await tx.paymentRecord.findUnique({where:{id}});
      if (!payment) return undefined;
      if (payment.state === 'COMPLETE') return mapPrismaPayment(payment);
      if (payment.method !== 'INTASEND_CHECKOUT' || payment.provider !== 'INTASEND') throw new ApiError(400,'Only verified IntaSend payments can activate promotions');
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${payment.businessId} FOR UPDATE`;
      const business = await tx.business.findUniqueOrThrow({where:{id:payment.businessId}});
      const now = new Date();
      if (payment.planId === 'PRO') {
        if (payment.amountKes !== PRO_PRICE_KES || payment.currency !== 'KES' || payment.weeks !== 1) throw new ApiError(400, 'Invalid Pro payment amount or duration');
        await tx.business.update({where:{id:business.id},data:{
          proStartsAt: business.proEndsAt && business.proEndsAt > now ? business.proStartsAt : now,
          proEndsAt: nextProEnd(business.proEndsAt, now),
        }});
      } else {
      const active = business.tierEndsAt && business.tierEndsAt > now;
      const sameTier = active && business.activeTier === payment.planId;
      // A late lower-tier payment cannot erase an already-active Featured plan.
      if (!(active && business.activeTier === 'FEATURED' && payment.planId === 'RECOMMENDED')) {
        const start = sameTier ? business.tierEndsAt! : now;
        await tx.business.update({where:{id:business.id},data:{activeTier:payment.planId,tierStartsAt:sameTier ? business.tierStartsAt : now,tierEndsAt:new Date(start.getTime()+payment.weeks*7*864e5)}});
      } else {
        // Preserve the purchased Recommended entitlement after the Featured term by adding its value as Featured time.
        await tx.business.update({where:{id:business.id},data:{tierEndsAt:new Date(business.tierEndsAt!.getTime()+payment.weeks*7*864e5/2)}});
      }
      }
      return mapPrismaPayment(await tx.paymentRecord.update({where:{id},data:{state:'COMPLETE',providerInvoiceId:proof.invoiceId,providerRef:proof.providerRef,mpesaRef:proof.providerRef,receiptNumber:proof.invoiceId,paidAt:now,verifiedAt:now,failedReason:null}}));
    }, {maxWait:20000,timeout:30000});
  },

  async getServiceRequests(): Promise<ServiceRequest[]> {
    const records = await prisma.serviceRequest.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return records.map(mapPrismaServiceRequest);
  },

  async createServiceRequest(payload: Partial<ServiceRequest>): Promise<ServiceRequest> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await prisma.serviceRequest.create({
      data: {
        id,
        query: payload.query || '',
        zone: payload.zone || 'all',
        contactPhone: payload.contactPhone || null,
      },
    });
    return mapPrismaServiceRequest(created);
  },

  async createBookingIntent(payload: Partial<BookingIntent>): Promise<BookingIntent> {
    const id = `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await prisma.bookingIntent.create({
      data: {
        id,
        businessId: payload.businessId || '',
        serviceName: payload.serviceName || 'General inquiry',
        day: payload.day || 'Today',
        time: payload.time || 'Afternoon',
        studentName: payload.studentName || 'Student',
        note: payload.note || null,
        contactPhone: payload.contactPhone || null,
        status: 'NEW',
      },
    });

    if (payload.businessId) {
      await Store.recordEvent(payload.businessId, 'booking');
    }

    return mapPrismaBooking(created);
  },

  async getBookings(businessIds: string[]): Promise<BookingIntent[]> {
    const records = await prisma.bookingIntent.findMany({where:{businessId:{in:businessIds}},orderBy:{createdAt:'desc'}});
    return records.map(mapPrismaBooking);
  },

  async getCategories(): Promise<Category[]> {
    const businesses = await prisma.business.findMany({
      where: { status: 'ACTIVE', isTemporarilyClosed: false },
      select: { primaryCategory: true, extraCategories: true },
    });
    const counts = new Map<string, number>();
    for (const business of businesses) {
      for (const slug of new Set([business.primaryCategory, ...business.extraCategories])) {
        counts.set(slug, (counts.get(slug) ?? 0) + 1);
      }
    }
    return CATEGORIES.map(category => ({ ...category, count: counts.get(category.slug) ?? 0 }));
  },

  async getZones(): Promise<Zone[]> {
    const records = await prisma.zone.findMany({
      orderBy: { name: 'asc' },
    });
    return records.map((z) => ({
      id: z.id,
      slug: z.slug,
      name: z.name,
      landmarkHint: z.landmarkHint,
      description: z.description,
      center: z.center ? (z.center as unknown as { lat: number; lng: number }) : undefined,
      walkTimeFromGate: z.walkTimeFromGate || undefined,
      distanceFromGateMeters: z.distanceFromGateMeters || undefined,
    }));
  },
};
