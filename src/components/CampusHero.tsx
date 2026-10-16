"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, BedDouble, MapPin, Printer, Search, Store, UtensilsCrossed, Wrench, X } from "lucide-react";
import { CampusZonePicker } from "./CampusZonePicker";
import styles from "./CampusHero.module.css";

const SHORTCUTS = [
  { slug: "food-cafes", label: "Food", detail: "Find your next bite", icon: UtensilsCrossed },
  { slug: "hostels-rooms", label: "Hostels", detail: "Find a place to call home", icon: BedDouble },
  { slug: "printing-cyber", label: "Printing", detail: "Beat that deadline", icon: Printer },
  { slug: "phone-laptop-repair", label: "Repairs", detail: "Get back up and running", icon: Wrench },
];

interface CampusHeroProps {
  zone: string;
  onZoneChange: (zone: string) => void;
  query: string;
  onQueryChange: (query: string) => void;
  ready: boolean;
}

export function CampusHero({ zone, onZoneChange, query, onQueryChange, ready }: CampusHeroProps) {
  const router = useRouter();
  const zoneQuery = zone === "all" ? "" : "&zone=" + encodeURIComponent(zone);

  return (
    <section className={styles.hero} aria-labelledby="campus-home-heading">
      <div className={styles.scene}>
        <div className={styles.backdrop} aria-hidden="true">
          <Image
            src="/images/university_gate.webp"
            alt=""
            fill
            sizes="(max-width: 639px) 100vw, (max-width: 1152px) 80vw, 880px"
            preload
            className={styles.photo}
          />
        </div>
        <div className={styles.copy}>
          <p className={styles.eyebrow}><span aria-hidden="true" /> YOUR CAMPUS. CONNECTED.</p>
          <h1 id="campus-home-heading">Less searching.<br /><span>More campus life.</span></h1>
          <p className={styles.intro}>A good meal. A room. A quick fix. Find what you need around Moi, compare prices, and talk to sellers directly.</p>
        </div>
        <p className={styles.location}><MapPin size={14} aria-hidden="true" /><span>Moi University <span className={styles.locationDetail}>· Main Gate, Kesses</span></span></p>
      </div>

      <div className={styles.dock}>
        <div className={styles.dockHeading}>
          <label htmlFor="landing-query">What do you need today?</label>
          <Link href={zone === "all" ? "/search" : "/search?zone=" + encodeURIComponent(zone)}>Explore all <ArrowUpRight size={15} aria-hidden="true" /></Link>
        </div>
        <div className={styles.controls}>
          <form
            role="search"
            aria-label="Find businesses around Moi"
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              const params = new URLSearchParams();
              if (query.trim()) params.set("q", query.trim());
              if (zone !== "all") params.set("zone", zone);
              router.push(params.size ? "/search?" + params.toString() : "/search");
            }}
          >
            <Search size={20} aria-hidden="true" className={styles.searchIcon} />
            <input id="landing-query" name="q" type="search" enterKeyHint="search" value={query}
              onChange={(event) => onQueryChange(event.target.value)} placeholder="Food, hostels, printing…" />
            {query && <button type="button" onClick={() => onQueryChange("")} aria-label="Clear search query" className={styles.clear}><X size={17} aria-hidden="true" /></button>}
            <button type="submit" className={styles.submit} aria-label="Search businesses"><span>Search</span><ArrowRight size={19} aria-hidden="true" /></button>
          </form>
          <div className={styles.area}>
            <CampusZonePicker value={zone} onChange={onZoneChange} disabled={!ready} />
          </div>
        </div>
        <nav className={styles.shortcuts} aria-label="Quick category shortcuts">
          {SHORTCUTS.map(({ slug, label, detail, icon: Icon }) => (
            <Link key={slug} href={"/search?category=" + encodeURIComponent(slug) + zoneQuery}>
              <span className={styles.shortcutIcon}><Icon size={20} strokeWidth={1.7} aria-hidden="true" /></span>
              <span className={styles.shortcutCopy}><strong>{label}</strong><small>{detail}</small></span>
              <ArrowUpRight size={17} className={styles.shortcutArrow} aria-hidden="true" />
            </Link>
          ))}
        </nav>
      </div>
      <div className={styles.ownerNudge}>
        <span><Store size={16} aria-hidden="true" /> Your business belongs here.</span>
        <Link href="/onboard">List it free <ArrowUpRight size={16} aria-hidden="true" /></Link>
      </div>
    </section>
  );
}
