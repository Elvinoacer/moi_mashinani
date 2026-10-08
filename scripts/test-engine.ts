import { rankBusinesses, fnv1aRotation } from '../src/lib/rank';
import { calculateUpgrade } from '../src/lib/payments';
import { computeProfileStrength, Store } from '../src/lib/store';
import { Business } from '../src/lib/types';
import {
  calculateDistanceMeters,
  formatDistanceAndWalkTime,
  buildGoogleMapsUrl,
  computeRadarPosition,
  CAMPUS_ANCHORS,
  CampusAnchor,
} from '../src/lib/geo';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ Passed: ${msg}`);
  }
}

console.log('--- RUNNING MOIMASHINANI ENGINE VERIFICATION SUITE ---');

// 1. FNV-1a rotation stability and divergence
const seedA = 'session_123_h10';
const seedB = 'session_456_h10';
const rot1 = fnv1aRotation('biz_1', seedA);
const rot2 = fnv1aRotation('biz_1', seedA);
const rot3 = fnv1aRotation('biz_1', seedB);

assert(rot1 === rot2, 'FNV-1a rotation is deterministic for same id and seed');
assert(rot1 !== rot3, 'FNV-1a rotation differs across different sessions');

// 2. Ranking relevance floor
const mockBusinesses: Business[] = [
  {
    id: 'b_relevant_featured',
    name: 'Kevin Screen Repair',
    slug: 'kevin-screen',
    tagline: 'Phone screens',
    description: 'Cracked phone screens and laptops',
    primaryCategory: 'phone-laptop-repair',
    extraCategories: [],
    tags: ['screen'],
    serviceModes: ['at_shop'],
    phone: '+254712345678',
    whatsapp: '+254712345678',
    campus: 'Moi University',
    zone: 'kesses-centre',
    servesZones: [],
    landmark: 'Behind gate',
    hours: {},
    services: [{ id: '1', name: 'Screen Replacement', priceFrom: 2000 }],
    priceLevel: 1,
    photos: ['p1'],
    coverPhoto: 'p1',
    activeTier: 'FEATURED',
    tierEndsAt: new Date(Date.now() + 864e5).toISOString(),
    status: 'ACTIVE',
    verificationLevel: 'L2',
    isClaimed: true,
    profileStrength: 90,
    metrics: { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0, impressions: 0, lastWeekViews: 0, lastWeekCalls: 0, lastWeekWhatsapp: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b_irrelevant_featured',
    name: 'Cheboiywo Milk Kiosk',
    slug: 'cheboiywo-milk',
    tagline: 'Fresh milk and eggs',
    description: 'Dairy products and bread only',
    primaryCategory: 'gas-groceries',
    extraCategories: [],
    tags: ['milk'],
    serviceModes: ['at_shop'],
    phone: '+254722334455',
    whatsapp: '+254722334455',
    campus: 'Moi University',
    zone: 'kesses-centre',
    servesZones: [],
    landmark: 'Cheboiywo',
    hours: {},
    services: [{ id: '1', name: 'Fresh Milk', priceFrom: 50 }],
    priceLevel: 1,
    photos: ['p1'],
    coverPhoto: 'p1',
    activeTier: 'FEATURED',
    tierEndsAt: new Date(Date.now() + 864e5).toISOString(),
    status: 'ACTIVE',
    verificationLevel: 'L2',
    isClaimed: true,
    profileStrength: 90,
    metrics: { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0, impressions: 0, lastWeekViews: 0, lastWeekCalls: 0, lastWeekWhatsapp: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'b_relevant_free',
    name: 'Moses Fundi Screen Fix',
    slug: 'moses-fundi',
    tagline: 'Cracked glass screen fix',
    description: 'We fix cracked phone screens quickly',
    primaryCategory: 'phone-laptop-repair',
    extraCategories: [],
    tags: ['screen'],
    serviceModes: ['at_shop'],
    phone: '+254733445566',
    whatsapp: '+254733445566',
    campus: 'Moi University',
    zone: 'kesses-centre',
    servesZones: [],
    landmark: 'Stage',
    hours: {},
    services: [{ id: '1', name: 'Screen Fix', priceFrom: 1800 }],
    priceLevel: 1,
    photos: ['p1'],
    coverPhoto: 'p1',
    activeTier: 'NONE',
    status: 'ACTIVE',
    verificationLevel: 'L1',
    isClaimed: true,
    profileStrength: 80,
    metrics: { views: 0, calls: 0, whatsapp: 0, directions: 0, bookingRequests: 0, impressions: 0, lastWeekViews: 0, lastWeekCalls: 0, lastWeekWhatsapp: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const ranked = rankBusinesses(mockBusinesses, 'screen', 'kesses-centre');
const ids = ranked.map((r) => r.business.id);

assert(ids.includes('b_relevant_featured'), 'Relevant Featured listing is included');
assert(!ids.includes('b_irrelevant_featured'), 'Irrelevant paid listing is excluded by relevance floor (Section 4.4.5 rule 1)');
assert(ids[0] === 'b_relevant_featured', 'Relevant Featured listing takes top position over organic');
assert(ids.includes('b_relevant_free'), 'Relevant organic listing is included in results');

// 3. Expired promotion treatment
const expiredBiz: Business = {
  ...mockBusinesses[0],
  id: 'b_expired',
  activeTier: 'FEATURED',
  tierEndsAt: new Date(Date.now() - 3600e3).toISOString(), // expired 1 hour ago
};
const rankedExpired = rankBusinesses([expiredBiz], 'screen');
assert(rankedExpired[0].effectiveTier === 'NONE', 'Expired promotion is treated as NONE at read time (Section 4.4.5 rule 7)');

// 4. Upgrade credit calculation
const dummyRecBiz: Business = {
  ...mockBusinesses[0],
  activeTier: 'RECOMMENDED',
  tierEndsAt: new Date(Date.now() + 5 * 864e5).toISOString(), // 5 days left
};

const upgradeCalc = calculateUpgrade(dummyRecBiz, 'FEATURED', 1);
// Weekly price 100, 5 days left: floor(100 * 5 / 7) = 71
// Target 200 - 71 = 129 -> rounded up to nearest KES 5 = 130
assert(upgradeCalc.creditKes === 71, `Upgrade credit is KES 71 (got ${upgradeCalc.creditKes})`);
assert(upgradeCalc.chargeKes === 130, `Upgrade charge rounded up to KES 130 (got ${upgradeCalc.chargeKes})`);

// 5. Profile completeness calculation
const testStrength = computeProfileStrength({
  name: 'Sample Shop',
  primaryCategory: 'phone-laptop-repair',
  phone: '+254712345678',
  zone: 'kesses-centre',
  landmark: 'Behind gate',
  photos: ['1', '2', '3'],
  description: 'This is a long description that exceeds eighty characters so it gets full points from the scorer.',
  services: [{ id: '1', name: 'Service 1' }, { id: '2', name: 'Service 2' }, { id: '3', name: 'Service 3' }],
  hours: { Monday: { open: '08:00', close: '20:00' } },
  mapPin: { lat: 0.28, lng: 35.29 },
  studentDiscount: '10% student discount',
});
assert(testStrength === 100, `Full profile reaches 100 points (got ${testStrength})`);

// 6. Store operations & Data Sync
const loadedBusinesses = Store.getBusinesses();
assert(loadedBusinesses.length >= 10, 'Seed listings loaded successfully');
const kevin = Store.getBusinessBySlug('kevin-phones-laptops');
assert(Boolean(kevin), 'Kevin Phones flagship profile found');

// 7. Verify all seeded businesses have valid GPS coordinates & landmark tags
const businessesWithoutPin = loadedBusinesses.filter((b) => !b.mapPin || typeof b.mapPin.lat !== 'number' || typeof b.mapPin.lng !== 'number');
assert(businessesWithoutPin.length === 0, `All ${loadedBusinesses.length} seeded businesses have GPS mapPin coordinates (missing: ${businessesWithoutPin.length})`);

const businessesWithoutLandmark = loadedBusinesses.filter((b) => !b.landmark || b.landmark.trim().length === 0);
assert(businessesWithoutLandmark.length === 0, `All ${loadedBusinesses.length} seeded businesses have landmark location tags`);

// 8. Geolocation and Google Maps navigation helpers
const gateAnchor = CAMPUS_ANCHORS.find((a: CampusAnchor) => a.id === 'main-gate');
assert(Boolean(gateAnchor), 'Main Gate campus anchor found');

const distMeters = calculateDistanceMeters(gateAnchor!.coords, kevin!.mapPin!);
assert(distMeters > 0 && distMeters < 1000, `Distance from Main Gate to Kevin Phones is reasonable (${distMeters}m)`);

const fmt = formatDistanceAndWalkTime(distMeters);
assert(fmt.minutes >= 1 && fmt.minutes <= 15, `Walk time calculation is reasonable (${fmt.walkTimeStr})`);

const mapsUrl = buildGoogleMapsUrl({
  destCoords: kevin!.mapPin,
  originCoords: gateAnchor!.coords,
  businessName: kevin!.name,
  landmark: kevin!.landmark,
});
assert(mapsUrl.includes('google.com/maps/dir'), `Google Maps directions URL generated (${mapsUrl})`);
assert(mapsUrl.includes('travelmode=walking'), 'Google Maps URL specifies walking travel mode');

const radarPos = computeRadarPosition(gateAnchor!.coords, kevin!.mapPin!, 1100);
assert(typeof radarPos.x === 'number' && typeof radarPos.y === 'number', 'Radar X/Y coordinates computed');
assert(Math.abs(radarPos.x) <= 50 && Math.abs(radarPos.y) <= 50, 'Radar coordinates are clamped within the radar circle');

// 9. Verify search relevance engine across all campus intent queries
const foodResults = rankBusinesses(loadedBusinesses, 'food', 'all');
assert(foodResults.length >= 1, `Search query 'food' returns at least 1 campus provider (got ${foodResults.length})`);
assert(foodResults.some((r) => r.business.name.includes('Chef Brian')), "Search for 'food' includes Chef Brian Fast Bites");

const discountResults = rankBusinesses(loadedBusinesses, 'discount', 'all');
assert(discountResults.length >= 5, `Search query 'discount' returns businesses with student discounts (got ${discountResults.length})`);

const cakesResults = rankBusinesses(loadedBusinesses, 'cakes', 'all');
assert(cakesResults.length >= 1, `Search query 'cakes' returns campus bakery provider (got ${cakesResults.length})`);

const repairResults = rankBusinesses(loadedBusinesses, 'repair', 'all');
assert(repairResults.length >= 2, `Search query 'repair' returns electronics fundis (got ${repairResults.length})`);

const cyberResults = rankBusinesses(loadedBusinesses, 'printing', 'all');
assert(cyberResults.length >= 1, `Search query 'printing' returns cyber services (got ${cyberResults.length})`);

const braidsResults = rankBusinesses(loadedBusinesses, 'braids', 'all');
assert(braidsResults.length >= 1, `Search query 'braids' returns hair studios (got ${braidsResults.length})`);

// 10. Verify active Available Now listings are valid
const nowTime = Date.now();
const activeAvailable = loadedBusinesses.filter(
  (b) => b.availableNowUntil && new Date(b.availableNowUntil).getTime() > nowTime
);
assert(activeAvailable.length >= 5, `At least 5 campus businesses are active in 'Available Now' window (got ${activeAvailable.length})`);

console.log('--- ALL ENGINE TESTS PASSED SUCCESSFULLY! ---');
