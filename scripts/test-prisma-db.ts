import 'dotenv/config';
import { prisma } from '../src/lib/prisma';
import { Store } from '../src/lib/store';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${msg}`);
  }
}

async function runPrismaVerification() {
  console.log('--- RUNNING PRISMA & POSTGRESQL VERIFICATION SUITE ---');

  // 1. Verify Prisma connection & row counts
  const bizCount = await prisma.business.count();
  assert(bizCount >= 12, `PostgreSQL has the canonical seeded businesses (found: ${bizCount})`);

  const catCount = await prisma.category.count();
  assert(catCount === 12, `PostgreSQL has 12 categories (found: ${catCount})`);

  const zoneCount = await prisma.zone.count();
  assert(zoneCount === 8, `PostgreSQL has 8 zones (found: ${zoneCount})`);

  // 2. Test Store.getBusinesses() via Prisma
  const businesses = await Store.getBusinesses();
  assert(businesses.length === bizCount, `Store.getBusinesses() returned ${businesses.length} records`);

  // 3. Test Store.getCategories() and Store.getZones()
  const dbCategories = await Store.getCategories();
  assert(dbCategories.length === 12, `Store.getCategories() returned ${dbCategories.length} categories`);

  const dbZones = await Store.getZones();
  assert(dbZones.length === 8, `Store.getZones() returned ${dbZones.length} zones`);

  // 4. Test Store.getBusinessBySlug() & getBusinessById()
  const kevin = await Store.getBusinessBySlug('kevin-phones-laptops');
  assert(Boolean(kevin), 'Found kevin-phones-laptops via Store.getBusinessBySlug');
  assert(kevin?.name === 'Kevin Phones & Laptops', 'Kevin name matches');
  assert(Boolean(kevin?.mapPin?.lat), 'Kevin mapPin lat is preserved');

  const kevinById = await Store.getBusinessById('biz_kevin_phones');
  assert(Boolean(kevinById), 'Found kevin via Store.getBusinessById');
  assert(kevinById?.slug === 'kevin-phones-laptops', 'Kevin slug matches by ID query');

  let createdBiz: Awaited<ReturnType<typeof Store.createBusiness>> | undefined;
  let testReport: Awaited<ReturnType<typeof Store.createReport>> | undefined;
  let testPayment: Awaited<ReturnType<typeof Store.createPayment>> | undefined;
  let testReq: Awaited<ReturnType<typeof Store.createServiceRequest>> | undefined;
  let testBooking: Awaited<ReturnType<typeof Store.createBookingIntent>> | undefined;

  try {
    // 5. Test Store.createBusiness() writes directly to PostgreSQL
    const testSlug = `test-repair-shop-${Date.now()}`;
    createdBiz = await Store.createBusiness({
      name: 'Test Fundi Workshop',
      slug: testSlug,
      tagline: 'Fixing gadgets anytime',
      description: 'Testing prisma integration database persistence thoroughly.',
      primaryCategory: 'phone-laptop-repair',
      phone: '+254799000111',
      zone: 'kesses-centre',
      landmark: 'Opposite Stage Gate',
      priceLevel: 1,
    });
    assert(Boolean(createdBiz?.id), 'Business created successfully with ID');

    // Verify in PostgreSQL directly with prisma
    const dbVerify = await prisma.business.findUnique({ where: { slug: testSlug } });
    assert(Boolean(dbVerify), 'Created business verified directly in PostgreSQL table "Business"');
    assert(dbVerify?.name === 'Test Fundi Workshop', 'Persisted business name matches in PostgreSQL');

    // 6. Test Store.updateBusiness() in PostgreSQL
    const updatedBiz = await Store.updateBusiness(createdBiz.id, {
      tagline: 'Updated Tagline In DB',
      studentDiscount: '15% for campus students',
    });
    assert(updatedBiz?.tagline === 'Updated Tagline In DB', 'Store returned updated tagline');

    const dbVerifyUpdate = await prisma.business.findUnique({ where: { id: createdBiz.id } });
    assert(dbVerifyUpdate?.tagline === 'Updated Tagline In DB', 'Updated tagline persisted in PostgreSQL');
    assert(dbVerifyUpdate?.studentDiscount === '15% for campus students', 'Updated discount persisted in PostgreSQL');

    // 7. New businesses remain unclaimed until owner email verification.
    const dbClaimVerify = await prisma.business.findUnique({ where: { id: createdBiz.id } });
    assert(dbClaimVerify?.isClaimed === false, 'A new listing has no verified owner');
    assert(dbClaimVerify?.ownerId === null, 'Business ownership requires the account verification flow');

    // 8. Test Store.recordEvent() in PostgreSQL
    const initialViews = (dbClaimVerify?.metrics as Record<string, number> | null)?.views || 0;
    await Store.recordEvent(createdBiz.id, 'view');
    await Store.recordEvent(createdBiz.id, 'call');
    const dbEventVerify = await prisma.business.findUnique({ where: { id: createdBiz.id } });
    const updatedMetrics = dbEventVerify?.metrics as Record<string, number> | null;
    assert((updatedMetrics?.views || 0) === initialViews + 1, 'View metric incremented in PostgreSQL');
    assert((updatedMetrics?.calls || 0) >= 1, 'Call metric incremented in PostgreSQL');

    // 9. Test Store.toggleAvailableNow() in PostgreSQL
    const toggledOn = await Store.toggleAvailableNow(createdBiz.id, 2);
    assert(Boolean(toggledOn?.availableNowUntil), 'Toggled available now ON');
    const dbToggleVerify = await prisma.business.findUnique({ where: { id: createdBiz.id } });
    assert(Boolean(dbToggleVerify?.availableNowUntil), 'availableNowUntil timestamp stored in PostgreSQL');

    // 10. Test Reports in PostgreSQL
    testReport = await Store.createReport({
      businessId: createdBiz.id,
      businessName: createdBiz.name,
      reason: 'wrong_number',
      details: 'Phone was unreachable on Monday',
    });
    assert(Boolean(testReport.id), 'Report created with ID');
    const dbReportVerify = await prisma.problemReport.findUnique({ where: { id: testReport.id } });
    assert(Boolean(dbReportVerify), 'Report exists in PostgreSQL "ProblemReport" table');
    assert(dbReportVerify?.reason === 'wrong_number', 'Report reason preserved');

    const reportsList = await Store.getReports();
    assert(reportsList.some((r) => r.id === testReport?.id), 'Created report found in Store.getReports()');

    // 11. Test Payments in PostgreSQL & Promotion activation
    testPayment = await Store.createPayment({
      businessId: createdBiz.id,
      businessName: createdBiz.name,
      planId: 'FEATURED',
      weeks: 2,
      amountKes: 400,
      phone: '254799000111',
      method: 'INTASEND_CHECKOUT',
      provider: 'INTASEND',
      currency: 'KES',
    });
    assert(Boolean(testPayment.id), 'Payment record created');
    const dbPaymentVerify = await prisma.paymentRecord.findUnique({ where: { id: testPayment.id } });
    assert(Boolean(dbPaymentVerify), 'Payment verified in PostgreSQL "PaymentRecord" table');

    // Provider contract tests independently validate the status payload. This
    // database test verifies atomic activation after that trusted verification.
    const proof = { invoiceId: `TEST_INVOICE_${testPayment.id}`, state: 'COMPLETE', providerRef: 'MPESA_TEST_CONFIRM' };
    const [settled] = await Promise.all([
      Store.confirmVerifiedPayment(testPayment.id, proof),
      Store.confirmVerifiedPayment(testPayment.id, proof),
    ]);
    assert(settled?.state === 'COMPLETE', 'Verified payment completed atomically');
    const dbSettleVerify = await prisma.paymentRecord.findUnique({ where: { id: testPayment.id } });
    assert(dbSettleVerify?.state === 'COMPLETE', 'COMPLETE state in PostgreSQL');
    assert(dbSettleVerify?.mpesaRef === 'MPESA_TEST_CONFIRM', 'mpesaRef in PostgreSQL');

    const dbBizPromoteVerify = await prisma.business.findUnique({ where: { id: createdBiz.id } });
    assert(dbBizPromoteVerify?.activeTier === 'FEATURED', 'Business activeTier promoted to FEATURED in PostgreSQL');
    assert(Boolean(dbBizPromoteVerify?.tierEndsAt), 'tierEndsAt set on Business in PostgreSQL');
    const daysGranted = (dbBizPromoteVerify!.tierEndsAt!.getTime() - dbBizPromoteVerify!.tierStartsAt!.getTime()) / 864e5;
    assert(daysGranted === 14, 'Concurrent payment confirmation grants exactly two weeks once');
    await Store.updatePayment(testPayment.id, { state: 'FAILED' });
    const afterLateFailure = await Store.getPaymentById(testPayment.id);
    assert(afterLateFailure?.state === 'COMPLETE', 'Late failure cannot reverse verified completion');

    // 12. Test Service Requests in PostgreSQL
    testReq = await Store.createServiceRequest({
      query: 'wifi technician needed at gate',
      zone: 'main-gate',
      contactPhone: '+254711998877',
    });
    assert(Boolean(testReq.id), 'Service request created');
    const dbReqVerify = await prisma.serviceRequest.findUnique({ where: { id: testReq.id } });
    assert(Boolean(dbReqVerify), 'Service request found in PostgreSQL');
    assert(dbReqVerify?.query === 'wifi technician needed at gate', 'Service query preserved');

    const requestsList = await Store.getServiceRequests();
    assert(requestsList.some((r) => r.id === testReq?.id), 'Created service request found in Store.getServiceRequests()');

    // 13. Test Booking Intents in PostgreSQL
    testBooking = await Store.createBookingIntent({
      businessId: createdBiz.id,
      serviceName: 'Phone Battery Diagnosis',
      day: 'Friday',
      time: '14:00',
      studentName: 'Faith Chebet',
    });
    assert(Boolean(testBooking.id), 'Booking intent created');
    const dbBookingVerify = await prisma.bookingIntent.findUnique({ where: { id: testBooking.id } });
    assert(Boolean(dbBookingVerify), 'Booking intent verified in PostgreSQL');
  } finally {
    // Clean up test entities inside finally block to ensure no leaks
    console.log('Cleaning up test entities...');
    if (testBooking?.id) {
      await prisma.bookingIntent.deleteMany({ where: { id: testBooking.id } });
    }
    if (testReq?.id) {
      await prisma.serviceRequest.deleteMany({ where: { id: testReq.id } });
    }
    if (testPayment?.id) {
      await prisma.paymentRecord.deleteMany({ where: { id: testPayment.id } });
    }
    if (testReport?.id) {
      await prisma.problemReport.deleteMany({ where: { id: testReport.id } });
    }
    if (createdBiz?.id) {
      await prisma.business.deleteMany({ where: { id: createdBiz.id } });
    }
  }

  // 14. Verify final clean row counts
  const finalBizCount = await prisma.business.count();
  assert(finalBizCount === bizCount, `Verification removed its temporary business (before: ${bizCount}, after: ${finalBizCount})`);

  console.log('--- ALL PRISMA & POSTGRESQL VERIFICATION TESTS PASSED! ---');
}

runPrismaVerification()
  .catch((err) => {
    console.error('❌ Prisma verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
