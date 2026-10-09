import Link from "next/link";
import { connection } from "next/server";
import {
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  Check,

  Headphones,
  MapPin,
  MessageCircle,
  Plus,
  Printer,
  Scissors,
  Search,
  Shirt,
  ShoppingBag,
  Store as StoreIcon,
  UtensilsCrossed,
  Wrench,
  Building2,
  HeartPulse,
  Bike,
  CreditCard,
  Camera,
} from "lucide-react";
import { Store } from "@/lib/store";
import { CATEGORIES, ZONES } from "@/lib/constants";
import {
  LandingSearch,
  LocalDiscoveries,
  type LandingBusiness,
} from "@/components/landing/Discovery";
import styles from "./home.module.css";
import { CategoryBrowser } from "@/components/CategoryBrowser";
import { SiteBrand } from "@/components/SiteBrand";

const shortcuts = [
  { slug: 'food-drinks', label: 'Food & refreshments', icon: UtensilsCrossed, tone: 'peach' },
  { slug: 'daily-essentials', label: 'Daily essentials', icon: ShoppingBag, tone: 'mint' },
  { slug: 'housing-home', label: 'Housing & home', icon: Building2, tone: 'sand' },
  { slug: 'fashion-clothing', label: 'Clothes & shoes', icon: Shirt, tone: 'pink' },
  { slug: 'beauty-care', label: 'Beauty & hair', icon: Scissors, tone: 'pink' },
  { slug: 'tech-electronics', label: 'Tech & electronics', icon: Headphones, tone: 'lavender' },
  { slug: 'study-career', label: 'Study & career', icon: Printer, tone: 'blue' },
  { slug: 'health-wellness', label: 'Health & wellness', icon: HeartPulse, tone: 'mint' },
  { slug: 'transport-delivery', label: 'Transport & delivery', icon: Bike, tone: 'yellow' },
  { slug: 'money-services', label: 'Money & services', icon: CreditCard, tone: 'sand' },
  { slug: 'leisure-events', label: 'Leisure & events', icon: Camera, tone: 'peach' },
  { slug: 'cleaning-repairs', label: 'Cleaning & repairs', icon: Wrench, tone: 'yellow' },
];

function NeighborhoodScene() {
  return (
    <div className={styles.scene} aria-label="Explore businesses around campus">
      <div className={styles.sceneGrid} aria-hidden="true" />
      <svg
        className={styles.streets}
        viewBox="0 0 520 460"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M-30 240L160 130L345 230L540 115M155 -30L155 130L155 330L390 465M-20 425L155 330L345 230L345 -20"
          stroke="#cfdbcb"
          strokeWidth="34"
          strokeLinejoin="round"
        />
        <path
          d="M-30 240L160 130L345 230L540 115M155 -30L155 130L155 330L390 465M-20 425L155 330L345 230L345 -20"
          stroke="#f7faf0"
          strokeWidth="26"
          strokeLinejoin="round"
        />
        <path
          d="M155 330L155 130L345 230L435 179"
          stroke="#689481"
          strokeWidth="2"
          strokeDasharray="5 7"
          className={styles.routeLine}
        />
        <rect
          x="208"
          y="47"
          width="90"
          height="56"
          rx="13"
          fill="#cbdabd"
          transform="rotate(29 208 47)"
        />
        <rect
          x="342"
          y="320"
          width="112"
          height="67"
          rx="15"
          fill="#d5dfc3"
          transform="rotate(-28 342 320)"
        />
        <rect
          x="24"
          y="277"
          width="63"
          height="44"
          rx="9"
          fill="#ccdabc"
          transform="rotate(-29 24 277)"
        />
        <circle cx="65" cy="117" r="27" fill="#d1dfc1" />
        <circle cx="446" cy="281" r="21" fill="#c8d9b6" />
        <circle cx="264" cy="364" r="12" fill="#d3dfbe" />
        <circle cx="435" cy="77" r="15" fill="#c8d9b6" />
      </svg>
      <span className={styles.mapLabel}>A LITTLE CLOSER TO EVERYTHING</span>
      <Link
        href="/c/food-cafes"
        className={`${styles.sceneCard} ${styles.foodCard}`}
      >
        <div className={styles.foodIllustration} aria-hidden="true">
          <span className={styles.plate}>
            <span className={styles.burger}>
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
            <span className={styles.fries}>
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          </span>
          <span className={styles.foodSpark}>✳</span>
        </div>
        <span className={styles.sceneCardBody}>
          <span className={styles.tinyLabel}>FOOD & DRINKS</span>
          <strong>Cravings, sorted.</strong>
          <span>
            Find your next bite <ArrowUpRight size={15} />
          </span>
        </span>
      </Link>
      <Link
        href="/c/hair-beauty-kinyozi"
        className={`${styles.miniCard} ${styles.beautyCard}`}
      >
        <span className={styles.beautyIcon}>
          <Scissors size={23} />
        </span>
        <span>
          <small>A FRESH LOOK</small>
          <strong>Your next good hair day.</strong>
        </span>
        <ArrowUpRight size={17} />
      </Link>
      <Link
        href="/c/phone-laptop-repair"
        className={`${styles.miniCard} ${styles.repairCard}`}
      >
        <span className={styles.repairIcon}>
          <Wrench size={23} />
        </span>
        <span>
          <small>A QUICK FIX</small>
          <strong>There’s a fundi for that.</strong>
        </span>
        <ArrowUpRight size={17} />
      </Link>
      <span className={styles.campusPin}>
        <span>
          <MapPin size={22} fill="currentColor" stroke="white" />
        </span>
        <strong>Moi University</strong>
      </span>
      <span className={styles.sceneSticker} aria-hidden="true">
        GOOD
        <br />
        THINGS
        <br />
        NEARBY <ArrowDownRight size={25} />
      </span>
      <span className={styles.mapDot} aria-hidden="true">
        <ShoppingBag size={17} />
      </span>
      <span className={styles.sceneCaption}>
        <span /> Made for life around campus
      </span>
    </div>
  );
}

