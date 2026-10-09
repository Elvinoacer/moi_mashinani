import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { ZONES } from "@/lib/constants";
import { CATEGORY_GROUPS } from '@/lib/categories';
import { SiteBrand } from "@/components/SiteBrand";

export function Footer() {
  return (
    <footer className="mt-12 w-full border-t border-[#dfe5d8] bg-[#f7f8f2] pb-24 md:pb-8">
      <div className="mx-auto max-w-[1328px] px-5 py-10 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 gap-9 border-b border-[#dfe5d8] pb-9 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div>
            <SiteBrand />
            <p className="mt-4 max-w-[280px] text-[13px] leading-7 text-[#667064]">A little closer to everything. Find local people, real services, and good things around Moi University.</p>
            <p className="mt-5 inline-flex items-center gap-2 text-[11px] font-semibold text-[#335e41]"><MapPin size={14} /> Made for Moi. Rooted in Kesses.</p>
          </div>
          <div>
            <h2 className="mb-4 text-[12px] font-bold text-[#183e35]">Explore nearby</h2>
            <nav aria-label="Popular categories" className="flex flex-col items-start gap-3">
              {CATEGORY_GROUPS.slice(0, 6).map((category) => <Link key={category.slug} href={"/search?category=" + category.slug} className="text-[12px] text-[#667064] hover:text-[#183e35]">{category.name}</Link>)}
              <Link href="/categories" className="inline-flex items-center gap-1 text-[12px] font-bold text-[#335e41]">All categories <ArrowUpRight size={13} /></Link>
            </nav>
          </div>
          <div>
            <h2 className="mb-4 text-[12px] font-bold text-[#183e35]">Around campus</h2>
            <nav aria-label="Campus areas" className="flex flex-col items-start gap-3">
              {ZONES.slice(1, 6).map((zone) => <Link key={zone.slug} href={"/search?zone=" + encodeURIComponent(zone.slug)} className="text-[12px] text-[#667064] hover:text-[#183e35]">{zone.name}</Link>)}
            </nav>
          </div>
          <div>
            <h2 className="mb-4 text-[12px] font-bold text-[#183e35]">For the neighborhood</h2>
            <nav aria-label="Platform links" className="flex flex-col items-start gap-3">
              <Link href="/onboard" className="font-semibold text-[12px] text-[#335e41] hover:text-[#183e35]">List your business for free ↗</Link>
              <Link href="/deals" className="text-[12px] text-[#667064] hover:text-[#183e35]">Student deals</Link>
              <Link href="/dashboard" className="text-[12px] text-[#667064] hover:text-[#183e35]">Manage your business</Link>
              <Link href="/ambassador" className="text-[12px] text-[#667064] hover:text-[#183e35]">Ambassadors</Link>
              <Link href="/admin" className="text-[12px] text-[#667064] hover:text-[#183e35]">Admin</Link>
            </nav>
          </div>
        </div>
        <div className="flex flex-col gap-3 pt-6 text-[11px] text-[#758071] sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MoiMashinani. Local people. Real connections.</span>
          <span>Moi University Main Campus · Kesses, Kenya</span>
        </div>
      </div>
    </footer>
  );
}
