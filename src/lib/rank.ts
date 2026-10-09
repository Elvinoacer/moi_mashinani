import { CATEGORIES, categoryMatches, categorySearchText } from './categories';
import { Business, Tier } from './types';

export interface RankConfig {
  weights: { relevance: number; proximity: number; quality: number };
  minRelevance: number;
  topBlockSize: number;
  topBlockMinRelevance: number;
  bucketSize: number;
  pageSize: number;
  maxPromotedPerPage: number;
  newListingBoost: number;
}

export const DEFAULT_RANK_CONFIG: RankConfig = {
  weights: { relevance: 0.55, proximity: 0.2, quality: 0.25 },
  minRelevance: 0.25,
  topBlockSize: 3,
  topBlockMinRelevance: 0.5,
  bucketSize: 0.1,
  pageSize: 10,
  maxPromotedPerPage: 6,
  newListingBoost: 0.05,
};

// Local Kenyan & Campus Synonyms Map (Section 4.4.2 & Appendix A)
export const SYNONYMS: Record<string, string[]> = {
  kinyozi: ['barber', 'haircut', 'shave', 'salon', 'fade'],
  saloon: ['salon', 'hair', 'braids', 'weaving'],
  salon: ['braids', 'knotless', 'hair', 'retwist', 'kinyozi', 'barber'],
  fundi: ['repair', 'technician', 'fix', 'screen', 'laptop', 'phone', 'diagnostics'],
  repair: ['fundi', 'technician', 'fix', 'screen', 'laptop', 'phone', 'motherboard'],
  screen: ['display', 'cracked', 'glass', 'lcd', 'phone', 'technician', 'repair'],
  cracked: ['screen', 'glass', 'phone', 'repair', 'fix'],
  laptop: ['computer', 'macbook', 'charger', 'windows', 'repair', 'motherboard'],
  cyber: ['printing', 'photocopy', 'binding', 'lamination', 'helb', 'kra', 'print'],
  print: ['cyber', 'hardcover', 'thesis', 'project', 'color', 'printing'],
  printing: ['cyber', 'hardcover', 'thesis', 'project', 'color', 'print'],
  'mama fua': ['laundry', 'washing', 'duvet', 'clothes', 'dry cleaning'],
  fua: ['laundry', 'mama fua', 'washing'],
  laundry: ['mama fua', 'duvet', 'washing', 'ironing', 'clothes'],
  gas: ['cooking gas', 'refill', 'cylinder', 'total', 'progas', 'kgas'],
  hostel: ['room', 'bedsitter', 'single', 'rental', 'vacancy', 'caretaker'],
  bedsitter: ['hostel', 'room', 'rental'],
  food: ['meals', 'cafe', 'fries', 'chips', 'smokie', 'chapati', 'lunch', 'fast bites'],
  meals: ['food', 'cafe', 'fries', 'chips', 'smokie', 'chapati', 'lunch', 'dinner'],
  chips: ['fries', 'fast food', 'chicken', 'snacks', 'food'],
  smokie: ['fast food', 'chips', 'fries', 'sausage', 'kachumbari', 'food'],
  discount: ['deal', 'deals', 'offer', 'offers', 'perk', 'id', 'student discount'],
  deal: ['discount', 'student discount', 'offer', 'perk', 'saving'],
  deals: ['discount', 'student discount', 'offer', 'perk', 'saving'],
  dawa: ['chemist', 'pharmacy', 'medicine'],
  tutor: ['revision', 'exam', 'calculus', 'engineering', 'classes', 'academics'],
  tutors: ['tutor', 'revision', 'exam', 'calculus', 'engineering', 'classes'],
  wifi: ['router', 'mifi', 'faiba', 'internet', 'data', 'gadgets'],
  tailor: ['tailoring', 'fashion', 'sewing', 'suit', 'dress', 'alterations'],
  tailoring: ['tailor', 'fashion', 'sewing', 'suit', 'dress', 'alterations'],
  photo: ['photography', 'camera', 'pictures', 'shoot', 'studio', 'graduation'],
  photography: ['photo', 'camera', 'pictures', 'shoot', 'studio', 'graduation'],
  cakes: ['cake', 'bakery', 'bakes', 'birthday', 'pastry'],
  cake: ['cakes', 'bakery', 'bakes', 'birthday', 'pastry'],
};

