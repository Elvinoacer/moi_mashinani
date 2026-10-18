"use client";

import Link, { useLinkStatus } from "next/link";
import { useEffect, type ComponentProps } from "react";
import { beginPublicNavigation } from "@/lib/public-motion";

function NavigationStatus({ href }: { href: string }) {
  const { pending } = useLinkStatus();
  useEffect(() => {
    if (pending) return beginPublicNavigation(href);
  }, [pending, href]);
  return null;
}

/** The normal Next Link contract, with feedback driven by its pending state. */
export default function MotionLink({ children, ...props }: ComponentProps<typeof Link>) {
  const query = typeof props.href === "object" ? props.href.query : undefined;
  const queryString = typeof query === "string" ? query : new URLSearchParams(
    Object.entries(query || {}).flatMap(([name, value]) => (
      Array.isArray(value) ? value : [value]
    ).filter((value) => value != null).map((value) => [name, String(value)])),
  ).toString();
  const href = typeof props.href === "string"
    ? props.href
    : `${props.href.pathname || ""}${props.href.search || (queryString ? `?${queryString}` : "")}`;
  return <Link {...props}>{children}<NavigationStatus href={href} /></Link>;
}
