"use client";

import Link from "next/link";
import {
  CalendarDays,
  ChartNoAxesCombined,
  Clock3,
  CreditCard,
  Images,
  Package,
  Share2,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type WorkspaceTab =
  | "overview"
  | "bookings"
  | "services"
  | "details"
  | "photos"
  | "hours"
  | "billing"
  | "share";

type WorkspaceItem = {
  tab: WorkspaceTab;
  label: string;
  description: string;
  icon: LucideIcon;
};

const groups: { heading: string; items: WorkspaceItem[] }[] = [
  {
    heading: "WORKSPACE",
    items: [
      { tab: "overview", label: "Overview", description: "Daily priorities", icon: ChartNoAxesCombined },
      { tab: "bookings", label: "Bookings", description: "Customer requests", icon: CalendarDays },
      { tab: "services", label: "Catalogue", description: "Products & prices", icon: Package },
    ],
  },
  {
    heading: "BUSINESS PROFILE",
    items: [
      { tab: "details", label: "Business details", description: "Contact & location", icon: Store },
      { tab: "photos", label: "Photos", description: "Shop gallery", icon: Images },
      { tab: "hours", label: "Opening hours", description: "Weekly schedule", icon: Clock3 },
    ],
  },
  {
    heading: "GROW",
    items: [
      { tab: "billing", label: "Plans & payments", description: "Promotions & history", icon: CreditCard },
      { tab: "share", label: "Share profile", description: "Bring in customers", icon: Share2 },
    ],
  },
];

export function DashboardWorkspaceNav({
  slug,
  activeTab,
  pendingBookings,
  onNavigate,
}: {
  slug: string;
  activeTab: WorkspaceTab;
  pendingBookings: number;
  onNavigate: (tab: WorkspaceTab) => void;
}) {
  return (
    <aside className="min-w-0 lg:sticky lg:top-24">
      <nav
        aria-label="Business workspace"
        className="rounded-2xl border border-[#e0e7dd] bg-white p-2 shadow-[0_10px_35px_rgba(29,58,43,0.05)] lg:rounded-3xl lg:p-3"
      >
        <div className="flex min-w-0 gap-3 overflow-x-auto pb-1 lg:block lg:space-y-5 lg:overflow-visible lg:pb-0">
          {groups.map((group) => (
            <div key={group.heading} className="flex shrink-0 items-center gap-1 lg:block">
              <p className="hidden px-3 pb-2 pt-2 text-[10px] font-extrabold tracking-[0.16em] text-[#78857a] lg:block">
                {group.heading}
              </p>
              <div className="flex gap-1 lg:flex-col">
                {group.items.map(({ tab, label, description, icon: Icon }) => {
                  const selected = activeTab === tab;
                  return (
                    <Link
                      key={tab}
                      href={"/dashboard/" + encodeURIComponent(slug) + "?tab=" + tab}
                      scroll={false}
                      onClick={() => onNavigate(tab)}
                      aria-current={selected ? "page" : undefined}
                      title={description}
                      className={
                        "group flex min-h-11 shrink-0 items-center gap-2.5 border-b-2 px-3 py-2.5 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#537847] lg:w-full lg:gap-3 lg:rounded-lg lg:border-b-0 lg:border-l-[3px] " +
                        (selected
                          ? "border-b-[#406b45] bg-[#f5f9ed] text-[#1c4434] lg:border-l-[#406b45] lg:bg-[#ecf4db]"
                          : "border-b-transparent text-[#55645a] hover:bg-[#f4f7ef] hover:text-[#183e35] lg:border-l-transparent")
                      }
                    >
                      <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0" strokeWidth={selected ? 2.4 : 1.8} />
                      <span className="whitespace-nowrap">{label}</span>
                      {tab === "bookings" && pendingBookings > 0 && (
                        <span
                          aria-label={pendingBookings + " new bookings"}
                          className="ml-auto rounded-md bg-[#24563c] px-1.5 py-0.5 text-[10px] font-extrabold text-white"
                        >
                          {pendingBookings}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>
      <p className="mt-2 px-2 text-[11px] text-[#667568] lg:hidden">
        Swipe the navigation sideways for more sections.
      </p>
    </aside>
  );
}