// Stable pseudo-random in [0,1) from id + seed (FNV-1a)
export function fnv1aRotation(id: string, seed: string): number {
  let h = 2166136261;
  const s = `${id}:${seed}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

export interface ScoredCandidate {
  business: Business;
  effectiveTier: Tier;
  relevance: number;
  proximity: number;
  quality: number;
  totalScore: number;
  scoreBucket: number;
}

export function computeRelevance(business: Business, query: string, targetCategory?: string): number {
  const q = query.toLowerCase().trim();
  if (!q && !targetCategory) return 0.8; // default browsable relevance

  const searchWords = q.split(/\s+/).filter(Boolean);

  let score = 0;

  // Category match via explicit targetCategory param
  if (targetCategory && categoryMatches(business, targetCategory)) {
    score += 0.6;
  }

  // Name match
  const nameLower = business.name.toLowerCase();
  if (nameLower.includes(q) && q.length > 2) {
    score += 0.5;
  } else {
    for (const word of searchWords) {
      if (nameLower.includes(word)) score += 0.25;
    }
  }

  // Primary category slug match with query words (e.g. "food" matches "food-cafes")
  const categorySlugs = [business.primaryCategory, ...business.extraCategories];
  const catSlugs = [categorySlugs.join(' '), ...CATEGORIES.filter(category => categorySlugs.includes(category.slug)).map(categorySearchText)].join(' ').toLowerCase();
  for (const word of searchWords) {
    if (catSlugs.includes(word) && word.length > 2) {
      score += 0.35;
    }
  }

  // Tags match
  const lowerTags = (business.tags || []).map((t) => t.toLowerCase());
  for (const word of searchWords) {
    if (lowerTags.includes(word)) {
      score += 0.25;
    }
  }

  // Tagline, Description & Student Discount match
  const textBody = `${business.tagline || ''} ${business.description || ''} ${lowerTags.join(' ')} ${business.studentDiscount || ''}`.toLowerCase();
  if (q.length > 2 && textBody.includes(q)) {
    score += 0.25;
  }
  for (const word of searchWords) {
    if (textBody.includes(word)) score += 0.15;

    // Check synonym expansion
    const syns = SYNONYMS[word] || [];
    for (const s of syns) {
      if (textBody.includes(s) || nameLower.includes(s) || catSlugs.includes(s)) {
        score += 0.15;
      }
    }
  }

  // Student discount match if query asks for discounts/deals/offers
  const isDiscountIntent = searchWords.some((w) =>
    ['discount', 'discounts', 'deal', 'deals', 'offer', 'offers', 'perk', 'perks', 'saving'].includes(w)
  );
  if (isDiscountIntent && business.studentDiscount) {
    score += 0.45;
  }

  // Services match
  for (const s of business.services || []) {
    const sName = (s.name || '').toLowerCase();
    const sNote = (s.note || '').toLowerCase();
    if (q && (sName.includes(q) || sNote.includes(q))) {
      score += 0.3;
      break;
    }
    for (const word of searchWords) {
      if (sName.includes(word) || sNote.includes(word)) {
        score += 0.12;
      }
    }
  }

  return Math.min(1.0, score);
}

export function computeProximity(business: Business, preferredZone?: string): number {
  if (!preferredZone || preferredZone === 'all') return 0.8;
  if (business.zone === preferredZone) return 1.0;
  if (business.servesZones.includes(preferredZone)) return 0.7;
  return 0.3; // Different zone in Kesses
}

export function computeQuality(business: Business): number {
  const completeness = (business.profileStrength || 70) / 100;
  const verifiedBonus = business.verificationLevel === 'L2' ? 0.3 : business.verificationLevel === 'L1' ? 0.15 : 0;
  return Math.min(1.0, 0.6 * completeness + verifiedBonus);
}

export function getEffectiveTier(business: Business, now = new Date()): Tier {
  if (business.activeTier === 'NONE') return 'NONE';
  if (!business.tierEndsAt) return business.activeTier;
  const endsAt = new Date(business.tierEndsAt);
  if (endsAt.getTime() > now.getTime()) {
    return business.activeTier;
  }
  return 'NONE';
}

export function rankBusinesses(
  businesses: Business[],
  query = '',
  preferredZone = 'all',
  targetCategory?: string,
  cfg = DEFAULT_RANK_CONFIG,
  sessionId = 'anon_session',
  now = new Date()
): ScoredCandidate[] {
  const currentHour = now.getHours();
  const rotationSeed = `${sessionId}_h${currentHour}`;

  // Filter active and eligible
  const activeListings = businesses.filter(
    (b) =>
      b.status === 'ACTIVE' &&
      !b.isTemporarilyClosed &&
      (!targetCategory || categoryMatches(b, targetCategory))
  );

  const scored: ScoredCandidate[] = activeListings.map((business) => {
    const effectiveTier = getEffectiveTier(business, now);
    const relevance = computeRelevance(business, query, targetCategory);
    const proximity = computeProximity(business, preferredZone);
    const quality = computeQuality(business);

    const createdAt = new Date(business.createdAt);
    const isNew = now.getTime() - createdAt.getTime() < 14 * 864e5;
    const newBoost = isNew ? cfg.newListingBoost : 0;

    const totalScore =
      cfg.weights.relevance * relevance +
      cfg.weights.proximity * proximity +
      cfg.weights.quality * quality +
      newBoost;

    const scoreBucket = Math.round(totalScore / cfg.bucketSize);

    return {
      business,
      effectiveTier,
      relevance,
      proximity,
      quality,
      totalScore,
      scoreBucket,
    };
  });

  // Relevance floor
  const eligible = scored.filter((c) => c.relevance >= cfg.minRelevance);

  const tierRank = (t: Tier) => (t === 'FEATURED' ? 2 : t === 'RECOMMENDED' ? 1 : 0);

  const byBucketThenRotation = (a: ScoredCandidate, b: ScoredCandidate) =>
    b.scoreBucket - a.scoreBucket ||
    fnv1aRotation(a.business.id, rotationSeed) - fnv1aRotation(b.business.id, rotationSeed);

  // Top block: up to topBlockSize Featured listings with relevance >= topBlockMinRelevance
  const topBlock = eligible
    .filter((c) => c.effectiveTier === 'FEATURED' && c.relevance >= cfg.topBlockMinRelevance)
    .sort(byBucketThenRotation)
    .slice(0, cfg.topBlockSize);

  const inTopIds = new Set(topBlock.map((c) => c.business.id));

  // Promoted block: Recommended plus remaining Featured
  const promoted = eligible
    .filter((c) => c.effectiveTier !== 'NONE' && !inTopIds.has(c.business.id))
    .sort(
      (a, b) =>
        b.scoreBucket - a.scoreBucket ||
        tierRank(b.effectiveTier) - tierRank(a.effectiveTier) ||
        fnv1aRotation(a.business.id, rotationSeed) - fnv1aRotation(b.business.id, rotationSeed)
    );

  // Organic block: Free listings
  const organic = eligible
    .filter((c) => c.effectiveTier === 'NONE')
    .sort(byBucketThenRotation);

  // Compose pages with maxPromotedPerPage
  return composePages([...topBlock, ...promoted], organic, cfg);
}

function composePages(
  promoted: ScoredCandidate[],
  organic: ScoredCandidate[],
  cfg: RankConfig
): ScoredCandidate[] {
  const out: ScoredCandidate[] = [];
  let p = 0;
  let o = 0;

  while (p < promoted.length || o < organic.length) {
    let promotedOnPage = 0;
    for (
      let slot = 0;
      slot < cfg.pageSize && (p < promoted.length || o < organic.length);
      slot++
    ) {
      if (p < promoted.length && promotedOnPage < cfg.maxPromotedPerPage) {
        out.push(promoted[p++]);
        promotedOnPage++;
      } else if (o < organic.length) {
        out.push(organic[o++]);
      } else {
        out.push(promoted[p++]);
        promotedOnPage++;
      }
    }
  }

  return out;
}
