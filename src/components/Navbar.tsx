"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Award, Check, ChevronDown, Menu, Plus, Search, ShieldAlert, X, MapPin } from "lucide-react";
import { ZONES } from "@/lib/constants";
import { SiteBrand } from "@/components/SiteBrand";

const navLinks = [
  { href: "/search", label: "Explore" },
  { href: "/deals", label: "Student deals" },
  { href: "/ambassador", label: "Ambassadors" },
  { href: "/dashboard", label: "Merchant hub" },
];

function NavbarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentZone = searchParams.get("zone") || "all";
  const currentZoneInfo = ZONES.find((zone) => zone.slug === currentZone) || ZONES[0];
  const [zoneOpen, setZoneOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [user, setUser] = useState<{ name: string; role: 'ADMIN' | 'BUSINESS' } | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [accountError, setAccountError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/auth/me', { cache: 'no-store', signal: controller.signal })
      .then(async (response) => {
        if (response.ok) setUser((await response.json()).user || null);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [pathname]);

  async function signOut() {
    setSigningOut(true);
    setAccountError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      setUser(null);
      setMobileOpen(false);
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setAccountError(cause instanceof Error ? cause.message : 'Could not sign out.');
    } finally { setSigningOut(false); }
  }

  function selectZone(zone: string) {
    setZoneOpen(false);
    setMobileOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (zone === "all") params.delete("zone");
    else params.set("zone", zone);
    router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!query.trim()) return;
    const params = new URLSearchParams({ q: query.trim() });
    if (currentZone !== "all") params.set("zone", currentZone);
    setMobileOpen(false);
    router.push(`/search?${params.toString()}`);
  }

  return (
    <header className="relative z-50 w-full border-b border-[#e3e7dc] bg-[#f7f8f2]">
      <div className="mx-auto flex min-h-[82px] max-w-[1328px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <SiteBrand />
          <div className="relative hidden xl:block">
            <button type="button" aria-label="Choose campus area" aria-expanded={zoneOpen}
              onClick={() => setZoneOpen((value) => !value)}
              className="inline-flex min-h-10 max-w-[190px] items-center gap-2 rounded-full bg-[#e9eedf] px-3 text-[11px] font-semibold text-[#335e41] transition-colors hover:bg-[#dfe9cf]">
              <MapPin size={15} className="shrink-0" />
              <span className="truncate">{currentZoneInfo.name}</span>
              <ChevronDown size={14} className="shrink-0" />
            </button>
            {zoneOpen && (
              <>
                <button type="button" aria-label="Close campus area selector" className="fixed inset-0 z-40 cursor-default" onClick={() => setZoneOpen(false)} />
                <div className="absolute left-0 top-full z-50 mt-2 max-h-80 w-[290px] overflow-y-auto rounded-2xl border border-[#dce5d7] bg-white p-2 shadow-[0_18px_45px_#183e3520]">
                  <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#667064]">Look around campus</p>
                  {ZONES.map((zone) => (
                    <button key={zone.slug} type="button" onClick={() => selectZone(zone.slug)}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-xs hover:bg-[#f2f5eb] ${currentZone === zone.slug ? "bg-[#e9eedf] text-[#183e35]" : "text-[#667064]"}`}>
                      <span><strong className="block text-[#183e35]">{zone.name}</strong><small>{zone.landmarkHint}</small></span>
                      {currentZone === zone.slug && <Check size={17} className="shrink-0 text-[#335e41]" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <form onSubmit={submitSearch} role="search" className="hidden min-w-0 max-w-[250px] flex-1 items-center gap-2 rounded-xl border border-[#dce5d7] bg-white px-3.5 py-2.5 focus-within:border-[#879c6d] lg:flex xl:max-w-[310px]">
          <Search size={16} className="shrink-0 text-[#667064]" />
          <input type="search" aria-label="Search local businesses" placeholder="Find something nearby..."
            className="min-w-0 w-full bg-transparent text-xs text-[#183e35] outline-none placeholder:text-[#879084]" value={query} onChange={(event) => setQuery(event.target.value)} />
        </form>

        <nav aria-label="Main navigation" className="hidden items-center gap-4 lg:flex xl:gap-6">
          {navLinks.map(({ href, label }) => (
            <Link key={href} href={href} aria-current={pathname === href || (href === "/dashboard" && pathname.startsWith("/dashboard")) ? "page" : undefined}
              className={`relative inline-flex min-h-11 items-center text-[12px] font-semibold transition-colors hover:text-[#183e35] ${pathname === href || (href === "/dashboard" && pathname.startsWith("/dashboard")) ? "text-[#183e35] after:absolute after:bottom-[7px] after:left-0 after:h-[2px] after:w-6 after:bg-[#335e41]" : "text-[#667064]"}`}>
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user ? <button type="button" onClick={signOut} disabled={signingOut} className="hidden min-h-10 px-2 text-[11px] font-semibold text-[#335e41] disabled:opacity-50 sm:inline-flex sm:items-center">{signingOut ? 'Signing out…' : 'Sign out'}</button> : <Link href="/login" className="hidden min-h-10 items-center px-2 text-[11px] font-semibold text-[#335e41] sm:inline-flex">Sign in</Link>}
          <Link href={user?.role === 'ADMIN' ? '/admin/enroll' : '/onboard'} className="inline-flex min-h-10 items-center gap-2 rounded-[9px] bg-[#183e35] px-3.5 py-2.5 text-[11px] font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[#2c5141] sm:px-4">
            <Plus size={16} />
            <span className="hidden sm:inline">{user?.role === 'ADMIN' ? 'Enroll business' : 'List your business'}</span><span className="sm:hidden">{user?.role === 'ADMIN' ? 'Enroll' : 'List free'}</span>
            {user?.role !== 'ADMIN' && <span className="hidden rounded bg-[#d9f279] px-1.5 py-0.5 text-[9px] font-bold text-[#264b36] lg:inline">Free</span>}
          </Link>
          <button type="button" aria-label={mobileOpen ? "Close navigation" : "Open navigation"} aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((value) => !value)}
            className="grid h-10 w-10 place-items-center rounded-lg border border-[#dce5d7] bg-white text-[#183e35] lg:hidden">
            {mobileOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>
      {accountError && <p role="alert" className="bg-[#fce7e1] px-5 py-2 text-sm text-[#8f2424]">{accountError}</p>}
      {mobileOpen && (
        <div className="border-t border-[#e3e7dc] bg-[#f7f8f2] px-5 pb-5 pt-4 lg:hidden">
          <form onSubmit={submitSearch} role="search" className="flex gap-2">
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search local businesses"
              className="min-w-0 flex-1 rounded-xl border border-[#dce5d7] bg-white px-3.5 py-3 text-sm text-[#183e35]" placeholder="Search around campus..." />
            <button type="submit" className="rounded-xl bg-[#183e35] px-4 text-xs font-semibold text-white"><Search size={18} /></button>
          </form>
          <label className="mt-3 flex items-center gap-3 text-xs font-semibold text-[#335e41]">
            <MapPin size={16} className="shrink-0" />
            <span className="shrink-0">Around</span>
            <select aria-label="Choose campus area" value={currentZone} onChange={(event) => selectZone(event.target.value)}
              className="min-w-0 w-full rounded-xl border border-[#dce5d7] bg-white px-3 py-2.5 text-xs text-[#183e35]">
              {ZONES.map((zone) => <option key={zone.slug} value={zone.slug}>{zone.name}</option>)}
            </select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[{ href: "/", label: "Home" }, ...navLinks, ...(user?.role === 'ADMIN' ? [{ href: '/admin', label: 'Admin console' }, { href: '/admin/enroll', label: 'Enroll business' }] : []), ...(!user ? [{ href: '/login', label: 'Sign in' }] : [])].map(({ href, label }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[#e3e7dc] bg-white px-3 py-3 text-xs font-semibold text-[#335e41] hover:bg-[#e9eedf]">{label}</Link>
            ))}
          </div>
          {user && <div className="mt-3 flex items-center justify-between gap-3 text-sm text-[#335e41]"><span>Signed in as {user.name}</span><button type="button" disabled={signingOut} onClick={signOut} className="font-semibold underline">{signingOut ? 'Signing out…' : 'Sign out'}</button></div>}
          <div className="mt-3 flex items-center gap-2 text-xs text-[#667064]"><Award size={15} /> Built for Moi University & Kesses <ShieldAlert size={15} className="ml-auto" /></div>
        </div>
      )}
    </header>
  );
}

export function Navbar() {
  return <Suspense fallback={<header className="border-b border-[#e3e7dc] bg-[#f7f8f2] px-5 py-5"><SiteBrand /></header>}><NavbarInner /></Suspense>;
}
