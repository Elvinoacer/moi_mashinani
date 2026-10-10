import { CATEGORIES, ZONES } from './constants';
import { CATEGORY_GROUPS } from './categories';
import type { Business } from './types';

export const SITE_URL = process.env.APP_URL || 'https://moimashinani.gtss.software';
export const SITE_NAME = 'MoiMashinani';

export const DEFAULT_CAMPUS = 'Moi University Main Campus (Kesses)';

/** Safely serialize JSON-LD to prevent script breakout / XSS */
export function safeJsonLd(obj: unknown): string {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

/** Legacy / alternative category aliases redirecting to canonical categories */
export const CATEGORY_ALIASES: Record<string, string> = {
  'hostels-rentals': 'hostels-rooms',
  'braiding-weaves': 'hair-beauty-kinyozi',
  'nail-bars-lashes': 'nails-makeup',
  'stationery-supplies': 'stationery-books',
  'pharmacies-chemists': 'pharmacy-health',
  'boda-boda-taxis': 'boda-transport',
  'clothes-shoes': 'fashion-clothing',
};

export const CORE_CAMPUS_KEYWORDS = [
  'Moi University',
  'Moi University Main Campus',
  'Kesses',
  'Kesses Centre',
  'Soweto Moi University',
  'Cheboiywo',
  'Stage Moi',
  'Talai',
  'Main Gate Moi University',
  'Annex Eldoret',
  'Eldoret campus businesses',
  'Uasin Gishu local business directory',
  'Moi University student directory',
  'campus market Moi',
  'student services Kesses',
  'hostels near Moi University',
  'student bedsitters Kesses',
  'single rooms Moi University',
  'vacant bedsitters Soweto',
  'rooms Cheboiywo Kesses',
  'hostel booking Moi',
  'food delivery Moi University',
  'kibanda Kesses',
  'cheap lunch Moi University',
  'smokie pasua Kesses',
  'chapo beans Moi',
  'smocha Kesses',
  'mutura Kesses stage',
  'phone repair Moi University',
  'laptop screen replacement Kesses',
  'phone technician Kesses',
  'Kevin phones Kesses',
  'fundi Moi University',
  'kinyozi Moi University',
  'barbershop Kesses',
  'hair salon Kesses',
  'knotless braids Soweto Moi',
  'cyber cafe Moi University',
  'printing and photocopy Kesses',
  'spiral binding Moi',
  'project printing Moi University',
  'gas refill delivery Kesses',
  '6kg gas refill Moi',
  'Afrigas Kesses',
  'Total gas Kesses',
  'mama mboga Kesses',
  'clean drinking water delivery Kesses',
  'boda boda Kesses',
  'boda stage to main gate',
  'laundry mama fua Moi',
  'wifi installation Kesses',
  'student discounts Moi University',
  'M-Pesa agent Kesses',
  'MoiMashinani',
];

/** Mapping of category slugs to high-value student search synonyms and intent keywords */
export const CATEGORY_SYNONYMS: Record<string, string[]> = {
  // Food & Drinks
  'food-cafes': [
    'food delivery', 'fast food', 'loaded chips', 'chapo smokie', 'hostel delivery',
    'takeaway', 'campus cafeteria', 'student snacks', 'smocha', 'burgers Kesses'
  ],
  'cakes-bakes': [
    'birthday cake Moi', 'custom cakes Kesses', 'cupcakes', 'celebration cakes',
    'pastries', 'campus bakery', 'fresh bread', 'cookies'
  ],
  'restaurants-eateries': [
    'kibanda', 'cheap food Moi', 'ugali beef', 'chapati beans', 'nyama choma Kesses',
    'lunch spot', 'supper delivery', 'matoke', 'pilau Friday'
  ],
  'street-food-snacks': [
    'smokie pasua', 'mayai boiro', 'kachumbari', 'mutura stage', 'roasted maize',
    'samosa', 'mandazi', 'chips mwitu', 'hot dog'
  ],
  'tea-coffee': [
    'chai ya tangawizi', 'coffee shop', 'breakfast spot', 'mandazi chai', 'study cafe',
    'campus cafe', 'meeting place'
  ],
  'juice-smoothies': [
    'fresh juice', 'fruit smoothies', 'blended juice', 'cold soda', 'ice cream',
    'avocado juice', 'cocktail juice'
  ],
  'meal-delivery-catering': [
    'hostel food delivery', 'daily meal plan', 'event catering', 'group food order',
    'home-cooked meal delivered to hostel'
  ],
  // Daily Essentials
  'gas-groceries': [
    'gas refill Kesses', '6kg gas cylinder', '13kg gas refill', 'total gas', 'hashi gas',
    'afrigas', 'gas delivery to room', 'fresh greens'
  ],
  'shops-supermarkets': [
    'minimart Kesses', 'duka', 'provisions', 'toiletries', 'snacks', 'cooking oil',
    'sugar', 'flour', 'household shop'
  ],
  'fresh-produce': [
    'mama mboga', 'fresh tomatoes', 'sukuma wiki', 'spinach', 'onions', 'potatoes',
    'fruits', 'bananas', 'watermelons'
  ],
  'butcheries-fish': [
    'butchery Kesses', 'beef', 'goat meat', 'chicken', 'fish', 'eggs wholesale', 'pork'
  ],
  'milk-dairy': [
    'fresh milk', 'mala', 'yoghurt', 'dairy bar', 'fermented milk', 'packet milk'
  ],
  'cooking-gas': [
    'cooking gas refill', 'gas burner', 'regulator', 'gas hose', 'hostel gas delivery'
  ],
  'water-delivery': [
    'clean drinking water', '20L water bottle refill', 'mineral water', 'water delivery to hostel'
  ],
  'household-essentials': [
    'plastic buckets', 'pegs', 'laundry basin', 'broom and dustpan', 'mosquito net', 'beddings'
  ],
  // Housing & Home
  'hostels-rooms': [
    'hostels near Moi University', 'bedsitters Kesses', 'single rooms Soweto',
    'rooms Cheboiywo', 'rooms Stage', 'rooms Talai', 'vacant rooms Moi',
    'student accommodation', 'hostel caretaker'
  ],
  'rental-agents': [
    'hostel caretaker', 'housing agent Kesses', 'student bedsitter finder', 'landlord contact'
  ],
  'furniture-bedding': [
    'student mattress', 'wooden bed 3x6', 'study table', 'study chair', 'duvet', 'pillows'
  ],
  'kitchen-homeware': [
    'cups and plates', 'cooking sufuria', 'electric kettle', 'iron box', 'spoon fork'
  ],
  'moving-storage': [
    'hostel moving boda', 'luggage storage vacation', 'student shifting assistance'
  ],
  // Fashion & Clothing
  'tailoring-fashion': [
    'tailor Moi University', 'clothes repair', 'dress alteration', 'custom student outfits', 'curtain stitching'
  ],
  'mitumba-thrift': [
    'thrift clothes Moi', 'camera mtumba', 'hoodies Kesses', 'cargo pants', 'denim jackets', 'shoes thrift'
  ],
  'clothing-boutiques': [
    'new clothes Moi', 'fashion boutique Kesses', 'student wear', 'campus dresses'
  ],
  'shoes-footwear': [
    'sneakers Moi University', 'crocs', 'boots Kesses', 'open shoes sandals'
  ],
  'bags-accessories': [
    'backpacks Moi', 'laptop bags Kesses', 'tote bags', 'wallets belts'
  ],
  'shoe-repair': [
    'cobbler Kesses', 'shoe repair fundi Moi', 'sneaker washing', 'heel replacement'
  ],
  // Beauty & Personal Care
  'hair-beauty-kinyozi': [
    'barbershop Moi', 'kinyozi Kesses', 'haircut', 'shave and beard trim', 'hair dye',
    'scrub', 'hair salon Soweto', 'salon Stage', 'braids Moi', 'knotless braids', 'lines', 'dreadlocks retouch'
  ],
  'nails-makeup': [
    'acrylic nails Moi', 'gel polish Kesses', 'eyelash extensions', 'makeup artist campus', 'pedicure manicure'
  ],
  'cosmetics-skincare': [
    'skin care products', 'lip gloss', 'perfumes', 'lotions', 'campus beauty shop'
  ],
  'spa-massage': [
    'massage Kesses', 'facial scrub', 'relaxation spa'
  ],
  // Health & Wellness
  'pharmacy-health': [
    'chemist Kesses', 'pharmacy near Moi University', 'prescription drugs', 'painkillers',
    'first aid', 'sanitary towels', 'flu medicine'
  ],
  'clinics-dental': [
    'clinic Kesses', 'student consultation', 'dental clinic Moi University', 'lab tests'
  ],
  'optical-eyecare': [
    'reading glasses', 'eye test Moi', 'frames and lenses'
  ],
  'counselling-wellbeing': [
    'mental wellbeing', 'student counselling', 'peer guidance'
  ],
  // Tech & Electronics
  'phone-laptop-repair': [
    'phone screen repair', 'laptop repair Kesses', 'cracked phone screen', 'battery replacement',
    'motherboard diagnosis', 'charging port fix', 'laptop not charging', 'Kevin phones', 'phone fundi'
  ],
  'wifi-tech-gadgets': [
    'wifi installation Kesses', 'wifi router', 'chargers', 'earphones', 'usb cable',
    'power bank', 'flash drive', 'screen protector'
  ],
  'electronics-accessories': [
    'extension socket', 'hdmi cable', 'aux cable', 'subwoofer speaker', 'bluetooth speaker'
  ],
  'internet-installation': [
    'room wifi setup', 'lan cable crimping', 'monthly wifi subscription Kesses'
  ],
  'software-design': [
    'laptop windows installation', 'anti-virus activation', 'graphic design', 'poster flyer design'
  ],
  // Study & Career
  'printing-cyber': [
    'cyber cafe Moi University', 'printing exam notes', 'photocopying', 'spiral binding',
    'hardcover project binding', 'scanning', 'laminating', 'passport photos'
  ],
  'tutors-academics': [
    'statistics tutor Moi', 'engineering math coaching', 'accounting revision', 'assignment guidance'
  ],
  'stationery-books': [
    'stationery shop Moi', 'scientific calculator Kesses', 'graph paper', 'pens books', 'exam revision materials'
  ],
  'driving-skills': [
    'driving school Kesses', 'NTSA driving lessons Moi'
  ],
  'career-services': [
    'CV design Moi', 'internship application help', 'cover letter writing'
  ],
  // Transport & Delivery
  'boda-transport': [
    'boda boda Kesses', 'motorcycle ride to town', 'hostel pickup boda', 'stage to main gate', 'late night boda Moi'
  ],
  'taxis-shuttles': [
    'Eldoret airport transfer', 'Kesses to Eldoret town shuttle', 'matatu stage Moi'
  ],
  'courier-delivery': [
    'parcel delivery Kesses', 'Speedaf pickup', 'Fargo courier Moi', 'errands rider'
  ],
  'vehicle-repair': [
    'mechanic Kesses', 'motorbike repair', 'car battery jumpstart'
  ],
  'car-wash': [
    'boda wash Kesses', 'car wash Stage'
  ],
  // Money & Services
  'mpesa-banking': [
    'M-Pesa agent Moi', 'Equity bank agent', 'KCB agent Kesses', 'cash withdrawal deposit'
  ],
  'professional-services': [
    'legal commissioner of oaths', 'accounting help', 'business registration'
  ],
  // Leisure & Events
  'photography-video': [
    'graduation photos Moi', 'studio photoshoot Kesses', 'passport photos', 'event video coverage'
  ],
  'gyms-fitness': [
    'gym Kesses', 'fitness workout Moi', 'weights and cardio'
  ],
  'gaming-entertainment': [
    'PlayStation gaming den Moi', 'PS5 Kesses', 'movie shop series movies'
  ],
  'sports-outdoors': [
    'football kits', 'badminton rackets', 'sports shoes'
  ],
  'bars-lounges': [
    'student lounge', 'sports bar Kesses', 'weekend chill spot'
  ],
  'events-djs': [
    'DJ sound system rental', 'event PA system', 'party lighting'
  ],
  'gifts-flowers': [
    'gift hampers', 'flowers delivery Moi University', 'chocolate gifts'
  ],
  'travel-accommodation': [
    'guest rooms Kesses', 'visitor accommodation Moi University', 'bed and breakfast'
  ],
  // Cleaning & Repairs
  'laundry-mama-fua': [
    'mama fua Kesses', 'laundry service Moi University', 'duvet cleaning', 'clothes washing',
    'ironing service', 'hostel laundry pickup'
  ],
  'cleaning-services': [
    'room deep clean Kesses', 'moving-in cleaning', 'hostel cleaning'
  ],
  'plumbing-electrical': [
    'electrician Moi', 'plumber Kesses', 'socket repair', 'water shower fix',
    'room wiring fundi', 'breaker repair'
  ],
  'carpentry-welding': [
    'carpenter Moi University', 'welder Kesses', 'bed repair fundi', 'study table maker'
  ],
  'appliance-repair': [
    'electric kettle repair Moi', 'iron box fundi Kesses', 'subwoofer repair', 'cooker repair'
  ],
  'other-local-services': [
    'campus fundi', 'local business Kesses', 'student services'
  ],
};

/** Map category slug to Schema.org subtype */
export function resolveSchemaType(primaryCategory: string): string {
  if (primaryCategory.includes('food') || primaryCategory.includes('restaurant') || primaryCategory.includes('eateries')) {
    return 'Restaurant';
  }
  if (primaryCategory.includes('cake') || primaryCategory.includes('bakes')) {
    return 'Bakery';
  }
  if (primaryCategory.includes('tea') || primaryCategory.includes('coffee')) {
    return 'CafeOrCoffeeShop';
  }
  if (primaryCategory.includes('kinyozi') || primaryCategory.includes('barber')) {
    return 'BarberShop';
  }
  if (primaryCategory.includes('beauty') || primaryCategory.includes('salon') || primaryCategory.includes('nails') || primaryCategory.includes('makeup')) {
    return 'BeautySalon';
  }
  if (primaryCategory.includes('spa') || primaryCategory.includes('massage')) {
    return 'DaySpa';
  }
  if (primaryCategory.includes('phone') || primaryCategory.includes('laptop') || primaryCategory.includes('tech') || primaryCategory.includes('gadgets') || primaryCategory.includes('electronics')) {
    return 'ElectronicsStore';
  }
  if (primaryCategory.includes('hostel') || primaryCategory.includes('rooms')) {
    return 'LodgingBusiness';
  }
  if (primaryCategory.includes('rental-agents')) {
    return 'RealEstateAgent';
  }
  if (primaryCategory.includes('pharmacy') || primaryCategory.includes('health') || primaryCategory.includes('chemist')) {
    return 'Pharmacy';
  }
  if (primaryCategory.includes('clinics') || primaryCategory.includes('dental')) {
    return 'MedicalClinic';
  }
  if (primaryCategory.includes('optical')) {
    return 'Optician';
  }
  if (primaryCategory.includes('boda') || primaryCategory.includes('taxis') || primaryCategory.includes('transport')) {
    return 'TaxiService';
  }
  if (primaryCategory.includes('printing') || primaryCategory.includes('cyber') || primaryCategory.includes('professional') || primaryCategory.includes('software')) {
    return 'ProfessionalService';
  }
  if (primaryCategory.includes('laundry') || primaryCategory.includes('mama-fua')) {
    return 'DryCleaningOrLaundry';
  }
  if (primaryCategory.includes('clothing') || primaryCategory.includes('mitumba') || primaryCategory.includes('boutique') || primaryCategory.includes('fashion') || primaryCategory.includes('tailoring')) {
    return 'ClothingStore';
  }
  if (primaryCategory.includes('shoes')) {
    return 'ShoeStore';
  }
  if (primaryCategory.includes('fresh-produce') || primaryCategory.includes('shops-supermarkets') || primaryCategory.includes('grocery')) {
    return 'GroceryStore';
  }
  if (primaryCategory.includes('butcheries') || primaryCategory.includes('fish')) {
    return 'ButcherShop';
  }
  if (primaryCategory.includes('stationery') || primaryCategory.includes('books')) {
    return 'BookStore';
  }
  if (primaryCategory.includes('tutors') || primaryCategory.includes('driving')) {
    return 'EducationalOrganization';
  }
  if (primaryCategory.includes('mpesa') || primaryCategory.includes('banking')) {
    return 'FinancialService';
  }
  if (primaryCategory.includes('photography')) {
    return 'PhotographyStore';
  }
  if (primaryCategory.includes('gym')) {
    return 'ExerciseGym';
  }
  if (primaryCategory.includes('bars') || primaryCategory.includes('lounges')) {
    return 'BarOrPub';
  }
  if (primaryCategory.includes('plumbing') || primaryCategory.includes('electrical')) {
    return 'Plumber';
  }
  if (primaryCategory.includes('vehicle-repair')) {
    return 'AutoRepair';
  }
  if (primaryCategory.includes('car-wash')) {
    return 'AutoWash';
  }
  if (primaryCategory.includes('shop') || primaryCategory.includes('gas') || primaryCategory.includes('store') || primaryCategory.includes('hardware')) {
    return 'Store';
  }
  return 'LocalBusiness';
}

/** Get rich SEO details for a specific leaf category OR category group */
export function getCategorySeoData(categorySlug: string) {
  // Check leaf category first
  const leafCategory = CATEGORIES.find((c) => c.slug === categorySlug);
  const groupFromLeaf = CATEGORY_GROUPS.find((g) => g.slug === leafCategory?.group);

  // Check top-level category group if not a leaf category
  const categoryGroup = CATEGORY_GROUPS.find((g) => g.slug === categorySlug);

  const isGroup = !leafCategory && Boolean(categoryGroup);
  const categoryName = leafCategory?.name || categoryGroup?.name || categorySlug.replace(/-/g, ' ').toUpperCase();
  const groupName = leafCategory ? groupFromLeaf?.name || 'Campus Services' : categoryGroup?.name || 'Campus Services';

  // Aggregate synonyms
  let synonyms = CATEGORY_SYNONYMS[categorySlug];
  if (!synonyms && isGroup && categoryGroup) {
    // Collect synonyms from all leaf categories belonging to this group
    const leafSlugs = CATEGORIES.filter((c) => c.group === categoryGroup.slug).map((c) => c.slug);
    synonyms = Array.from(new Set(leafSlugs.flatMap((s) => CATEGORY_SYNONYMS[s] || [])));
  }
  if (!synonyms || synonyms.length === 0) {
    synonyms = [categoryName.toLowerCase(), 'services', 'shops'];
  }

  const title = `${categoryName} in Moi University (Kesses) | Campus Directory`;
  const description = isGroup
    ? `Explore all verified ${categoryName.toLowerCase()} around Moi University Main Campus (Kesses). Find shops, fundis, and student services across Soweto, Cheboiywo, Stage, Kesses Centre & Main Gate with WhatsApp & direct phone contacts.`
    : `Find top ${categoryName.toLowerCase()} around Moi University Main Campus (Kesses). Discover verified shops and services across Soweto, Cheboiywo, Stage, Kesses Centre & Main Gate with direct WhatsApp & phone contacts.`;

  const keywords = Array.from(
    new Set([
      categoryName,
      `${categoryName} Moi University`,
      `${categoryName} Kesses`,
      groupName,
      ...synonyms,
      ...synonyms.map((s) => `${s} Moi University`),
      ...synonyms.map((s) => `${s} Kesses`),
      'Soweto',
      'Cheboiywo',
      'Stage',
      'Kesses Centre',
      'Main Gate',
      'Moi University directory',
    ])
  );

  return {
    category: leafCategory,
    categoryGroup,
    isGroup,
    categoryName,
    groupName,
    title,
    description,
    keywords,
    synonyms,
  };
}

/** Get rich SEO details for an individual business */
export function getBusinessSeoData(business: Business) {
  const category = CATEGORIES.find((c) => c.slug === business.primaryCategory);
  const zone = ZONES.find((z) => z.slug === business.zone);
  const categoryName = category?.name || 'Local Business';
  const zoneName = zone?.name || business.zone.replace(/-/g, ' ');

  const serviceNames = (business.services || [])
    .map((s) => s.name)
    .filter(Boolean)
    .slice(0, 4)
    .join(', ');

  // Keep title punchy and localized (Next.js layout template will append "| MoiMashinani")
  const title = `${business.name} – ${categoryName} in ${zoneName}, Kesses`;

  let description = `${business.name} in ${zoneName}, Moi University (Kesses). `;
  if (business.tagline) {
    description += `${business.tagline}. `;
  } else if (business.description) {
    description += `${business.description.slice(0, 110)}... `;
  }
  if (serviceNames) {
    description += `Services: ${serviceNames}. `;
  }
  description += `Call ${business.phone} or order on WhatsApp via MoiMashinani.`;

  const coverRaw = business.coverPhoto || business.photos?.[0] || '/brand/og-image.png';
  const coverImage = coverRaw.startsWith('http') ? coverRaw : `${SITE_URL}${coverRaw}`;

  const keywords = Array.from(
    new Set([
      business.name,
      categoryName,
      zoneName,
      'Moi University',
      'Kesses',
      'Eldoret',
      ...business.tags,
      ...(business.services || []).map((s) => s.name),
      `${categoryName} Kesses`,
      `${categoryName} Moi University`,
      `${business.name} ${zoneName}`,
      'campus business',
      'student directory',
    ])
  );

  const schemaType = resolveSchemaType(business.primaryCategory);

  return {
    categoryName,
    zoneName,
    title,
    description,
    keywords,
    coverImage,
    schemaType,
    serviceNames,
  };
}

/** Global WebSite Schema for SearchAction */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    alternateName: ['Moi Mashinani', 'Moi University Campus Directory', 'MoiMashinani Directory'],
    url: SITE_URL,
    description: 'Hyper-local business and services directory for Moi University Main Campus (Kesses).',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

/** Global Organization Schema */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/moimashinani-logo.svg`,
    description: 'The campus business directory connecting Moi University students, staff and residents with verified local shops, services and fundis in Kesses.',
    areaServed: {
      '@type': 'Place',
      name: 'Moi University, Kesses, Uasin Gishu County, Kenya',
    },
  };
}

/** BreadcrumbList Schema */
export function generateBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE_URL}${item.url}`,
    })),
  };
}

