import type { Business, Category } from './types';

export const CATEGORY_GROUPS = [
  {
    "slug": "food-drinks",
    "name": "Food & refreshments",
    "icon": "restaurant"
  },
  {
    "slug": "daily-essentials",
    "name": "Groceries & daily essentials",
    "icon": "shopping_bag"
  },
  {
    "slug": "housing-home",
    "name": "Housing & home",
    "icon": "apartment"
  },
  {
    "slug": "fashion-clothing",
    "name": "Clothing, shoes & accessories",
    "icon": "checkroom"
  },
  {
    "slug": "beauty-care",
    "name": "Beauty & personal care",
    "icon": "content_cut"
  },
  {
    "slug": "health-wellness",
    "name": "Health & wellness",
    "icon": "health_and_safety"
  },
  {
    "slug": "tech-electronics",
    "name": "Tech & electronics",
    "icon": "router"
  },
  {
    "slug": "study-career",
    "name": "Study, stationery & career",
    "icon": "school"
  },
  {
    "slug": "transport-delivery",
    "name": "Transport & delivery",
    "icon": "two_wheeler"
  },
  {
    "slug": "money-services",
    "name": "Money & business services",
    "icon": "payments"
  },
  {
    "slug": "leisure-events",
    "name": "Leisure, sports & events",
    "icon": "sports_esports"
  },
  {
    "slug": "cleaning-repairs",
    "name": "Cleaning, repairs & fundis",
    "icon": "build"
  }
] as const;

