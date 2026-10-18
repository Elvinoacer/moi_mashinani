/** Public motion is intentionally absent from account and operational tools. */
export function isPublicMotionPath(pathname: string) {
  return !/^\/(?:admin|dashboard|merchant|api|onboard|promote)(?:\/|$)/.test(pathname);
}

export const PUBLIC_NAVIGATION_EVENT = "mm:public-navigation";

export type PublicNavigationDetail = { token: object; pending: boolean };

/** Reports real router work without intercepting or delaying navigation. */
export function beginPublicNavigation(href: string): () => void {
  if (typeof window === "undefined") return () => {};
  const destination = new URL(href, window.location.href);
  if (
    destination.origin !== window.location.origin ||
    !isPublicMotionPath(window.location.pathname) ||
    !isPublicMotionPath(destination.pathname) ||
    `${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`
  ) return () => {};

  const token = {};
  const report = (pending: boolean) => window.dispatchEvent(new CustomEvent<PublicNavigationDetail>(
    PUBLIC_NAVIGATION_EVENT, { detail: { token, pending } },
  ));
  report(true);
  return () => report(false);
}
