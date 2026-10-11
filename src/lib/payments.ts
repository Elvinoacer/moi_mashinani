import { Business } from './types';

export type PromotionPlanId = 'RECOMMENDED' | 'FEATURED';
export const PROMOTION_WEEKS = [1, 2, 4] as const;
export type PromotionWeeks = typeof PROMOTION_WEEKS[number];

/** Longer runs cost less per week: 2 weeks save 5%, 4 weeks are priced as 3. */
export const PROMOTION_BUNDLE_DISCOUNT: Record<PromotionWeeks, number> = { 1: 0, 2: 0.05, 4: 0.25 };

// Every perk listed here is delivered by the ranking engine or the public pages.
// Keep this list honest: owners pay for exactly what is written.
export const PROMOTION_PLANS = {
  RECOMMENDED: {
    id: 'RECOMMENDED' as const,
    name: 'Recommended',
    priceKesWeek: 100,
    badgeColor: '#0B6E70',
    description: 'Placed above every free listing in the search and category results you match, with a Recommended badge.',
    perks: [
      'Placed above all free listings in matching search and category results',
      'Recommended badge on your listing card',
      'Shown first in the homepage “Your next local find” section',
      'Daily promotion results in your dashboard: times seen, profile views and contacts',
      'Expiry reminders with a summary of your results',
    ],
  },
  FEATURED: {
    id: 'FEATURED' as const,
    name: 'Featured',
    priceKesWeek: 200,
    badgeColor: '#FFC53D',
    description: 'The top block of matching results, the homepage spotlight and the top of your category page.',
    perks: [
      'Top-3 block of matching search and category results',
      'Homepage “Featured around campus” spotlight',
      '“Featured” section at the top of your category page',
      'Featured badge and highlighted listing card',
      'Everything included in Recommended',
    ],
  },
};

export function isPromotionPlan(plan: unknown): plan is PromotionPlanId {
  return typeof plan === 'string' && Object.hasOwn(PROMOTION_PLANS, plan);
}

export function isPromotionWeeks(weeks: unknown): weeks is PromotionWeeks {
  return typeof weeks === 'number' && (PROMOTION_WEEKS as readonly number[]).includes(weeks);
}

/** Server-authoritative price for a promotion purchase, including the bundle discount. */
export function promotionPrice(plan: PromotionPlanId, weeks: number): { chargeKes: number; fullPriceKes: number; savingsKes: number } {
  if (!isPromotionPlan(plan) || !isPromotionWeeks(weeks)) {
    throw new Error('Choose a valid promotion plan and 1, 2, or 4 weeks');
  }
  const fullPriceKes = PROMOTION_PLANS[plan].priceKesWeek * weeks;
  const chargeKes = Math.round(fullPriceKes * (1 - PROMOTION_BUNDLE_DISCOUNT[weeks]));
  return { chargeKes, fullPriceKes, savingsKes: fullPriceKes - chargeKes };
}

export function calculateUpgrade(
  currentBusiness: Business,
  targetPlan: PromotionPlanId,
  weeks: number
): {
  creditKes: number;
  chargeKes: number;
  remainingDays: number;
} {
  // The price never depends on an expiring tier, so a credit cannot be spent twice.
  // Remaining paid time is preserved as time instead (see promotionEndAfterPayment).
  void currentBusiness;
  return {
    creditKes: 0,
    chargeKes: promotionPrice(targetPlan, weeks).chargeKes,
    remainingDays: 0,
  };
}

type TierState = { activeTier: string; tierStartsAt?: Date | string | null; tierEndsAt?: Date | string | null };

/**
 * Works out the promotion after a verified payment so no paid time is ever lost:
 * - same plan while active: the new weeks are added after the current end;
 * - Recommended → Featured: remaining Recommended time is converted to Featured time at the price ratio;
 * - Recommended bought while Featured runs: its value is added as Featured time at the price ratio.
 * Computed when payment is confirmed, so the carry-over reflects the time actually remaining.
 */
export function promotionEndAfterPayment(current: TierState, plan: PromotionPlanId, weeks: number, now = new Date()): {
  activeTier: PromotionPlanId; tierStartsAt: Date; tierEndsAt: Date; carriedOverMs: number;
} {
  const purchasedMs = weeks * 7 * 864e5;
  const endsAt = current.tierEndsAt ? new Date(current.tierEndsAt) : null;
  const startsAt = current.tierStartsAt ? new Date(current.tierStartsAt) : null;
  const active = Boolean(endsAt && endsAt > now && isPromotionPlan(current.activeTier));
  if (!active || !endsAt) {
    return { activeTier: plan, tierStartsAt: now, tierEndsAt: new Date(now.getTime() + purchasedMs), carriedOverMs: 0 };
  }
  const currentPlan = current.activeTier as PromotionPlanId;
  if (currentPlan === plan) {
    return { activeTier: plan, tierStartsAt: startsAt ?? now, tierEndsAt: new Date(endsAt.getTime() + purchasedMs), carriedOverMs: 0 };
  }
  const ratio = (from: PromotionPlanId, to: PromotionPlanId) => PROMOTION_PLANS[from].priceKesWeek / PROMOTION_PLANS[to].priceKesWeek;
  if (currentPlan === 'FEATURED' && plan === 'RECOMMENDED') {
    // A late lower-tier payment never interrupts Featured; its value is kept as extra Featured time.
    const extraMs = Math.floor(purchasedMs * ratio('RECOMMENDED', 'FEATURED'));
    return { activeTier: 'FEATURED', tierStartsAt: startsAt ?? now, tierEndsAt: new Date(endsAt.getTime() + extraMs), carriedOverMs: 0 };
  }
  const carriedOverMs = Math.floor((endsAt.getTime() - now.getTime()) * ratio(currentPlan, plan));
  return { activeTier: plan, tierStartsAt: now, tierEndsAt: new Date(now.getTime() + purchasedMs + carriedOverMs), carriedOverMs };
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
