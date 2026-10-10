import test from 'node:test';
import assert from 'node:assert/strict';

// Ignore css / css module imports during node test runs
require.extensions['.css'] = () => ({});

import {
  SITE_URL,
  CORE_CAMPUS_KEYWORDS,
  CATEGORY_ALIASES,
  getCategorySeoData,
  getBusinessSeoData,
  resolveSchemaType,
  safeJsonLd,
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateBreadcrumbSchema,
  generateLocalBusinessSchema,
  generateCategoryItemListSchema,
} from '../src/lib/seo';
import { CATEGORIES, SEED_BUSINESSES } from '../src/lib/constants';
import { CATEGORY_GROUPS } from '../src/lib/categories';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import manifest from '../app/manifest';

test('SEO: Core campus keywords and site configuration', () => {
  assert.ok(SITE_URL.startsWith('http'), 'SITE_URL is a valid HTTP(S) URL');
  assert.ok(CORE_CAMPUS_KEYWORDS.length >= 35, 'Rich array of campus keywords defined');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('Moi University'), 'Includes Moi University');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('Kesses'), 'Includes Kesses');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('Soweto Moi University'), 'Includes Soweto');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('Cheboiywo'), 'Includes Cheboiywo');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('Stage Moi'), 'Includes Stage');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('phone repair Moi University'), 'Includes phone repair');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('kinyozi Moi University'), 'Includes kinyozi');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('M-Pesa agent Kesses'), 'Includes M-Pesa agent');
  assert.ok(CORE_CAMPUS_KEYWORDS.includes('smocha Kesses'), 'Includes smocha');
});

test('SEO: Category SEO helper handles leaf categories and category groups', () => {
  // Leaf category
  const foodSeo = getCategorySeoData('food-cafes');
  assert.ok(foodSeo.title.includes('Food & Cafes'), 'Title has category name');
  assert.ok(foodSeo.title.includes('Moi University'), 'Title has Moi University');
  assert.ok(foodSeo.title.includes('Kesses'), 'Title has Kesses');
  assert.ok(foodSeo.description.includes('Soweto'), 'Description mentions student neighborhoods');
  assert.ok(foodSeo.keywords.length >= 10, 'Category has rich keyword expansion');
  assert.ok(foodSeo.synonyms.includes('hostel delivery'), 'Synonyms include hostel delivery');

  // Phone repair leaf category
  const repairSeo = getCategorySeoData('phone-laptop-repair');
  assert.ok(repairSeo.synonyms.includes('cracked phone screen'), 'Repair includes cracked screen');
  assert.ok(repairSeo.synonyms.includes('Kevin phones'), 'Repair includes Kevin phones');

  // Category group: food-drinks
  const groupSeo = getCategorySeoData('food-drinks');
  assert.ok(groupSeo.isGroup, 'Identifies food-drinks as a category group');
  assert.ok(groupSeo.title.includes('Food & refreshments'), 'Group has proper display title');
  assert.ok(groupSeo.synonyms.length >= 15, 'Group aggregates synonyms from leaf categories');
  assert.ok(groupSeo.synonyms.includes('smocha'), 'Group includes leaf synonyms like smocha');

  // Hostels leaf category uses canonical hostels-rooms
  const hostelSeo = getCategorySeoData('hostels-rooms');
  assert.ok(hostelSeo.categoryName.includes('Hostels'), 'Hostel category correctly named');
  assert.ok(hostelSeo.synonyms.includes('student accommodation'), 'Hostels include student accommodation');

  // Alias map redirects outdated/alternative slugs
  assert.equal(CATEGORY_ALIASES['hostels-rentals'], 'hostels-rooms');
  assert.equal(CATEGORY_ALIASES['braiding-weaves'], 'hair-beauty-kinyozi');
  assert.equal(CATEGORY_ALIASES['nail-bars-lashes'], 'nails-makeup');
  assert.equal(CATEGORY_ALIASES['boda-boda-taxis'], 'boda-transport');
});

test('SEO: Business SEO helper generates schema and rich meta', () => {
  const sampleBiz = SEED_BUSINESSES[0];
  const bizSeo = getBusinessSeoData(sampleBiz);

  assert.ok(bizSeo.title.includes(sampleBiz.name), 'Title contains business name');
  assert.ok(bizSeo.title.includes('Kesses'), 'Title contains campus town');
  assert.ok(bizSeo.description.includes(sampleBiz.name), 'Description contains business name');
  assert.ok(bizSeo.description.includes(sampleBiz.phone), 'Description contains phone');
  assert.ok(bizSeo.keywords.includes(sampleBiz.name), 'Keywords include business name');
  assert.ok(bizSeo.coverImage.startsWith('http'), 'Cover image is absolute URL');

  // Schema type checks
  assert.equal(resolveSchemaType('phone-laptop-repair'), 'ElectronicsStore', 'Phone repair is ElectronicsStore, NOT AutoRepair');
  assert.equal(resolveSchemaType('hostels-rooms'), 'LodgingBusiness', 'Hostel is LodgingBusiness');
  assert.equal(resolveSchemaType('food-cafes'), 'Restaurant', 'Food & Cafes is Restaurant');
  assert.equal(resolveSchemaType('hair-beauty-kinyozi'), 'BarberShop', 'Kinyozi is BarberShop');
  assert.equal(resolveSchemaType('boda-transport'), 'TaxiService', 'Boda boda is TaxiService');
});

