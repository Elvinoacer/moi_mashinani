import { queueNotice, queueAdmins, listingNotice } from './notifications';
import { nextProEnd, productLimitError, PRO_PRICE_KES } from './catalog-plan';
import { isPromotionPlan, promotionEndAfterPayment } from './payments';
import { attachMedia, mediaReferences, queueRemovedMedia } from './media-storage';
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

  async deleteBusiness(id: string, confirmationName: string, adminId: string): Promise<string[]> {
    return prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${id} FOR UPDATE`;
      const business = await tx.business.findUnique({where:{id}});
      if (!business) throw new ApiError(404, 'Business not found');
      if (confirmationName !== business.name) throw new ApiError(409, 'Type the current business name to confirm deletion');
      const pendingPayment = await tx.paymentRecord.findFirst({where:{businessId:id,state:{in:['CREATED','PENDING','PROCESSING']}}});
      if (pendingPayment) throw new ApiError(409, 'This business has a pending payment. Wait for it to complete or fail before deleting.');
      await queueRemovedMedia(tx,id,mediaReferences(business),[],adminId);
      await tx.businessMedia.updateMany({where:{businessId:id},data:{state:'DELETING'}});
      const assets = await tx.businessMedia.findMany({where:{businessId:id},select:{id:true}});
      await tx.verificationToken.deleteMany({where:{businessId:id}});
      await tx.notificationDelivery.updateMany({where:{sentAt:null,stoppedAt:null,notification:{OR:[{path:`/dashboard/${business.slug}`},{path:{startsWith:`/dashboard/${business.slug}?`}},{path:`/promote/${business.slug}`},{path:{startsWith:`/promote/${business.slug}?`}}]}},data:{stoppedAt:new Date(),error:'Business deleted'}});
      await queueNotice(tx,business.ownerId,`listing/${id}/deleted`,{kind:'LISTING_DELETED',title:`${business.name} has been deleted`,body:'An administrator permanently deleted your business listing and its bookings. Your owner account remains available. Contact support if you need help.',path:'/dashboard?notifications=1',button:'Open your account'},['EMAIL','PUSH'],id);
      await queueNotice(tx,adminId,`listing/${id}/deleted/admin`,{kind:'LISTING_DELETED',title:`Deleted ${business.name}`,body:'The business listing and its bookings were permanently deleted. Payment records and complaint history were retained.',path:'/admin?queue=listings',button:'Manage listings'},[]);
      await tx.pushDevice.updateMany({where:{scopeBusinessId:id},data:{enabled:false,token:null,enrollmentUntil:null}});
      const bookings = await tx.bookingIntent.findMany({where:{businessId:id,status:{in:['NEW','CONFIRMED']},requesterId:{not:null}}});
      for (const booking of bookings) await queueNotice(tx,booking.requesterId,`booking/${booking.id}/business-deleted`,{kind:'BOOKING_STATUS',title:'Your customer request was cancelled',body:`${business.name} has been removed from the directory. Your request for ${booking.serviceName} is no longer active.`,path:'/dashboard?notifications=1',button:'View my notifications'});
      await tx.bookingIntent.deleteMany({where:{businessId:id}});
      await tx.problemReport.updateMany({where:{businessId:id,status:'OPEN'},data:{status:'RESOLVED'}});
      await tx.businessAudit.create({data:{businessId:id,actorId:adminId,action:'DELETED',details:'Business listing and bookings removed'}});
      await tx.business.delete({where:{id}});
      return assets.map(asset => asset.id);
    },{maxWait:20000,timeout:30000});
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

    await queueAdmins(client, `listing/${id}/created`, {kind:'NEW_LISTING',title:created.status === 'PENDING' ? 'A new listing needs review' : 'A business has been enrolled',body:`${created.name} has been submitted. Review its details and verification status.`,path:created.status === 'PENDING' ? '/admin?queue=moderation':'/admin?queue=accounts',button:'Review listings'});
    await queueNotice(client,created.ownerId,`listing/${id}/created`,{kind:'LISTING_SUBMITTED',title:created.status === 'PENDING' ? 'Your listing is awaiting review' : 'Your business listing is live',body:created.status === 'PENDING' ? 'We have received your listing. Verify your email using your account invitation. We will notify you when your listing is reviewed.' : 'Verify your email using your account invitation, then add your profile, shop and product photos from the dashboard.',path:`/dashboard/${created.slug}`,button:'Open business dashboard'}, ['EMAIL','PUSH'], id);
    return mapPrismaBusiness(created);
  },

  async updateBusiness(id: string, updates: Partial<Business>, mediaAccountId?: string, audit?: {actorId:string;action:string;details?:string}): Promise<Business | undefined> {
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
        await queueRemovedMedia(tx, id, mediaReferences(mappedExisting), mediaReferences(merged), mediaAccountId);
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
      const identityFields: (keyof Business)[] = ['name','primaryCategory','phone','whatsapp','landmark','address','mapPin'];
      const identityChanged = identityFields.some(key => key in updates && (
        !(key === 'mapPin' && !mappedExisting.mapPin && !updates.mapPin) &&
        JSON.stringify(mappedExisting[key]) !== JSON.stringify(updates[key])
      ));
      if (existing.verificationLevel === 'L2' && identityChanged && updates.verificationLevel === undefined) prismaUpdateData.verificationLevel = 'L1';
      const updated = await tx.business.update({
        where: { id },
        data: prismaUpdateData,
      });
      if (audit) await tx.businessAudit.create({data:{businessId:id,actorId:audit.actorId,action:audit.action,details:audit.details}});
      if (identityChanged && existing.verificationLevel === 'L2' && updated.verificationLevel !== 'L2') {
        await tx.businessAudit.create({data:{businessId:id,actorId:mediaAccountId || null,action:'VERIFICATION_NEEDS_REVIEW',details:'Business identity or contact details were updated'}});

        await queueAdmins(tx,`listing/${id}/recheck/${updated.updatedAt.toISOString()}`,{kind:'VERIFICATION',title:'Business details require re-verification',body:`${updated.name} changed identity or contact details. Review before restoring its verified badge.`,path:'/admin?queue=listings',button:'Review business'});
      }
      if (existing.status === 'REJECTED' && updated.status === 'PENDING') {
        await queueAdmins(tx,`listing/${id}/resubmitted/${updated.updatedAt.toISOString()}`,{kind:'NEW_LISTING',title:'Corrected listing submitted for review',body:`${updated.name} was corrected and resubmitted. Review before approval.`,path:'/admin?queue=moderation',button:'Review corrected listing'});
      }
      if (existing.status !== updated.status) await listingNotice(tx,updated,`listing/${id}/status/${updated.updatedAt.toISOString()}`);
      else if (existing.verificationLevel !== updated.verificationLevel) await queueNotice(tx,updated.ownerId,`listing/${id}/verification/${updated.updatedAt.toISOString()}`,{kind:'VERIFICATION',title:updated.verificationLevel === 'L2' ? 'Your business is verified' : 'Your verification status changed',body:updated.verificationLevel === 'L2' ? 'Your verified badge is ready. Add clear profile and product photos, update your catalogue and keep your opening hours current.' : 'Open your dashboard to review your current verification status.',path:`/dashboard/${updated.slug}`,button:'Complete my profile'});
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

  async recordEvent(businessId: string, eventType: 'view' | 'call' | 'whatsapp' | 'directions' | 'booking' | 'impression', db: Prisma.TransactionClient = prisma): Promise<void> {
    const key = {view:'views',call:'calls',whatsapp:'whatsapp',directions:'directions',booking:'bookingRequests',impression:'impressions'}[eventType];
    if (!key) return;
    // Increment in SQL so simultaneous customer interactions cannot overwrite one another.
    await db.$executeRaw`
      UPDATE "Business" SET "metrics" = jsonb_set("metrics"::jsonb, ARRAY[${key}]::text[],
        to_jsonb(COALESCE(("metrics"->>${key})::int, 0) + 1)), "updatedAt" = NOW() WHERE "id" = ${businessId}`;
  },

  async recordImpressions(businessIds: string[], db: Prisma.TransactionClient = prisma): Promise<void> {
    const validIds = Array.from(new Set(businessIds.filter(Boolean))).slice(0, 30);
    if (!validIds.length) return;
    for (const id of validIds) {
      await db.$executeRaw`
        UPDATE "Business" SET "metrics" = jsonb_set("metrics"::jsonb, '{impressions}',
          to_jsonb(COALESCE(("metrics"->>'impressions')::int, 0) + 1)), "updatedAt" = NOW() WHERE "id" = ${id}`;
    }
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
    const created = await prisma.$transaction(async tx => {
    const created = await tx.problemReport.create({
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
    await queueAdmins(tx,`report/${id}`,{kind:'COMPLAINT',title:'A customer complaint needs review',body:`A complaint about ${created.businessName} has been submitted. Review the report privately before taking action.`,path:'/admin?queue=reports',button:'Review complaint'});
    return created;
    }, {maxWait:20000,timeout:30000});
    return mapPrismaReport(created);
  },

  async resolveReport(reportId: string, action: 'DISMISSED' | 'RESOLVED' | 'SUSPENDED'): Promise<boolean> {
    return prisma.$transaction(async tx => {
      const report = await tx.problemReport.findUnique({where:{id:reportId}});
      if (!report) return false;
      await tx.problemReport.update({where:{id:reportId},data:{status:action === 'DISMISSED' ? 'DISMISSED':'RESOLVED'}});
      if (action === 'SUSPENDED') {
        const business = await tx.business.update({where:{id:report.businessId},data:{status:'SUSPENDED',moderationReason:`Customer report: ${report.reason.replaceAll('_',' ')}`}});
        await listingNotice(tx,business,`report/${reportId}/suspension`);
        await tx.businessAudit.create({data:{businessId:business.id,actorId:null,action:'REPORT_SUSPENSION',details:`Customer report ${reportId}`}});
      }
      if (report.status !== 'RESOLVED' && report.status !== 'DISMISSED') await queueAdmins(tx,`report/${reportId}/resolved`,{kind:'COMPLAINT_RESOLVED',title:'A customer complaint was reviewed',body:`The complaint about ${report.businessName} has been reviewed. Action: ${action.toLowerCase()}.`,path:'/admin?queue=reports',button:'View moderation'});
      return true;
    }, {maxWait:20000,timeout:30000});
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
      if (!await tx.business.findUnique({where:{id:payload.businessId || ''},select:{id:true}})) throw new ApiError(404, 'Business not found');
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
    }, {maxWait:20000,timeout:30000});
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
      if (updates.state && current.state !== updates.state && ['FAILED','CANCELLED'].includes(updates.state)) {
        const business = await tx.business.findUnique({where:{id:current.businessId}});
        if (business) await queueNotice(tx,business.ownerId,`payment/${id}/${updates.state}`,{kind:'PAYMENT',title:'Your payment needs attention',body:'Your payment did not complete. Check its status in your dashboard before starting another payment.',path:`/dashboard/${business.slug}?tab=billing`,button:'Review payment'});
      }
      return mapPrismaPayment(await tx.paymentRecord.update({where:{id},data}));
    }, {maxWait:20000,timeout:30000});
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
        if (!isPromotionPlan(payment.planId)) throw new ApiError(400, 'Unknown promotion plan');
        // No paid time is lost: renewals queue after the current end, upgrades carry the remaining
        // value over as Featured time, and a late Recommended payment never interrupts Featured.
        const next = promotionEndAfterPayment(business, payment.planId, payment.weeks, now);
        await tx.business.update({where:{id:business.id},data:{activeTier:next.activeTier,tierStartsAt:next.tierStartsAt,tierEndsAt:next.tierEndsAt}});
      }
      await queueNotice(tx,business.ownerId,`payment/${id}/complete`,{kind:'PAYMENT',title:'Payment confirmed — your plan is active',body:`Your KES ${payment.amountKes} payment for ${payment.planId} has been verified. View your active plan and payment history in your dashboard.`,path:`/dashboard/${business.slug}?tab=billing`,button:'View my active plan'});
      await queueAdmins(tx,`payment/${id}/complete`,{kind:'PAYMENT',title:'A business payment was confirmed',body:`${business.name}: KES ${payment.amountKes} for ${payment.planId}.`,path:`/dashboard/${business.slug}?tab=billing`,button:'View payments'});
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
    const created = await prisma.$transaction(async tx => {
    const created = await tx.serviceRequest.create({
      data: {
        id,
        query: payload.query || '',
        zone: payload.zone || 'all',
        contactPhone: payload.contactPhone || null,
      },
    });
    await queueAdmins(tx,`request/${id}`,{kind:'SERVICE_REQUEST',title:'New service request or suggestion',body:`Someone is looking for: ${created.query}. Area: ${created.zone}. Open the admin dashboard to review and follow up.`,path:'/admin?queue=demand',button:'View request'});
    return created;
    }, {maxWait:20000,timeout:30000});
    return mapPrismaServiceRequest(created);
  },

  async createBookingIntent(payload: Partial<BookingIntent>, requesterId?: string): Promise<BookingIntent> {
    const id = `book_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const created = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "Business" WHERE "id" = ${payload.businessId || ''} FOR UPDATE`;
      const business = await tx.business.findUnique({where:{id:payload.businessId || ''}});
      if (!business) throw new ApiError(404, 'Business not found');
      const booking = await tx.bookingIntent.create({
        data: {
          id,
          businessId: payload.businessId || '',
          requesterId: requesterId || null,
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
        await Store.recordEvent(payload.businessId, 'booking', tx);
      }

      await queueNotice(tx,business.ownerId,`booking/${id}`,{kind:'BOOKING',title:`New customer request for ${business.name}`,body:`A customer has requested ${booking.serviceName} for ${booking.day} at ${booking.time}. Open your dashboard to review their contact details and respond.`,path:`/dashboard/${business.slug}?tab=bookings`,button:'View customer request'});
      await queueAdmins(tx,`booking/${id}`,{kind:'BOOKING',title:'New booking or customer inquiry',body:`${business.name || 'A business'} has received a customer request.`,path:`/dashboard/${business.slug}?tab=bookings`,button:'View customer requests'});
      if (requesterId) await queueNotice(tx,requesterId,`booking/${id}/submitted`,{kind:'BOOKING',title:'Your customer request was sent',body:`Your request for ${booking.serviceName} was sent to ${business.name || 'the business'}. This is a request, not a confirmed booking. We will notify you when the business updates it.`,path:'/dashboard?notifications=1',button:'View my notifications'});
      return booking;
    }, {maxWait:20000,timeout:30000});

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
