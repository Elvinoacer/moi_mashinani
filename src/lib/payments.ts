import { Business } from './types';

export const PROMOTION_PLANS = {
  RECOMMENDED: {
    id: 'RECOMMENDED' as const,
    name: 'Recommended',
    priceKesWeek: 100,
    badgeColor: '#0B6E70',
    description: 'Shows above all free listings in search & category results with a verified Deep Teal sticker.',
    perks: [
      'Ranked above all free listings',
      'Recommended sticker on profile & lists',
      'Teal border highlighting',
      'Appear in Recommended sections',
      'Detailed weekly view & contact counts',
    ],
  },
  FEATURED: {
    id: 'FEATURED' as const,
    name: 'Featured',
    priceKesWeek: 200,
    badgeColor: '#FFC53D',
    description: 'Top block of all results and homepage carousel with a vibrant Jua Sun Yellow sticker.',
    perks: [
      'Guaranteed top block of results',
      'Homepage Featured showcase carousel',
      'Category page top spotlight banner',
      'Jua Yellow sticker & left border',
      'Includes all Recommended perks',
      'Priority ranking across all zones',
    ],
  },
};

export function calculateUpgrade(
  currentBusiness: Business,
  targetPlan: 'RECOMMENDED' | 'FEATURED',
  weeks: number
): {
  creditKes: number;
  chargeKes: number;
  remainingDays: number;
} {
  const targetWeeklyPrice = PROMOTION_PLANS[targetPlan].priceKesWeek;
  const basePrice = targetWeeklyPrice * weeks;

  if (
    currentBusiness.activeTier === 'RECOMMENDED' &&
    targetPlan === 'FEATURED' &&
    currentBusiness.tierEndsAt
  ) {
    const now = Date.now();
    const ends = new Date(currentBusiness.tierEndsAt).getTime();
    if (ends > now) {
      const remainingDays = Math.ceil((ends - now) / 864e5);
      const oldWeeklyPrice = PROMOTION_PLANS.RECOMMENDED.priceKesWeek;
      const credit = Math.floor((oldWeeklyPrice * remainingDays) / 7);
      const rawCharge = basePrice - credit;
      // Round up to nearest KES 5, minimum KES 20
      const roundedCharge = Math.max(20, Math.ceil(rawCharge / 5) * 5);
      return { creditKes: credit, chargeKes: roundedCharge, remainingDays };
    }
  }

  return { creditKes: 0, chargeKes: basePrice, remainingDays: 0 };
}

export function formatKenyanPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return `254${digits.substring(1)}`;
  }
  if (digits.startsWith('254')) {
    return digits;
  }
  if (digits.length === 9) {
    return `254${digits}`;
  }
  return digits;
}
