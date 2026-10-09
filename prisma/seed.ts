import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import {
  CATEGORIES,
  ZONES,
  SEED_BUSINESSES,
  SEED_REPORTS,
  SEED_PAYMENTS,
  SEED_SERVICE_REQUESTS,
} from '../src/lib/constants';

async function main() {
  console.log('🌱 Starting database seed into PostgreSQL...');

  if (process.env.NODE_ENV === 'production') throw new Error('Demo seed is disabled in production.');
  // Demo fixtures are added only when missing. Existing customer/business data is preserved.
  // 2. Seed Categories
  console.log('Seeding categories...');
  for (const cat of CATEGORIES) {
    await prisma.category.upsert({
      where: {id:cat.id}, update: {}, create: {
        id: cat.id,
        slug: cat.slug,
        name: cat.name,
        icon: cat.icon,
        description: cat.description,
        color: cat.color,
        count: cat.count || 0,
      },
    });
  }
  console.log(`✅ Seeded ${CATEGORIES.length} categories.`);

  // 3. Seed Zones
  console.log('Seeding zones...');
  for (const zone of ZONES) {
    await prisma.zone.upsert({
      where: {id:zone.id}, update: {}, create: {
        id: zone.id,
        slug: zone.slug,
        name: zone.name,
        landmarkHint: zone.landmarkHint,
        description: zone.description,
        center: zone.center ? JSON.parse(JSON.stringify(zone.center)) : undefined,
        walkTimeFromGate: zone.walkTimeFromGate,
        distanceFromGateMeters: zone.distanceFromGateMeters,
      },
    });
  }
  console.log(`✅ Seeded ${ZONES.length} zones.`);

  // 4. Seed Businesses
  console.log(`Seeding ${SEED_BUSINESSES.length} businesses...`);
  const now = Date.now();
  for (const b of SEED_BUSINESSES) {
    let availableUntil: Date | null = null;
    if (b.availableNowUntil) {
      availableUntil = new Date(now + 4 * 3600e3); // 4 hours active window
    }

    let tierStartsAt: Date | null = null;
    let tierEndsAt: Date | null = null;
    if (b.activeTier && b.activeTier !== 'NONE') {
      tierStartsAt = b.tierStartsAt ? new Date(b.tierStartsAt) : new Date(now - 864e5);
      tierEndsAt = new Date(now + 7 * 864e5); // Active for 7 days
    }

    const bizId = b.id || b.slug;
    await prisma.business.upsert({
      where: {id:bizId}, update: {}, create: {
        id: bizId,
        name: b.name,
        slug: b.slug,
        tagline: b.tagline,
        description: b.description,
        primaryCategory: b.primaryCategory,
        extraCategories: b.extraCategories || [],
        tags: b.tags || [],
        serviceModes: b.serviceModes || ['at_shop'],
        phone: b.phone,
        whatsapp: b.whatsapp || b.phone,
        campus: b.campus || 'Moi University (Kesses Main Campus)',
        zone: b.zone,
        servesZones: b.servesZones || [b.zone],
        landmark: b.landmark,
        address: b.address || null,
        mapPin: b.mapPin ? JSON.parse(JSON.stringify(b.mapPin)) : undefined,
        walkTime: b.walkTime || null,
        hours: JSON.parse(JSON.stringify(b.hours || {})),
        services: JSON.parse(JSON.stringify(b.services || [])),
        priceLevel: typeof b.priceLevel === 'number' ? b.priceLevel : 1,
        studentDiscount: b.studentDiscount || null,
        photos: b.photos || [],
        coverPhoto: b.coverPhoto || b.photos?.[0] || '',
        activeTier: b.activeTier || 'NONE',
        tierStartsAt,
        tierEndsAt,
        availableNowUntil: availableUntil,
        isTemporarilyClosed: Boolean(b.isTemporarilyClosed),
        temporarilyClosedUntil: b.temporarilyClosedUntil ? new Date(b.temporarilyClosedUntil) : null,
        status: b.status || 'ACTIVE',
        verificationLevel: b.verificationLevel || 'L0',
        claimCode: b.claimCode || null,
        isClaimed: Boolean(b.isClaimed),
        ownerPhone: b.ownerPhone || null,
        ambassadorId: b.ambassadorId || null,
        profileStrength: typeof b.profileStrength === 'number' ? b.profileStrength : 0,
        metrics: JSON.parse(JSON.stringify(b.metrics || {
          views: 0,
          calls: 0,
          whatsapp: 0,
          directions: 0,
          bookingRequests: 0,
          impressions: 0,
          lastWeekViews: 0,
          lastWeekCalls: 0,
          lastWeekWhatsapp: 0,
        })),
        createdAt: b.createdAt ? new Date(b.createdAt) : new Date(),
        updatedAt: b.updatedAt ? new Date(b.updatedAt) : new Date(),
      },
    });
  }
  console.log(`✅ Seeded ${SEED_BUSINESSES.length} businesses.`);

  // 5. Seed Reports
  console.log(`Seeding ${SEED_REPORTS.length} reports...`);
  for (const r of SEED_REPORTS) {
    await prisma.problemReport.upsert({
      where: {id:r.id}, update: {}, create: {
        id: r.id,
        businessId: r.businessId,
        businessName: r.businessName,
        reason: r.reason,
        details: r.details || null,
        sessionId: r.sessionId || 'session_anon',
        status: r.status || 'OPEN',
        createdAt: r.createdAt ? new Date(r.createdAt) : new Date(),
      },
    });
  }
  console.log(`✅ Seeded ${SEED_REPORTS.length} reports.`);

  // 6. Seed Payments
  console.log(`Seeding payments...`);
  const initialPayments = [
    {
      id: 'pay_1791280750154_7amz',
      apiRef: 'API_REF_1791280750154',
      businessId: 'biz_kevin_phones',
      businessName: 'Kevin Phones & Laptops',
      planId: 'FEATURED',
      weeks: 1,
      amountKes: 200,
      phone: '254712345678',
      state: 'COMPLETE',
      receiptNumber: 'R-2026-361404',
      method: 'STK_PUSH',
      createdAt: new Date('2026-10-06T09:59:10.154Z'),
      paidAt: new Date('2026-10-06T09:59:21.703Z'),
      mpesaRef: 'RKL8999ABC',
    },
    ...SEED_PAYMENTS.map((p) => ({
      id: p.id,
      apiRef: p.apiRef,
      businessId: p.businessId,
      businessName: p.businessName,
      planId: p.planId,
      weeks: p.weeks,
      amountKes: p.amountKes,
      phone: p.phone,
      state: p.state,
      receiptNumber: p.receiptNumber || null,
      method: p.method,
      mpesaRef: p.mpesaRef || null,
      failedReason: p.failedReason || null,
      createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
      paidAt: p.paidAt ? new Date(p.paidAt) : null,
    })),
  ];

  for (const p of initialPayments) {
    await prisma.paymentRecord.upsert({
      where: {id:p.id}, update: {}, create: p,
    });
  }
  console.log(`✅ Seeded ${initialPayments.length} payments.`);

  // 7. Seed Service Requests
  console.log(`Seeding ${SEED_SERVICE_REQUESTS.length} service requests...`);
  for (const sr of SEED_SERVICE_REQUESTS) {
    await prisma.serviceRequest.upsert({
      where: {id:sr.id}, update: {}, create: {
        id: sr.id,
        query: sr.query,
        zone: sr.zone,
        contactPhone: sr.contactPhone || null,
        createdAt: sr.createdAt ? new Date(sr.createdAt) : new Date(),
      },
    });
  }
  console.log(`✅ Seeded ${SEED_SERVICE_REQUESTS.length} service requests.`);

  console.log('🎉 Database seeding completed successfully with clean canonical data!');
}

main()
  .catch((err) => {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
