'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, Percent, Store } from '@/components/icons';

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/search', label: 'Explore', icon: Search },
    { href: '/onboard', label: 'List Shop', icon: PlusCircle, highlight: true },
    { href: '/deals', label: 'Deals', icon: Percent },
    { href: '/dashboard', label: 'Owner', icon: Store },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t-2 border-[#001C3B] shadow-[0px_-2px_6px_rgba(0,0,0,0.06)] z-40 px-2 py-1.5 flex items-center justify-around">
      {navItems.map((item) => {
        const IconComponent = item.icon;
        const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

        if (item.highlight) {
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center justify-center -mt-5"
            >
              <div className="w-11 h-11 rounded-full bg-[#C2185B] text-white flex items-center justify-center border-2 border-[#001C3B] shadow-[2px_2px_0px_#001C3B] press-action">
                <IconComponent className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-bold text-[#001C3B] mt-0.5">{item.label}</span>
            </Link>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center py-1 px-2.5 transition-colors ${
              isActive ? 'text-[#9B0044] font-bold' : 'text-[#594045]'
            }`}
          >
            <IconComponent className={`w-5 h-5 ${isActive ? 'text-[#9B0044]' : 'text-[#594045]'}`} />
            <span className="text-[10px] tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
