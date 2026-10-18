"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "@/components/MotionLink";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Award,
  Check,
  ChevronDown,
  Menu,
  Plus,
  Search,
  ShieldAlert,
  X,
  MapPin,
  Store,
  ShoppingBag,
  HousePlus,
  ArrowRight,
} from "lucide-react";
import { ZONES } from "@/lib/constants";
import { useCampusZone } from "@/lib/useCampusZone";
import { SiteBrand } from "@/components/SiteBrand";
import { ModalFrame } from "@/components/ModalFrame";
import { beginPublicNavigation } from "@/lib/public-motion";

const navLinks = [
  { href: "/search", label: "Explore" },
  { href: "/deals", label: "Student deals" },
  { href: "/requests", label: "Requests" },
  { href: "/housing", label: "Housing" },
  { href: "/market", label: "Comrade Market" },
  { href: "/dashboard", label: "Merchant hub" },
];

function NavbarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedZone, setStoredZone] = useCampusZone();
  const urlZone = searchParams.get("zone");
  const currentZone = urlZone || storedZone || "all";
  const currentZoneInfo =
    ZONES.find((zone) => zone.slug === currentZone) || ZONES[0];
  const [zoneOpen, setZoneOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const hideListFree =
    pathname === "/onboard" ||
    pathname === "/market" ||
    pathname.startsWith("/dashboard");
  const [queryDraft, setQueryDraft] = useState<{
    source: string;
    value: string;
  } | null>(null);
  const urlQuery = searchParams.get("q") || "";
  const query =
    queryDraft?.source === urlQuery ? queryDraft.value : urlQuery;
  const [user, setUser] = useState<{
    name: string;
    role: "ADMIN" | "BUSINESS" | "AMBASSADOR";
  } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/auth/me", { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setUser((await response.json()).user || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    setAccountError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok)
        throw new Error("Could not sign out. Please try again.");
      setUser(null);
      setMobileOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (cause) {
      setAccountError(
        cause instanceof Error ? cause.message : "Could not sign out.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  function selectZone(zone: string) {
    setZoneOpen(false);
    setMobileOpen(false);
    setStoredZone(zone);
    if (pathname === "/search" || searchParams.has("zone")) {
      const params = new URLSearchParams(searchParams.toString());
      if (zone === "all") params.delete("zone");
      else params.set("zone", zone);
      const href = `${pathname}${params.size ? `?${params.toString()}` : ""}`;
      beginPublicNavigation(href);
      router.push(href);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const params = new URLSearchParams();
    if (trimmed) params.set("q", trimmed);
    if (currentZone !== "all") params.set("zone", currentZone);
    setMobileOpen(false);
    const href = `/search${params.size ? `?${params.toString()}` : ""}`;
    beginPublicNavigation(href);
    router.push(href);
  }

  return (
    <header className="relative z-50 w-full border-b border-[#e3e7dc] bg-[#f7f8f2]">
      <div className="mx-auto flex min-h-[64px] md:min-h-[76px] max-w-[1328px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-2 lg:gap-6">
          <SiteBrand />
          <div className="relative hidden xl:block">
            <button
              type="button"
              aria-label="Choose campus area"
              aria-expanded={zoneOpen}
              onClick={() => setZoneOpen((value) => !value)}
              className="inline-flex min-h-10 max-w-[190px] items-center gap-2 rounded-full bg-[#e9eedf] px-3 text-[11px] font-semibold text-[#335e41] transition-colors hover:bg-[#dfe9cf]"
            >
              <MapPin size={15} className="shrink-0" />
              <span className="truncate">{currentZoneInfo.name}</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            {zoneOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close campus area selector"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setZoneOpen(false)}
                />
                <div className="absolute left-0 top-full z-50 mt-2 max-h-80 w-[290px] overflow-y-auto rounded-2xl border border-[#dce5d7] bg-white p-2 shadow-[0_18px_45px_#183e3520]">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#667064]">
                    Look around campus
                  </p>
                  {ZONES.map((zone) => (
                    <button
                      key={zone.slug}
                      type="button"
                      onClick={() => selectZone(zone.slug)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs hover:bg-[#f2f5eb] ${currentZone === zone.slug ? "bg-[#e9eedf] text-[#183e35]" : "text-[#667064]"}`}
                    >
                      <span>
                        <strong className="block text-[#183e35]">
                          {zone.name}
                        </strong>
                        <small>{zone.landmarkHint}</small>
                      </span>
                      {currentZone === zone.slug && (
                        <Check size={17} className="shrink-0 text-[#335e41]" />
                      )}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <form
          onSubmit={submitSearch}
          role="search"
          className="hidden min-w-0 max-w-[250px] flex-1 items-center gap-2 rounded-xl border border-[#dce5d7] bg-white px-3.5 py-2.5 focus-within:border-[#879c6d] lg:flex xl:max-w-[310px]"
        >
          <Search size={16} className="shrink-0 text-[#667064]" />
          <input
            type="search"
            aria-label="Search local businesses"
            placeholder="Find something nearby..."
            className="min-w-0 w-full bg-transparent text-xs text-[#183e35] outline-none placeholder:text-[#879084]"
            value={query}
            onChange={(event) =>
              setQueryDraft({ source: urlQuery, value: event.target.value })
            }
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQueryDraft({ source: urlQuery, value: "" })}
              className="shrink-0 text-[#667064] hover:text-[#183e35]"
            >
              <X size={14} />
            </button>
          )}
        </form>



        <div className="flex items-center gap-2">
          {user ? (
            <button
              type="button"
              onClick={signOut}
              disabled={signingOut}
              className="hidden min-h-10 px-2 text-[11px] font-semibold text-[#335e41] disabled:opacity-50 sm:inline-flex sm:items-center"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          ) : (
            <Link
              href="/login"
              className="hidden min-h-10 items-center px-2 text-[11px] font-semibold text-[#335e41] sm:inline-flex"
            >
              Sign in
            </Link>
          )}

          {/* Top navigation notification bell container */}
          <div id="navbar-notifications-slot" className="flex items-center" />

          {!hideListFree && (
            user?.role === "ADMIN" || user?.role === "AMBASSADOR" ? (
              <Link
                href={user?.role === "ADMIN" ? "/admin/enroll" : "/ambassador"}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[9px] bg-[#183e35] px-2.5 py-2.5 text-[11px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#2c5141] sm:px-4"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">
                  {user?.role === "ADMIN" ? "Enroll business" : "Ambassador"}
                </span>
                <span className="sm:hidden">
                  {user?.role === "ADMIN" ? "Enroll" : "Ambassador"}
                </span>
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setChooserOpen(true)}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-[9px] bg-[#183e35] px-2.5 py-2.5 text-[11px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#2c5141] sm:px-4"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Post or list</span>
                <span className="sm:hidden">Post</span>
                
              </button>
            )
          )}
          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-[#dce5d7] bg-white text-[#183e35] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41] lg:hidden"
          >
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {/* A separate navigation rail prevents the logo, area, search and actions
          from competing for horizontal space on desktop. */}
      <div className="hidden border-t border-[#e5ebe1] bg-[#fbfcf8] lg:block">
        <nav aria-label="Main navigation" className="mx-auto flex max-w-[1328px] items-center justify-center gap-2 px-8 py-1.5 xl:gap-5">
          {navLinks.map(({ href, label }) => {
            const active = pathname === href || (href === "/dashboard" && pathname.startsWith("/dashboard"));
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg px-3.5 text-[12px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41] ${active ? "bg-[#e7efdf] text-[#184838]" : "text-[#586b5f] hover:bg-[#f0f4e9] hover:text-[#183e35]"}`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
      </div>

      {chooserOpen && (
        <ModalFrame title="Create a listing" onClose={() => setChooserOpen(false)} wide>
          <div className="p-4 sm:p-6">
            <div className="relative overflow-hidden rounded-[20px] bg-[#103e31] px-5 py-6 text-white sm:px-7">
              <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 size-52 rounded-full border-[26px] border-[#d9f279]/10" />
              <p className="relative text-[10px] font-extrabold tracking-[.18em] text-[#dcf59c]">YOUR SPACE ON MOI MASHINANI</p>
              <h3 className="relative mt-2 max-w-sm text-2xl font-extrabold tracking-[-.045em] sm:text-[28px]">What would you like to share?</h3>
              <p className="relative mt-2 max-w-md text-sm leading-relaxed text-[#d6e7d9]">Reach comrades with a business, something to sell, or a place to stay. Choose where to begin.</p>
            </div>
            <div className="mt-4 grid gap-2.5">
              <Link href="/onboard" onClick={() => setChooserOpen(false)} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-[#d9e5d8] bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8daf98] hover:bg-[#f8fbf6] hover:shadow-[0_9px_20px_#173b3110] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]">
                <span className="grid size-12 shrink-0 place-items-center rounded-[13px] bg-[#e7f1df] text-[#205a42]"><Store size={23} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-[#153e31] sm:text-base">List a business or service</strong><small className="mt-1 block text-xs leading-relaxed text-[#66796b]">Create your campus storefront for food, salons, shops, repairs and more.</small></span>
                <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[#527360] transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/market?post=1" onClick={() => setChooserOpen(false)} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-[#d9e5d8] bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#8daf98] hover:bg-[#f8fbf6] hover:shadow-[0_9px_20px_#173b3110] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]">
                <span className="grid size-12 shrink-0 place-items-center rounded-[13px] bg-[#fff3db] text-[#8d622a]"><ShoppingBag size={23} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><strong className="block text-sm font-extrabold text-[#153e31] sm:text-base">Sell an item or student hustle</strong><small className="mt-1 block text-xs leading-relaxed text-[#66796b]">Post second-hand items, books, electronics or what you make.</small></span>
                <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[#527360] transition-transform group-hover:translate-x-1" />
              </Link>
              <Link href="/housing?post=vacancy" onClick={() => setChooserOpen(false)} className="group flex min-h-[92px] items-center gap-4 rounded-2xl border border-[#a8cbb2] bg-[#eff7eb] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#4c8c69] hover:bg-[#e7f4e2] hover:shadow-[0_9px_20px_#173b3110] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]">
                <span className="grid size-12 shrink-0 place-items-center rounded-[13px] bg-[#164d39] text-[#d9f279]"><HousePlus size={23} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><strong className="block text-sm font-extrabold text-[#153e31] sm:text-base">List a housing vacancy</strong><span className="rounded-full bg-[#d7efc3] px-2 py-0.5 text-[10px] font-extrabold text-[#236043]">FREE</span></span><small className="mt-1 block text-xs leading-relaxed text-[#567462]">Know an empty room or moving out? Share a place. No account needed.</small></span>
                <ArrowRight size={18} aria-hidden="true" className="shrink-0 text-[#527360] transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <p className="mt-4 text-center text-xs leading-relaxed text-[#62796a]">Looking for somewhere to stay instead? <Link href="/housing?post=looking" onClick={() => setChooserOpen(false)} className="font-extrabold text-[#1a5840] underline underline-offset-4">Post a housing search</Link></p>
          </div>
        </ModalFrame>
      )}
      {accountError && (
        <p
          role="alert"
          className="bg-[#fce7e1] px-5 py-2 text-sm text-[#8f2424]"
        >
          {accountError}
        </p>
      )}
      {mobileOpen && (
        <div className="border-t border-[#e3e7dc] bg-[#f7f8f2] px-5 pb-5 pt-4 lg:hidden">
          <form onSubmit={submitSearch} role="search" className="flex gap-2">
            <input
              type="search"
              value={query}
              onChange={(event) =>
                setQueryDraft({ source: urlQuery, value: event.target.value })
              }
              aria-label="Search local businesses"
              className="min-w-0 flex-1 rounded-xl border border-[#dce5d7] bg-white px-3.5 py-3 text-sm text-[#183e35]"
              placeholder="Search around campus..."
            />
            <button
              type="submit"
              aria-label="Search"
              className="rounded-xl bg-[#183e35] px-4 text-xs font-semibold text-white"
            >
              <Search size={18} />
            </button>
          </form>
          <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-[#335e41]">
            <MapPin size={16} className="shrink-0" />
            <span className="shrink-0">Around</span>
            <select
              aria-label="Choose campus area"
              value={currentZone}
              onChange={(event) => selectZone(event.target.value)}
              className="min-w-0 w-full rounded-xl border border-[#dce5d7] bg-white px-3 py-2.5 text-xs text-[#183e35]"
            >
              {ZONES.map((zone) => (
                <option key={zone.slug} value={zone.slug}>
                  {zone.name}
                </option>
              ))}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[
              { href: "/", label: "Home" },
              ...navLinks,
              ...(user?.role === "ADMIN"
                ? [
                    { href: "/admin", label: "Admin console" },
                    { href: "/admin/enroll", label: "Enroll business" },
                  ]
                : []),
              ...(!user ? [{ href: "/login", label: "Sign in" }] : []),
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[#e3e7dc] bg-white px-3 py-3 text-xs font-semibold text-[#335e41] hover:bg-[#e9eedf]"
              >
                {label}
              </Link>
            ))}
          </div>
          {user && (
            <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#335e41]">
              <span>Signed in as {user.name}</span>
              <button
                type="button"
                disabled={signingOut}
                onClick={signOut}
                className="font-semibold underline"
              >
                {signingOut ? "Signing out…" : "Sign out"}
              </button>
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#667064]">
            <Award size={15} /> Built for Moi University & Kesses{" "}
            <ShieldAlert size={15} className="ml-auto" />
          </div>
        </div>
      )}
    </header>
  );
}

export function Navbar() {
  return (
    <Suspense
      fallback={
        <header className="border-b border-[#e3e7dc] bg-[#f7f8f2] px-5 py-5">
          <SiteBrand />
        </header>
      }
    >
      <NavbarInner />
    </Suspense>
  );
}