export const CATEGORIES: Category[] = [
  {
    "id": "food-cafes",
    "slug": "food-cafes",
    "name": "Food & Cafes",
    "icon": "restaurant",
    "description": "Fast bites, loaded chips, layered chapo, smokies & hostel delivery",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "cakes-bakes",
    "slug": "cakes-bakes",
    "name": "Cakes & Bakery",
    "icon": "cake",
    "description": "Custom birthday cakes, mini cupcakes & campus celebration snacks",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "restaurants-eateries",
    "slug": "restaurants-eateries",
    "name": "Restaurants & eateries",
    "description": "Affordable meals, kibandas, ugali, rice, chapati and nyama choma",
    "icon": "restaurant",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "street-food-snacks",
    "slug": "street-food-snacks",
    "name": "Street food & snacks",
    "description": "Smokies, mayai, mutura, chips, samosas, mandazi and roasted maize",
    "icon": "restaurant",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "tea-coffee",
    "slug": "tea-coffee",
    "name": "Tea & coffee shops",
    "description": "Chai, coffee, breakfast and places to sit between classes",
    "icon": "restaurant",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "juice-smoothies",
    "slug": "juice-smoothies",
    "name": "Juice, smoothies & refreshments",
    "description": "Fresh juice, smoothies, soda, ice cream and cold drinks",
    "icon": "restaurant",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "meal-delivery-catering",
    "slug": "meal-delivery-catering",
    "name": "Meal delivery & catering",
    "description": "Hostel meal delivery, meal plans and event catering",
    "icon": "restaurant",
    "color": "#945b36",
    "group": "food-drinks"
  },
  {
    "id": "gas-groceries",
    "slug": "gas-groceries",
    "name": "Cooking Gas & Groceries",
    "icon": "local_fire_department",
    "description": "6kg & 13kg cooking gas refill delivery to hostel floor & fresh greens",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "shops-supermarkets",
    "slug": "shops-supermarkets",
    "name": "Shops & supermarkets",
    "description": "Dukas, minimarts, toiletries, snacks and household shopping",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "fresh-produce",
    "slug": "fresh-produce",
    "name": "Fruit & vegetable stalls",
    "description": "Mama mboga, fresh fruits, vegetables and market produce",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "butcheries-fish",
    "slug": "butcheries-fish",
    "name": "Butcheries & fish shops",
    "description": "Meat, chicken, fish and eggs",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "milk-dairy",
    "slug": "milk-dairy",
    "name": "Milk & dairy shops",
    "description": "Fresh milk, yoghurt, mala and dairy products",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "cooking-gas",
    "slug": "cooking-gas",
    "name": "Cooking gas & refills",
    "description": "LPG cylinders, gas refills, burners and hostel delivery",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "water-delivery",
    "slug": "water-delivery",
    "name": "Drinking water & delivery",
    "description": "Refill stations, bottled water and water delivery",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "household-essentials",
    "slug": "household-essentials",
    "name": "Household & personal essentials",
    "description": "Cleaning supplies, sanitary products, toiletries and detergents",
    "icon": "shopping_bag",
    "color": "#335e41",
    "group": "daily-essentials"
  },
  {
    "id": "hostels-rooms",
    "slug": "hostels-rooms",
    "name": "Hostels & Vacancies",
    "icon": "apartment",
    "description": "Verified bedsitters, single rooms, token electricity & caretakers",
    "color": "#4d6350",
    "group": "housing-home"
  },
  {
    "id": "rental-agents",
    "slug": "rental-agents",
    "name": "Rental agents & caretakers",
    "description": "Room searches, bedsitters, apartments and property agents",
    "icon": "apartment",
    "color": "#4d6350",
    "group": "housing-home"
  },
  {
    "id": "furniture-bedding",
    "slug": "furniture-bedding",
    "name": "Furniture & bedding",
    "description": "Beds, mattresses, desks, chairs, duvets and curtains",
    "icon": "apartment",
    "color": "#4d6350",
    "group": "housing-home"
  },
  {
    "id": "kitchen-homeware",
    "slug": "kitchen-homeware",
    "name": "Kitchenware & appliances",
    "description": "Utensils, cookware, kettles and small home appliances",
    "icon": "apartment",
    "color": "#4d6350",
    "group": "housing-home"
  },
  {
    "id": "moving-storage",
    "slug": "moving-storage",
    "name": "Moving & storage",
    "description": "Room moves, luggage storage and furniture transport",
    "icon": "apartment",
    "color": "#4d6350",
    "group": "housing-home"
  },
  {
    "id": "tailoring-fashion",
    "slug": "tailoring-fashion",
    "name": "Tailoring & Alterations",
    "icon": "checkroom",
    "description": "Custom dresses, graduation suit sizing, zip repair & curtains",
    "color": "#8b795c",
    "group": "fashion-clothing"
  },
  {
    "id": "mitumba-thrift",
    "slug": "mitumba-thrift",
    "name": "Mitumba & thrift shops",
    "description": "Affordable secondhand clothes, thrift stalls and student resellers",
    "icon": "checkroom",
    "color": "#8b795c",
    "group": "fashion-clothing"
  },
  {
    "id": "clothing-boutiques",
    "slug": "clothing-boutiques",
    "name": "Clothing & boutiques",
    "description": "Everyday outfits, dresses, suits, sportswear and graduation wear",
    "icon": "checkroom",
    "color": "#8b795c",
    "group": "fashion-clothing"
  },
  {
    "id": "shoes-footwear",
    "slug": "shoes-footwear",
    "name": "Shoes & footwear",
    "description": "Sneakers, sandals, official shoes and slippers",
    "icon": "checkroom",
    "color": "#8b795c",
    "group": "fashion-clothing"
  },
  {
    "id": "bags-accessories",
    "slug": "bags-accessories",
    "name": "Bags, jewellery & accessories",
    "description": "Backpacks, handbags, watches, jewellery and belts",
    "icon": "checkroom",
    "color": "#8b795c",
    "group": "fashion-clothing"
  },
  {
    "id": "shoe-repair",
    "slug": "shoe-repair",
    "name": "Shoe repair & cleaning",
    "description": "Cobblers, sole repairs, shoe washing and restoration",
    "icon": "checkroom",
    "color": "#8b795c",
    "group": "fashion-clothing"
  },
  {
    "id": "hair-beauty-kinyozi",
    "slug": "hair-beauty-kinyozi",
    "name": "Salons & Kinyozi",
    "icon": "content_cut",
    "description": "Knotless braids, dreadlocks retwist, fades, salon styling & pedicures",
    "color": "#8b795c",
    "group": "beauty-care"
  },
  {
    "id": "nails-makeup",
    "slug": "nails-makeup",
    "name": "Nails, makeup & lashes",
    "description": "Manicures, pedicures, makeup artists, lash and brow services",
    "icon": "content_cut",
    "color": "#8b795c",
    "group": "beauty-care"
  },
  {
    "id": "cosmetics-skincare",
    "slug": "cosmetics-skincare",
    "name": "Cosmetics & skincare",
    "description": "Beauty products, hair products, perfumes and skincare",
    "icon": "content_cut",
    "color": "#8b795c",
    "group": "beauty-care"
  },
  {
    "id": "spa-massage",
    "slug": "spa-massage",
    "name": "Spa & massage",
    "description": "Massage, facials and wellness treatments",
    "icon": "content_cut",
    "color": "#8b795c",
    "group": "beauty-care"
  },
  {
    "id": "pharmacy-health",
    "slug": "pharmacy-health",
    "name": "Pharmacies & chemists",
    "description": "Medicines, health supplies and pharmacist services",
    "icon": "health_and_safety",
    "color": "#557c6a",
    "group": "health-wellness"
  },
  {
    "id": "clinics-dental",
    "slug": "clinics-dental",
    "name": "Clinics & dental care",
    "description": "Medical consultations, testing, dental care and treatment",
    "icon": "health_and_safety",
    "color": "#557c6a",
    "group": "health-wellness"
  },
  {
    "id": "optical-eyecare",
    "slug": "optical-eyecare",
    "name": "Optical & eye care",
    "description": "Eye tests, prescription glasses and lens services",
    "icon": "health_and_safety",
    "color": "#557c6a",
    "group": "health-wellness"
  },
  {
    "id": "counselling-wellbeing",
    "slug": "counselling-wellbeing",
    "name": "Counselling & wellbeing",
    "description": "Counselling, therapy and mental wellbeing support",
    "icon": "health_and_safety",
    "color": "#557c6a",
    "group": "health-wellness"
  },
  {
    "id": "phone-laptop-repair",
    "slug": "phone-laptop-repair",
    "name": "Phone & Laptop Repair",
    "icon": "build",
    "description": "Screens, batteries, charging ports, water damage & OS installation",
    "color": "#335e41",
    "group": "tech-electronics"
  },
  {
    "id": "wifi-tech-gadgets",
    "slug": "wifi-tech-gadgets",
    "name": "Wi-Fi & Tech Gadgets",
    "icon": "router",
    "description": "Portable routers, original fast chargers, flash drives & cords",
    "color": "#183e35",
    "group": "tech-electronics"
  },
  {
    "id": "electronics-accessories",
    "slug": "electronics-accessories",
    "name": "Phones, computers & accessories",
    "description": "Phone and laptop sales, earphones, chargers and electronics",
    "icon": "router",
    "color": "#183e35",
    "group": "tech-electronics"
  },
  {
    "id": "internet-installation",
    "slug": "internet-installation",
    "name": "Internet & Wi-Fi installation",
    "description": "Home internet, Wi-Fi subscriptions and router setup",
    "icon": "router",
    "color": "#183e35",
    "group": "tech-electronics"
  },
  {
    "id": "software-design",
    "slug": "software-design",
    "name": "Software & digital services",
    "description": "Websites, app development, graphic design and IT support",
    "icon": "router",
    "color": "#183e35",
    "group": "tech-electronics"
  },
  {
    "id": "printing-cyber",
    "slug": "printing-cyber",
    "name": "Printing & Cyber",
    "icon": "print",
    "description": "Thesis binding, glossy color printing, passport photos & HELB loans",
    "color": "#557c6a",
    "group": "study-career"
  },
  {
    "id": "tutors-academics",
    "slug": "tutors-academics",
    "name": "Tutors & Revision",
    "icon": "school",
    "description": "Engineering, Calculus, Medical sciences, Economics & past papers",
    "color": "#557c6a",
    "group": "study-career"
  },
  {
    "id": "stationery-books",
    "slug": "stationery-books",
    "name": "Stationery & bookshops",
    "description": "Notebooks, pens, textbooks, revision books and lab supplies",
    "icon": "school",
    "color": "#557c6a",
    "group": "study-career"
  },
  {
    "id": "driving-skills",
    "slug": "driving-skills",
    "name": "Driving schools & skills training",
    "description": "Driving lessons, computer courses, language and vocational training",
    "icon": "school",
    "color": "#557c6a",
    "group": "study-career"
  },
  {
    "id": "career-services",
    "slug": "career-services",
    "name": "CV & career services",
    "description": "CV writing, job applications, interview practice and career support",
    "icon": "school",
    "color": "#557c6a",
    "group": "study-career"
  },
  {
    "id": "boda-transport",
    "slug": "boda-transport",
    "name": "Boda boda & motorcycle rides",
    "description": "Boda rides around campus, Kesses and nearby estates",
    "icon": "two_wheeler",
    "color": "#4d6350",
    "group": "transport-delivery"
  },
  {
    "id": "taxis-shuttles",
    "slug": "taxis-shuttles",
    "name": "Taxis, matatus & shuttles",
    "description": "Taxi rides, campus shuttles, matatu routes and group travel",
    "icon": "two_wheeler",
    "color": "#4d6350",
    "group": "transport-delivery"
  },
  {
    "id": "courier-delivery",
    "slug": "courier-delivery",
    "name": "Couriers & errands",
    "description": "Parcel collection, shopping errands and delivery riders",
    "icon": "two_wheeler",
    "color": "#4d6350",
    "group": "transport-delivery"
  },
  {
    "id": "vehicle-repair",
    "slug": "vehicle-repair",
    "name": "Vehicle & bike repair",
    "description": "Mechanics, puncture repair, servicing and spare parts",
    "icon": "two_wheeler",
    "color": "#4d6350",
    "group": "transport-delivery"
  },
  {
    "id": "car-wash",
    "slug": "car-wash",
    "name": "Car & motorbike wash",
    "description": "Vehicle cleaning, detailing and motorbike washing",
    "icon": "two_wheeler",
    "color": "#4d6350",
    "group": "transport-delivery"
  },
  {
    "id": "mpesa-banking",
    "slug": "mpesa-banking",
    "name": "M-Pesa & banking agents",
    "description": "Cash withdrawals, deposits, mobile money and bank agents",
    "icon": "payments",
    "color": "#335e41",
    "group": "money-services"
  },
  {
    "id": "professional-services",
    "slug": "professional-services",
    "name": "Professional & business services",
    "description": "Accounting, tax filing, legal services and business registration",
    "icon": "payments",
    "color": "#335e41",
    "group": "money-services"
  },
  {
    "id": "photography-video",
    "slug": "photography-video",
    "name": "Photography & Media",
    "icon": "photo_camera",
    "description": "Graduation shoots, studio portraits, events, video coverage & prints",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "gyms-fitness",
    "slug": "gyms-fitness",
    "name": "Gyms & fitness",
    "description": "Gym sessions, trainers, aerobics and fitness classes",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "gaming-entertainment",
    "slug": "gaming-entertainment",
    "name": "Gaming & entertainment",
    "description": "PlayStation lounges, pool tables, movie rooms and games",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "sports-outdoors",
    "slug": "sports-outdoors",
    "name": "Sports & outdoor activities",
    "description": "Sports gear, pitches, outdoor activities and equipment hire",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "bars-lounges",
    "slug": "bars-lounges",
    "name": "Bars & lounges",
    "description": "Pubs, bars, lounges and nightlife venues",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "events-djs",
    "slug": "events-djs",
    "name": "Events, DJs & equipment hire",
    "description": "DJs, sound systems, tents, decor and event planning",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "gifts-flowers",
    "slug": "gifts-flowers",
    "name": "Gifts, flowers & party supplies",
    "description": "Bouquets, birthday gifts, balloons and celebration supplies",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "travel-accommodation",
    "slug": "travel-accommodation",
    "name": "Travel & short stays",
    "description": "Guesthouses, hotels, short stays, trips and tours",
    "icon": "sports_esports",
    "color": "#945b36",
    "group": "leisure-events"
  },
  {
    "id": "laundry-mama-fua",
    "slug": "laundry-mama-fua",
    "name": "Laundry & Mama Fua",
    "icon": "local_laundry_service",
    "description": "Hostel pickup, clothes washing, duvet cleaning, pressing & folding",
    "color": "#557c6a",
    "group": "cleaning-repairs"
  },
  {
    "id": "cleaning-services",
    "slug": "cleaning-services",
    "name": "Cleaning & pest control",
    "description": "Room cleaning, deep cleaning, fumigation and pest removal",
    "icon": "build",
    "color": "#557c6a",
    "group": "cleaning-repairs"
  },
  {
    "id": "plumbing-electrical",
    "slug": "plumbing-electrical",
    "name": "Plumbers & electricians",
    "description": "Water leaks, wiring, sockets, lighting and electrical repairs",
    "icon": "build",
    "color": "#557c6a",
    "group": "cleaning-repairs"
  },
  {
    "id": "carpentry-welding",
    "slug": "carpentry-welding",
    "name": "Carpenters & welders",
    "description": "Furniture repairs, shelves, metalwork and fittings",
    "icon": "build",
    "color": "#557c6a",
    "group": "cleaning-repairs"
  },
  {
    "id": "appliance-repair",
    "slug": "appliance-repair",
    "name": "Appliance repair",
    "description": "Cookers, kettles, fridges, TVs and other appliance repairs",
    "icon": "build",
    "color": "#557c6a",
    "group": "cleaning-repairs"
  },
  {
    "id": "other-local-services",
    "slug": "other-local-services",
    "name": "Other local businesses",
    "description": "Other campus shops, specialist services and student businesses",
    "icon": "build",
    "color": "#557c6a",
    "group": "cleaning-repairs"
  }
];

export function categoryMatches(business: Pick<Business, 'primaryCategory' | 'extraCategories'>, selection: string): boolean {
  const slugs = new Set([business.primaryCategory, ...business.extraCategories]);
  return slugs.has(selection) || CATEGORIES.some(category => category.group === selection && slugs.has(category.slug));
}

export function categorySearchText(category: Category): string {
  return `${category.name} ${category.description} ${CATEGORY_GROUPS.find(group => group.slug === category.group)?.name ?? ''}`.toLowerCase();
}