export default async function HomePage() {
  await connection();
  const active = (await Store.getBusinesses()).filter(
    (business) => business.status === "ACTIVE" && !business.isTemporarilyClosed,
  );
  // Only serialize the public fields needed by the discovery cards.
  const businesses: LandingBusiness[] = active.map(
    ({
      id,
      name,
      slug,
      tagline,
      primaryCategory,
      extraCategories,
      zone,
      coverPhoto,
      verificationLevel,
      services,
      studentDiscount,
      serviceModes,
    }) => ({
      id,
      name,
      slug,
      tagline,
      primaryCategory,
      extraCategories,
      zone,
      coverPhoto,
      verificationLevel,
      services,
      studentDiscount,
      serviceModes,
      categoryName:
        CATEGORIES.find((category) => category.slug === primaryCategory)
          ?.name ?? "Local business",
      zoneName: ZONES.find((item) => item.slug === zone)?.name ?? zone,
    }),
  );
  const firstCategories = [
    "food-cafes",
    "hair-beauty-kinyozi",
    "wifi-tech-gadgets",
    "printing-cyber",
  ];
  const leading = firstCategories.flatMap(
    (category) =>
      businesses.find((business) => business.primaryCategory === category) ??
      [],
  );
  const ordered = [
    ...leading,
    ...businesses.filter(
      (business) => !leading.some((item) => item.id === business.id),
    ),
  ];

  return (
    <div className={styles.page}>
      <a href="#landing-query" className={styles.skipLink}>
        Skip to search
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <SiteBrand className={styles.brand} />
          <nav className={styles.desktopNav} aria-label="Main navigation">
            <a href="#find" className={styles.activeNav}>
              Find something
            </a>
            <Link href="/deals">
              Student deals <span className={styles.newDot} />
            </Link>
            <a href="#for-business">For your business</a>
          </nav>
          <Link href="/onboard" className={styles.headerCta}>
            <Plus size={17} />
            <span>List your business</span>
            <span className={styles.freePill}>Free</span>
          </Link>
        </div>
      </header>
      <main className={styles.main}>
        <section className={styles.hero} id="find" aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <div className={styles.locationTag}>
              <span>
                <MapPin size={14} />
              </span>{" "}
              MOI UNIVERSITY & THE NEIGHBORHOOD
            </div>
            <h1 id="hero-title">
              Big needs.
              <br />
              <span>
                Local finds.
                <svg
                  viewBox="0 0 420 20"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 13Q191 -1 414 10M50 18Q234 5 389 17"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </h1>
            <p className={styles.heroDescription}>
              Your next meal, a quick fix, that thing you need.
              <br /> Find the people and places that have it.
            </p>
            <LandingSearch
              zones={ZONES.map(({ slug, name }) => ({ slug, name }))}
            />
            <div className={styles.ownerNudge}>
              <span className={styles.ownerNudgeIcon}>
                <StoreIcon size={17} />
              </span>
              <span>
                Got a business?{" "}
                <Link href="/onboard">
                  Let’s put you on the map. <ArrowUpRight size={15} />
                </Link>
              </span>
            </div>
          </div>
          <NeighborhoodScene />
        </section>
        <section className={styles.categories} aria-labelledby="category-title">
          <div className={styles.sectionHeading}>
            <h2 id="category-title">What’s on your list?</h2>
            <span>
              A whole neighborhood of possibilities <ArrowDown size={14} />
            </span>
          </div>
          <div className={styles.categoryGrid}>
            {shortcuts.map(({ slug, label, icon: Icon, tone }) => (
              <Link key={slug} href={`/search?category=${slug}`} className={styles.category}>
                <span className={`${styles.categoryIcon} ${styles[tone]}`}>
                  <Icon size={27} strokeWidth={1.65} />
                </span>
                <span>{label}</span>
              </Link>
            ))}

          </div>
          <details className={styles.moreCategories}>
            <summary>Browse all {CATEGORIES.length} business types</summary>
            <CategoryBrowser />
            <Link href="/categories" className="inline-flex py-3 text-sm font-semibold text-[#335e41]">Open all categories →</Link>
          </details>
        </section>
        <section
          className={styles.discoverySection}
          id="discover"
          aria-label="Discover local businesses"
        >
          <LocalDiscoveries businesses={ordered} />
        </section>
        <section
          className={styles.businessSection}
          id="for-business"
          aria-labelledby="business-title"
        >
          <div className={styles.businessCopy}>
            <span className={styles.eyebrow}>
              <span /> FOR THE PEOPLE WHO MAKE LOCAL HAPPEN
            </span>
            <h2 id="business-title">
              You do your thing.
              <br />
              We’ll help people find it.
            </h2>
            <p>
              A shop, a side hustle, a service. Give it a home where your next
              customer is already looking.
            </p>
            <Link href="/onboard" className={styles.businessCta}>
              List your business for free <ArrowUpRight size={19} />
            </Link>
            <div className={styles.businessBenefits}>
              <span>
                <Check size={15} /> Free to get listed
              </span>
              <span>
                <Check size={15} /> Customers contact you directly
              </span>
            </div>
            <Link href="/dashboard" className={styles.manageLink}>
              Already listed? Manage your business <ArrowUpRight size={13} />
            </Link>
          </div>
          <div className={styles.shopScene} aria-hidden="true">
            <span className={styles.shopStar}>✳</span>
            <div className={styles.shopRoof}>
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
            <div className={styles.shopFront}>
              <span className={styles.shopSmall}>
                YOUR BUSINESS, DISCOVERED.
              </span>
              <span className={styles.shopSign}>
                Hello,
                <br />
                neighbor<span>↗</span>
              </span>
              <span className={styles.shopOpen}>
                <span /> OPEN FOR BUSINESS
              </span>
            </div>
            <span className={styles.shopNotification}>
              <MessageCircle size={22} />
              <span>
                Your next customer?<strong>They’re around here.</strong>
              </span>
            </span>
          </div>
        </section>
        <div className={styles.lastLine}>
          <span>
            <MapPin size={17} /> Local people. Real connections.
          </span>
          <Link href="/search">
            Go find your thing <ArrowUpRight size={17} />
          </Link>
        </div>
      </main>
      <footer className={styles.footer}>
        <div>
          <SiteBrand small className={styles.brand} />
          <p>A little closer to everything.</p>
        </div>
        <nav aria-label="Footer navigation">
          <Link href="/search">Explore</Link>
          <Link href="/deals">Student deals</Link>
          <Link href="/dashboard">Business dashboard</Link>
          <Link href="/ambassador">Become an ambassador</Link>
        </nav>
        <span className={styles.footerLocation}>
          <MapPin size={13} /> Made for Moi. Rooted in Kesses.
        </span>
      </footer>
      <nav className={styles.mobileNav} aria-label="Quick navigation">
        <a href="#find">
          <Search size={18} /> Find something
        </a>
        <Link href="/onboard">
          <Plus size={18} /> List your business
        </Link>
      </nav>
    </div>
  );
}
