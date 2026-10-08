"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, House, Plus, Percent, Store } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/search", label: "Explore", icon: Compass },
  { href: "/onboard", label: "List free", icon: Plus, primary: true },
  { href: "/deals", label: "Deals", icon: Percent },
  { href: "/dashboard", label: "Merchant", icon: Store },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Mobile quick navigation" className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around gap-1 border-t border-[#dbe3ce] bg-[#f7f8f2]/95 px-2 pb-[calc(9px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-5px_20px_#243b3207] backdrop-blur md:hidden">
      {items.map(({ href, label, icon: Icon, primary }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? "page" : undefined}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 text-[10px] font-semibold ${primary ? "text-[#183e35]" : active ? "text-[#183e35]" : "text-[#667064]"}`}>
          <span className={`grid h-9 w-10 place-items-center rounded-xl transition-colors ${primary ? "bg-[#183e35] text-[#d9f279]" : active ? "bg-[#e9eedf] text-[#335e41]" : "text-[#667064]"}`}><Icon size={19} strokeWidth={1.9} /></span>
          <span>{label}</span>
        </Link>;
      })}
    </nav>
  );
}