/** LocalBusiness Schema for a specific business */
export function generateLocalBusinessSchema(business: Business) {
  const { schemaType } = getBusinessSeoData(business);
  const rawPhotos = Array.from(new Set([business.coverPhoto, ...business.photos].filter(Boolean)));
  const photos = rawPhotos.map((p) => (p.startsWith('http') ? p : `${SITE_URL}${p}`));

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name: business.name,
    description: business.description || business.tagline,
    url: `${SITE_URL}/b/${business.slug}`,
    telephone: business.phone,
    currenciesAccepted: 'KES',
    paymentAccepted: 'Cash, M-Pesa',
    image: photos.length > 0 ? photos : [`${SITE_URL}/brand/og-image.png`],
    address: {
      '@type': 'PostalAddress',
      streetAddress: business.landmark || 'Moi University Main Campus',
      addressLocality: 'Kesses',
      addressRegion: 'Uasin Gishu County',
      addressCountry: 'KE',
    },
    areaServed: {
      '@type': 'Place',
      name: 'Moi University Main Campus & Environs (Kesses)',
    },
    priceRange: business.priceLevel === 1 ? 'KES' : 'KES KES',
  };

  if (business.whatsapp) {
    const rawWa = business.whatsapp.replace(/\D/g, '');
    const wa = rawWa.startsWith('0') ? '254' + rawWa.slice(1) : rawWa;
    schema.sameAs = [`https://wa.me/${wa}`];
  }

  if (business.mapPin && typeof business.mapPin.lat === 'number' && typeof business.mapPin.lng === 'number') {
    schema.geo = {
      '@type': 'GeoCoordinates',
      latitude: business.mapPin.lat,
      longitude: business.mapPin.lng,
    };
  }

  if (business.hours && Object.keys(business.hours).length > 0) {
    const openingHoursSpecs = Object.entries(business.hours)
      .filter(([, h]) => h && h.open && h.close)
      .map(([day, h]) => ({
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: `https://schema.org/${day.charAt(0).toUpperCase() + day.slice(1)}`,
        opens: h.open,
        closes: h.close,
      }));
    if (openingHoursSpecs.length > 0) {
      schema.openingHoursSpecification = openingHoursSpecs;
    }
  }

  if (business.services && business.services.length > 0) {
    schema.hasOfferCatalog = {
      '@type': 'OfferCatalog',
      name: `${business.name} Services & Catalog`,
      itemListElement: business.services.map((service) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: service.name,
        },
        price: service.priceFrom ?? 0,
        priceCurrency: 'KES',
      })),
    };
  }

  return schema;
}

/** Category or Group ItemList Schema */
export function generateCategoryItemListSchema(categorySlug: string, businesses: Business[]) {
  const { categoryName, description } = getCategorySeoData(categorySlug);

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `${categoryName} around Moi University (Kesses)`,
    description,
    numberOfItems: businesses.length,
    itemListElement: businesses.map((business, index) => {
      const imgRaw = business.coverPhoto || business.photos?.[0] || '/brand/og-image.png';
      const img = imgRaw.startsWith('http') ? imgRaw : `${SITE_URL}${imgRaw}`;
      return {
        '@type': 'ListItem',
        position: index + 1,
        name: business.name,
        url: `${SITE_URL}/b/${business.slug}`,
        description: business.tagline || business.description?.slice(0, 100),
        image: img,
      };
    }),
  };
}