test('SEO: Structured data generators output valid Schema.org JSON-LD', () => {
  // safeJsonLd escapes XSS vectors
  const malicious = { name: '<script>alert("xss")</script>', bio: 'A & B > C < D' };
  const safeStr = safeJsonLd(malicious);
  assert.ok(!safeStr.includes('<script>'), 'safeJsonLd strips literal <script>');
  assert.ok(safeStr.includes('\\u003cscript\\u003e'), 'safeJsonLd escapes < into \\u003c');
  assert.ok(safeStr.includes('\\u0026'), 'safeJsonLd escapes & into \\u0026');
  assert.ok(safeStr.includes('\\u003e'), 'safeJsonLd escapes > into \\u003e');

  // WebSite schema
  const websiteSchema = generateWebsiteSchema();
  assert.equal(websiteSchema['@type'], 'WebSite');
  assert.equal(websiteSchema.name, 'MoiMashinani');
  assert.ok(websiteSchema.potentialAction.target.urlTemplate.includes('/search?q='), 'SearchAction properly formed');

  // Organization schema
  const orgSchema = generateOrganizationSchema();
  assert.equal(orgSchema['@type'], 'Organization');
  assert.equal(orgSchema.name, 'MoiMashinani');
  assert.ok(orgSchema.logo.includes('/brand/moimashinani-logo.svg'), 'Logo path present');

  // Breadcrumb schema
  const breadcrumb = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Food', url: '/c/food-cafes' },
    { name: 'Shop 1', url: '/b/shop-1' },
  ]);
  assert.equal(breadcrumb['@type'], 'BreadcrumbList');
  assert.equal(breadcrumb.itemListElement.length, 3);
  assert.equal(breadcrumb.itemListElement[0].position, 1);
  assert.equal(breadcrumb.itemListElement[2].name, 'Shop 1');

  // LocalBusiness schema with opening hours, payment, currency
  const localBiz = generateLocalBusinessSchema(SEED_BUSINESSES[0]);
  assert.equal(localBiz['@type'], 'ElectronicsStore');
  assert.equal(localBiz.name, SEED_BUSINESSES[0].name);
  assert.ok(localBiz.telephone, 'Telephone present');
  assert.ok(localBiz.address, 'Address present');
  assert.equal(localBiz.currenciesAccepted, 'KES', 'KES currency accepted');
  assert.ok((localBiz.paymentAccepted as string).includes('M-Pesa'), 'M-Pesa accepted');
  assert.ok(Array.isArray(localBiz.image) && (localBiz.image[0] as string).startsWith('http'), 'Images are absolute URLs');
  assert.ok(localBiz.hasOfferCatalog, 'Offer catalog present');
  assert.ok(localBiz.openingHoursSpecification, 'Opening hours specifications present');

  // ItemList schema
  const itemList = generateCategoryItemListSchema('food-cafes', [SEED_BUSINESSES[0]]);
  assert.equal(itemList['@type'], 'ItemList');
  assert.equal(itemList.numberOfItems, 1);
  assert.equal(itemList.itemListElement[0].name, SEED_BUSINESSES[0].name);
  assert.ok((itemList.itemListElement[0].image as string).startsWith('http'), 'ItemList image is absolute URL');
});

test('SEO: robots.ts configuration adheres to standards', () => {
  const robotsConfig = robots();
  assert.ok(robotsConfig.rules, 'Rules defined');
  assert.ok(robotsConfig.sitemap, 'Sitemap URL defined');
  assert.ok(robotsConfig.sitemap.includes('/sitemap.xml'), 'Points to sitemap.xml');
  const rules = Array.isArray(robotsConfig.rules) ? robotsConfig.rules[0] : robotsConfig.rules;
  assert.ok(rules.allow?.includes('/c/'), 'Allows /c/');
  assert.ok(rules.allow?.includes('/b/'), 'Allows /b/');
  assert.ok(rules.allow?.includes('/onboard'), 'Allows /onboard');
  assert.ok(rules.disallow?.includes('/admin/'), 'Disallows /admin/');
});

