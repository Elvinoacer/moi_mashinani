'use client';

import React from 'react';
import Link from 'next/link';
import { CATEGORIES, ZONES } from '@/lib/constants';
import { WhatsAppIcon } from '@/components/icons';

export function Footer() {
  return (
    <footer className="w-full bg-[#001C3B] text-[#EBF1FF] border-t-4 border-[#9B0044] mt-12 pb-20 md:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Col 1: Brand & About */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#C2185B] text-white border border-white flex items-center justify-center font-display font-extrabold text-base rounded">
                M
              </div>
              <span className="font-display font-black text-2xl tracking-tight text-white uppercase">
                MoiMashinani
              </span>
            </div>
            <p className="text-xs text-[#DEE8FF]/80 leading-relaxed font-body">
              The official hyper-local business & student service directory for Moi University Main Campus (Kesses). Find trusted fundis, printers, salons, food, gas, and hostels in two taps.
            </p>
            <div className="pt-2">
              <a
                href="https://wa.me/254712345678?text=Hi%20MoiMashinani%20team,%20I%20have%20an%20inquiry"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-[#25D366] text-[#001C3B] text-xs font-display font-bold px-3 py-1.5 rounded-full border border-white press-action shadow-sm"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>WhatsApp Helpdesk</span>
              </a>
            </div>
          </div>

          {/* Col 2: Categories */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase text-[#FFC53D] tracking-wider mb-3">
              Popular Categories
            </h4>
            <ul className="space-y-1.5 text-xs text-[#DEE8FF]/80 font-body">
              {CATEGORIES.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link href={`/c/${c.slug}`} className="hover:text-white transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/search" className="text-[#FFC53D] font-bold hover:underline">
                  View all 12 categories →
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Campus Zones */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase text-[#FFC53D] tracking-wider mb-3">
              Campus Zones
            </h4>
            <ul className="space-y-1.5 text-xs text-[#DEE8FF]/80 font-body">
              {ZONES.slice(1, 7).map((z) => (
                <li key={z.id}>
                  <Link href={`/search?zone=${z.slug}`} className="hover:text-white transition-colors">
                    {z.name} ({z.landmarkHint.split(',')[0]})
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 4: Platform & Legal */}
          <div>
            <h4 className="font-display font-bold text-sm uppercase text-[#FFC53D] tracking-wider mb-3">
              Platform & Safety
            </h4>
            <ul className="space-y-1.5 text-xs text-[#DEE8FF]/80 font-body">
              <li>
                <Link href="/onboard" className="hover:text-white transition-colors font-bold text-[#FFC53D]">
                  + List Your Business (Free)
                </Link>
              </li>
              <li>
                <Link href="/deals" className="hover:text-white transition-colors">
                  Student Deals & Discounts
                </Link>
              </li>
              <li>
                <Link href="/ambassador" className="hover:text-white transition-colors">
                  Ambassador Field Portal
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Merchant Hub & Analytics
                </Link>
              </li>
              <li>
                <Link href="/admin" className="hover:text-white transition-colors text-white/50">
                  Campus Admin Console
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#DEE8FF]/20 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-[#DEE8FF]/60 font-body">
          <div>
            © {new Date().getFullYear()} MoiMashinani. Hyper-local business directory for Moi University Main Campus (Kesses).
          </div>
          <div className="flex gap-4">
            <span>Uasin Gishu County, Kenya</span>
            <span>Kesses - Cheptiret Road</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
