'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ZONES } from '@/lib/constants';
import {
  MapPin,
  Search,
  ChevronDown,
  Check,
  Percent,
  Store,
  Plus,
  Menu,
  X,
  Award,
  ShieldAlert,
  Home,
  SlidersHorizontal,
} from '@/components/icons';

function NavbarInner() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentZone = searchParams.get('zone') || 'all';
  const [zoneMenuOpen, setZoneMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');

  const selectedZoneObj = ZONES.find((z) => z.slug === currentZone) || ZONES[0];

  const handleZoneChange = (zoneSlug: string) => {
    setZoneMenuOpen(false);
    setMobileMenuOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    if (zoneSlug === 'all') {
      params.delete('zone');
    } else {
      params.set('zone', zoneSlug);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickSearch.trim()) return;
    setMobileMenuOpen(false);
    router.push(`/search?q=${encodeURIComponent(quickSearch.trim())}&zone=${currentZone}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-white border-b-2 border-[#001C3B] shadow-[2px_2px_0px_#001C3B]">
      {/* Top Main Bar */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Brand & Campus Context */}
        <div className="flex items-center gap-3 md:gap-5 flex-shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 group press-action select-none"
            title="MoiMashinani Home"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-[#C2185B] text-white border-[1.5px] border-[#001C3B] shadow-[2px_2px_0px_#001C3B] flex items-center justify-center font-display font-extrabold text-base sm:text-lg rounded">
              M
            </div>
            <div className="flex flex-col">
              <span className="font-display font-black tracking-tight text-[#001C3B] text-lg sm:text-xl uppercase leading-none">
                MoiMashinani
              </span>
              <span className="text-[10px] font-bold text-[#594045] uppercase tracking-wider hidden sm:inline">
                Kesses Campus Hub
              </span>
            </div>
          </Link>

          {/* Location Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setZoneMenuOpen(!zoneMenuOpen)}
              className="flex items-center gap-1.5 bg-[#F0F3FF] hover:bg-[#DEE8FF] border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] rounded-full px-2.5 sm:px-3 py-1 text-xs font-bold text-[#001C3B] press-action"
            >
              <MapPin className="w-3.5 h-3.5 text-[#C2185B] flex-shrink-0" />
              <span className="truncate max-w-[110px] sm:max-w-[150px]">{selectedZoneObj.name}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#594045]" />
            </button>

            {zoneMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40 bg-black/10"
                  onClick={() => setZoneMenuOpen(false)}
                />
                <div className="absolute left-0 mt-2 w-72 bg-white border-2 border-[#001C3B] shadow-[4px_4px_0px_#001C3B] rounded-xl py-2 z-50">
                  <div className="px-3 py-1.5 border-b border-[#D5DCE4] text-[11px] font-bold uppercase tracking-wider text-[#594045] flex items-center justify-between">
                    <span>Campus Zones</span>
                    <span className="text-[10px] text-[#0B6E70]">Main Campus</span>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
                    {ZONES.map((zone) => (
                      <button
                        key={zone.slug}
                        onClick={() => handleZoneChange(zone.slug)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-[#F0F3FF] transition-colors ${
                          currentZone === zone.slug
                            ? 'bg-[#E7EEFF] font-bold text-[#9B0044]'
                            : 'text-[#001C3B]'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{zone.name}</div>
                          <div className="text-[10px] text-[#594045]">{zone.landmarkHint}</div>
                        </div>
                        {currentZone === zone.slug && (
                          <Check className="w-4 h-4 text-[#9B0044]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Quick Search on Desktop (Medium and up) */}
        <div className="hidden lg:flex items-center flex-1 max-w-sm mx-2">
          <form
            onSubmit={handleSearchSubmit}
            className="w-full flex items-center bg-[#F9F9FF] border-[1.5px] border-[#001C3B] rounded-lg shadow-[1px_1px_0px_#001C3B] px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#9B0044]"
          >
            <Search className="w-4 h-4 text-[#594045] mr-2 flex-shrink-0" />
            <input
              type="text"
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder="Search fundi, braids, print..."
              className="w-full bg-transparent border-0 p-0 text-xs text-[#001C3B] placeholder:text-[#594045] focus:outline-none"
            />
            <span className="text-[9px] font-bold bg-[#E7EEFF] text-[#001C3B] px-1.5 py-0.5 rounded border border-[#001C3B] ml-1.5">
              KESSES
            </span>
          </form>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1.5 lg:gap-2 flex-shrink-0">
          <Link
            href="/search"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              pathname === '/search' ? 'text-[#9B0044] bg-[#FFEAEF]' : 'text-[#001C3B] hover:bg-[#F0F3FF]'
            }`}
          >
            Browse
          </Link>

          <Link
            href="/deals"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors ${
              pathname === '/deals' ? 'text-[#795900] bg-[#FFF8E1]' : 'text-[#795900] hover:bg-[#FFF8E1]'
            }`}
          >
            <Percent className="w-3.5 h-3.5 text-[#FFC53D]" />
            <span>Deals</span>
          </Link>

          <Link
            href="/ambassador"
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              pathname === '/ambassador' ? 'text-[#0B6E70] bg-[#E7F6F6]' : 'text-[#0B6E70] hover:bg-[#E7F6F6]'
            }`}
          >
            Ambassadors
          </Link>

          <Link
            href="/dashboard"
            className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#001C3B] hover:bg-[#F0F3FF] transition-colors"
          >
            Merchant Hub
          </Link>

          {/* List Business Primary CTA */}
          <Link
            href="/onboard"
            className="ml-1 bg-[#9B0044] hover:bg-[#C2185B] text-white font-display font-bold text-xs uppercase px-3 py-1.5 rounded-full border-[1.5px] border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>List Shop Free</span>
          </Link>
        </nav>

        {/* Mobile Action & Menu Toggle */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            href="/onboard"
            className="bg-[#9B0044] text-white text-[11px] font-bold px-2.5 py-1 rounded-full border-[1.5px] border-[#001C3B] shadow-[1px_1px_0px_#001C3B] press-action flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            <span>List Free</span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 bg-[#F0F3FF] border-[1.5px] border-[#001C3B] rounded-lg shadow-[1px_1px_0px_#001C3B] text-[#001C3B] press-action"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-2 border-[#001C3B] bg-white px-4 py-4 space-y-4 shadow-lg animate-in slide-in-from-top-2">
          {/* Mobile search bar */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#594045] absolute left-3 top-2.5" />
              <input
                type="text"
                value={quickSearch}
                onChange={(e) => setQuickSearch(e.target.value)}
                placeholder="Search fundi, cyber, braids..."
                className="w-full pl-9 pr-3 py-2 bg-[#F0F3FF] border-[1.5px] border-[#001C3B] rounded-lg text-xs text-[#001C3B] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[#001C3B] text-white text-xs font-bold px-3 py-2 rounded-lg border-[1.5px] border-[#001C3B] press-action"
            >
              Search
            </button>
          </form>

          {/* Mobile navigation links */}
          <div className="grid grid-cols-2 gap-2 text-xs font-bold">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-[#F0F3FF] rounded-lg border-[1.5px] border-[#001C3B] flex items-center gap-2 text-[#001C3B]"
            >
              <Home className="w-4 h-4 text-[#C2185B]" />
              <span>Home</span>
            </Link>

            <Link
              href="/search"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-[#F0F3FF] rounded-lg border-[1.5px] border-[#001C3B] flex items-center gap-2 text-[#001C3B]"
            >
              <SlidersHorizontal className="w-4 h-4 text-[#0B6E70]" />
              <span>Browse All</span>
            </Link>

            <Link
              href="/deals"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-[#FFF8E1] rounded-lg border-[1.5px] border-[#001C3B] flex items-center gap-2 text-[#795900]"
            >
              <Percent className="w-4 h-4 text-[#FFC53D]" />
              <span>Student Deals</span>
            </Link>

            <Link
              href="/ambassador"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-[#E7F6F6] rounded-lg border-[1.5px] border-[#001C3B] flex items-center gap-2 text-[#0B6E70]"
            >
              <Award className="w-4 h-4 text-[#0B6E70]" />
              <span>Ambassador Tool</span>
            </Link>

            <Link
              href="/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-[#F0F3FF] rounded-lg border-[1.5px] border-[#001C3B] flex items-center gap-2 text-[#001C3B]"
            >
              <Store className="w-4 h-4 text-[#9B0044]" />
              <span>Merchant Hub</span>
            </Link>

            <Link
              href="/admin"
              onClick={() => setMobileMenuOpen(false)}
              className="p-2.5 bg-[#FFDAD6] rounded-lg border-[1.5px] border-[#001C3B] flex items-center gap-2 text-[#BA1A1A]"
            >
              <ShieldAlert className="w-4 h-4 text-[#BA1A1A]" />
              <span>Campus Admin</span>
            </Link>
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
        <header className="w-full bg-white border-b-2 border-[#001C3B] px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="font-display font-black text-xl text-[#9B0044]">MOIMASHINANI</div>
          </div>
        </header>
      }
    >
      <NavbarInner />
    </Suspense>
  );
}
