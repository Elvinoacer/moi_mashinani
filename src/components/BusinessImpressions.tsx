"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { observeBusinessImpressions } from "@/lib/business-impressions";

export function BusinessImpressions() {
  const pathname = usePathname();
  useEffect(() => {
    // Merchant previews and admin lists are not customer exposure.
    if (/^\/(dashboard|admin|promote|pro|enroll)(\/|$)/.test(pathname)) return;
    return observeBusinessImpressions();
  }, [pathname]);
  return null;
}
