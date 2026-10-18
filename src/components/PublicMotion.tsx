"use client";

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { isPublicMotionPath, PUBLIC_NAVIGATION_EVENT, type PublicNavigationDetail } from "@/lib/public-motion";
import styles from "./PublicMotion.module.css";

const REVEAL_SELECTOR = '[data-motion="reveal"], .page-hero';

/** Enhances the existing DOM; routes and forms retain their identity and state. */
export function PublicMotion() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const progressRef = useRef<HTMLDivElement>(null);
  const completeRef = useRef<() => void>(() => {});

  useEffect(() => {
    const progress = progressRef.current;
    if (!progress) return;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const animations = new Set<Animation>();
    const pending = new Set<object>();
    let showTimer: ReturnType<typeof setTimeout> | undefined;
    let safetyTimer: ReturnType<typeof setTimeout> | undefined;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    function complete() {
      pending.clear();
      clearTimeout(showTimer);
      clearTimeout(safetyTimer);
      clearTimeout(idleTimer);
      progress!.dataset.state = progress!.dataset.state === "running" ? "complete" : "idle";
      idleTimer = setTimeout(() => { progress!.dataset.state = "idle"; }, 350);
    }
    completeRef.current = complete;

    function navigation(event: Event) {
      const { token, pending: isPending } = (event as CustomEvent<PublicNavigationDetail>).detail;
      if (!isPending) {
        pending.delete(token);
        if (!pending.size) complete();
        return;
      }
      if (!isPublicMotionPath(window.location.pathname)) return;
      pending.add(token);
      clearTimeout(idleTimer);
      if (pending.size > 1 || progress!.dataset.state === "running") return;
      // Fast prefetched routes complete before this becomes visible.
      showTimer = setTimeout(() => { progress!.dataset.state = "running"; }, 100);
      // Interrupted requests and failed navigation must never leave a stuck bar.
      safetyTimer = setTimeout(complete, 10000);
    }

    function animate(element: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions, done?: () => void) {
      if (reducedMotion.matches || typeof element.animate !== "function") { done?.(); return; }
      const animation = element.animate(frames, options);
      animations.add(animation);
      const finish = () => { animations.delete(animation); done?.(); };
      animation.addEventListener("finish", finish, { once: true });
      animation.addEventListener("cancel", finish, { once: true });
    }

    const observed = new WeakSet<HTMLElement>();
    const enteredPages = new WeakSet<HTMLElement>();
    const reveal = "IntersectionObserver" in window ? new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        reveal?.unobserve(element);
        if (!isPublicMotionPath(window.location.pathname) || element.closest('[data-motion="none"]')) continue;
        const delay = Math.min(240, Math.max(0, Number(element.dataset.motionDelay) || 0));
        animate(element, [{ opacity: .2, translate: "0 20px" }, { opacity: 1, translate: "0 0" }], {
          duration: 620, delay, easing: "cubic-bezier(.16, 1, .3, 1)",
        });
      }
    }, { threshold: .06, rootMargin: "0px 0px -16px 0px" }) : null;

    function inspect(root: Element) {
      if (!isPublicMotionPath(window.location.pathname)) return;
      const candidates = [...(root.matches(REVEAL_SELECTOR) ? [root] : []), ...root.querySelectorAll(REVEAL_SELECTOR)];
      for (const candidate of candidates) {
        if (!(candidate instanceof HTMLElement) || observed.has(candidate)) continue;
        observed.add(candidate);
        reveal?.observe(candidate);
      }
      const main = root.matches("main") ? root : root.querySelector("main");
      if (main instanceof HTMLElement && !enteredPages.has(main) && !main.hasAttribute("data-page-loading")) {
        enteredPages.add(main);
        // Opacity alone avoids creating a containing block for fixed UI.
        if (window.location.pathname !== "/" && !reducedMotion.matches) {
          animate(main, [{ opacity: .7 }, { opacity: 1 }], { duration: 280, easing: "ease-out" });
        }
      }
    }
    inspect(document.body);
    const mutations = new MutationObserver((records) => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node instanceof Element) inspect(node);
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    function tap(event: PointerEvent) {
      if (reducedMotion.matches || !event.isPrimary || event.button !== 0 || !isPublicMotionPath(window.location.pathname)) return;
      const target = event.target instanceof Element ? event.target.closest('button, a[href], [role="button"]') : null;
      if (!target || target.closest('[data-motion="none"], :disabled, [aria-disabled="true"]')) return;
      // One transient compositor animation per press; no pointermove/scroll loop.
      const ring = document.createElement("span");
      ring.className = styles.tap;
      ring.setAttribute("aria-hidden", "true");
      ring.style.left = `${event.clientX}px`;
      ring.style.top = `${event.clientY}px`;
      document.body.appendChild(ring);
      animate(ring, [{ opacity: .55, transform: "scale(.35)" }, { opacity: 0, transform: "scale(1.5)" }], {
        duration: 460, easing: "cubic-bezier(.16, 1, .3, 1)",
      }, () => ring.remove());
    }
    const stopMotion = () => { if (reducedMotion.matches) for (const animation of animations) animation.cancel(); };
    window.addEventListener(PUBLIC_NAVIGATION_EVENT, navigation);
    window.addEventListener("pageshow", complete);
    window.addEventListener("popstate", complete);
    window.addEventListener("error", complete);
    window.addEventListener("unhandledrejection", complete);
    window.addEventListener("offline", complete);
    document.addEventListener("pointerdown", tap, { passive: true });
    reducedMotion.addEventListener("change", stopMotion);
    return () => {
      clearTimeout(showTimer); clearTimeout(safetyTimer); clearTimeout(idleTimer);
      reveal?.disconnect(); mutations.disconnect();
      for (const animation of animations) animation.cancel();
      window.removeEventListener(PUBLIC_NAVIGATION_EVENT, navigation);
      window.removeEventListener("pageshow", complete);
      window.removeEventListener("popstate", complete);
      window.removeEventListener("error", complete);
      window.removeEventListener("unhandledrejection", complete);
      window.removeEventListener("offline", complete);
      document.removeEventListener("pointerdown", tap);
      reducedMotion.removeEventListener("change", stopMotion);
      completeRef.current = () => {};
    };
  }, []);

  useEffect(() => {
    completeRef.current();
    document.body.classList.toggle(styles.scope, isPublicMotionPath(pathname));
    return () => document.body.classList.remove(styles.scope);
  }, [pathname, search]);

  return <div ref={progressRef} className={styles.progress} data-state="idle" aria-hidden="true" />;
}
