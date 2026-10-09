import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CATEGORIES, CATEGORY_GROUPS, categoryMatches, categorySearchText } from '../src/lib/categories';
import { SEED_BUSINESSES } from '../src/lib/constants';
import { rankBusinesses } from '../src/lib/rank';
import { businessInput } from '../src/lib/business-input';

test('all campus categories belong to a group and existing business links remain valid', () => {
  assert.equal(new Set(CATEGORIES.map(category => category.slug)).size, CATEGORIES.length);
  for (const category of CATEGORIES) assert.ok(CATEGORY_GROUPS.some(group => group.slug === category.group));
  for (const business of SEED_BUSINESSES) {
    for (const slug of [business.primaryCategory, ...business.extraCategories]) assert.ok(CATEGORIES.some(category => category.slug === slug));
  }
});

test('browse groups include secondary categories without duplicate results', () => {
  const business = { ...SEED_BUSINESSES[0], primaryCategory: 'juice-smoothies', extraCategories: ['mpesa-banking', 'juice-smoothies'], status: 'ACTIVE' as const, isTemporarilyClosed: false };
  assert.ok(categoryMatches(business, 'food-drinks'));
  assert.ok(categoryMatches(business, 'money-services'));
  assert.ok(!categoryMatches(business, 'fashion-clothing'));
  assert.equal(rankBusinesses([business], 'juice', 'all').length, 1);
  assert.equal(rankBusinesses([business], '', 'all', 'food-drinks').length, 1);
  assert.equal(rankBusinesses([business], '', 'all', 'money-services').length, 1);
  assert.equal(rankBusinesses([business], '', 'all', 'fashion-clothing').length, 0);
});

test('familiar campus words find suitable business types', () => {
  for (const word of ['mitumba', 'juice', 'boda', 'mama mboga', 'm-pesa', 'bedsitters', 'sanitary', 'chemist', 'smokies']) {
    assert.ok(CATEGORIES.some(category => categorySearchText(category).includes(word)), word);
  }
});

test('every leaf category is accepted for business updates; groups cannot be saved as a business type', () => {
  for (const category of CATEGORIES) assert.equal(businessInput({ primaryCategory: category.slug }, true).primaryCategory, category.slug);
  assert.throws(() => businessInput({ primaryCategory: 'food-drinks' }, true));
});