test('SEO: sitemap.ts generates complete sitemap with image sitemaps and category groups', async () => {
  const sitemapEntries = await sitemap();
  assert.ok(sitemapEntries.length > 75, 'Sitemap covers static, groups, categories, and businesses');

  const urls = sitemapEntries.map((e) => e.url);
  assert.ok(urls.some((u) => u === SITE_URL), 'Root homepage in sitemap');
  assert.ok(urls.some((u) => u.includes('/categories')), '/categories in sitemap');
  assert.ok(urls.some((u) => u.includes('/deals')), '/deals in sitemap');
  assert.ok(urls.some((u) => u.includes('/search')), '/search in sitemap');
  assert.ok(urls.some((u) => u.includes('/onboard')), '/onboard in sitemap');

  // Check category groups in sitemap
  for (const group of CATEGORY_GROUPS) {
    assert.ok(urls.some((u) => u === `${SITE_URL}/c/${group.slug}`), `Category group /c/${group.slug} in sitemap`);
  }

  // Check leaf categories in sitemap
  for (const cat of CATEGORIES.slice(0, 5)) {
    assert.ok(urls.some((u) => u === `${SITE_URL}/c/${cat.slug}`), `Category /c/${cat.slug} in sitemap`);
  }

  // Check businesses have image sitemaps
  const bizEntry = sitemapEntries.find((e) => e.url.includes('/b/kevin-phones-laptops'));
  assert.ok(bizEntry, 'Kevin Phones in sitemap');
  assert.ok(bizEntry.images && bizEntry.images.length > 0, 'Business entry has image sitemap URLs');
  assert.ok(bizEntry.images[0].startsWith('http'), 'Image sitemap URLs are absolute');
});

test('SEO: generateMetadata resolves correct metadata on dynamic and static routes', async () => {
  // Business profile metadata
  const { generateMetadata: generateBusinessMetadata } = await import('../app/b/[slug]/page');
  const sampleBiz = SEED_BUSINESSES[0];
  const bizMeta = await generateBusinessMetadata({ params: Promise.resolve({ slug: sampleBiz.slug }) });
  assert.ok(typeof bizMeta.title === 'string' && bizMeta.title.includes(sampleBiz.name), 'Business title generated');
  assert.ok(bizMeta.openGraph, 'Business OpenGraph generated');
  assert.ok(bizMeta.alternates?.canonical === `/b/${sampleBiz.slug}`, 'Business canonical generated');

  // Category metadata (leaf)
  const { generateMetadata: generateCategoryMetadata } = await import('../app/c/[category]/page');
  const catMeta = await generateCategoryMetadata({ params: Promise.resolve({ category: 'food-cafes' }) });
  assert.ok(typeof catMeta.title === 'string' && catMeta.title.includes('Food & Cafes'), 'Category title generated');
  assert.ok(catMeta.openGraph, 'Category OpenGraph generated');
  assert.ok(catMeta.alternates?.canonical === '/c/food-cafes', 'Category canonical generated');

  // Category group metadata
  const groupMeta = await generateCategoryMetadata({ params: Promise.resolve({ category: 'food-drinks' }) });
  assert.ok(typeof groupMeta.title === 'string' && groupMeta.title.includes('Food & refreshments'), 'Group category title generated');
  assert.ok(groupMeta.alternates?.canonical === '/c/food-drinks', 'Group canonical generated');

  // Unknown category metadata
  const missingMeta = await generateCategoryMetadata({ params: Promise.resolve({ category: 'totally-invalid-cat' }) });
  assert.ok(missingMeta.robots && (missingMeta.robots as { index?: boolean }).index === false, 'Invalid category marked noindex');

  // Static pages metadata
  const { metadata: categoriesMetadata } = await import('../app/categories/page');
  assert.ok(categoriesMetadata.title, 'Categories page has title');

  const { metadata: dealsMetadata } = await import('../app/deals/page');
  assert.ok(dealsMetadata.title, 'Deals page has title');

  const { metadata: searchMetadata } = await import('../app/search/page');
  assert.ok(searchMetadata.title, 'Search page has title');

  const { metadata: onboardMetadata } = await import('../app/onboard/page');
  assert.ok(onboardMetadata.title, 'Onboard page has title');
  assert.ok(onboardMetadata.alternates?.canonical === '/onboard', 'Onboard canonical generated');
});

test('SEO: app/manifest.ts generates valid web manifest', () => {
  const m = manifest();
  assert.equal(m.name, 'MoiMashinani — Moi University Campus Business Directory');
  assert.equal(m.short_name, 'MoiMashinani');
  assert.equal(m.start_url, '/');
  assert.equal(m.display, 'standalone');
  assert.equal(m.theme_color, '#183e35');
  assert.ok(m.icons && m.icons.length >= 2, 'Manifest defines icons');
});
