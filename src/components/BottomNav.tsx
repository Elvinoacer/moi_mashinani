"use client";

import Link from "@/components/MotionLink";
import { usePathname } from "next/navigation";
import { Compass, House, MessageCircle, Percent, Store } from "lucide-react";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/search", label: "Explore", icon: Compass },
  { href: "/requests", label: "Requests", icon: MessageCircle },
  { href: "/deals", label: "Deals", icon: Percent },
  { href: "/market", label: "Market", icon: Store },
];

export function BottomNav() {
  const pathname = usePathname();
  if (/^\/(b\/|onboard|promote\/|pro\/|ambassador|admin|login|verify|dashboard\/)/.test(pathname))
    return null;

  return (
    <nav
      aria-label="Primary mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-[#d9e4d6] bg-[#f8faf5]/97 px-1 pt-1.5 pb-[calc(7px+env(safe-area-inset-bottom))] shadow-[0_-9px_26px_#243b320d] backdrop-blur-md md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`relative flex min-h-[61px] min-w-0 flex-col items-center justify-center gap-1 rounded-md px-0.5 text-center text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#467550] ${active ? "text-[#183e35]" : "text-[#66766c] hover:text-[#245744]"}`}>
            <Icon size={21} strokeWidth={active ? 2.45 : 1.8} aria-hidden="true" />
            <span className="truncate max-w-full">{label}</span>
            <span aria-hidden="true" className={`absolute bottom-[2px] h-[3px] w-5 rounded-full bg-[#315f42] transition-[opacity,transform] duration-200 ${active ? "scale-100 opacity-100" : "scale-75 opacity-0"}`} />
          </Link>
        );
      })}
    </nav>
  );
}
