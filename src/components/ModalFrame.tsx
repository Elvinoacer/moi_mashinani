"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X } from "@/components/icons";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

export function ModalFrame({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(
    subscribe,
    clientSnapshot,
    serverSnapshot,
  );
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mounted) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) closeRef.current();
      if (event.key !== "Tab") return;
      const elements = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]',
      ) || []).filter((element) => element.getClientRects().length && !element.closest('[hidden], [inert]'));
      if (!elements?.length) return;
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last ||
          document.activeElement === dialogRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      previousFocus?.focus();
    };
  }, [mounted]);

  // Layout transforms and container queries must not constrain the fixed dialog.
  return mounted
    ? createPortal(
        <div className="mobile-sheet-backdrop fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[#243b32]/60 p-4 backdrop-blur-xs">
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={`mobile-sheet max-h-[92dvh] w-full ${wide ? "max-w-2xl" : "max-w-lg"} overflow-y-auto overscroll-contain rounded-3xl border border-[#dce5d7] bg-[#f8faf5] shadow-[0_30px_100px_#102f2a55] focus:outline-none`}
          >
            <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[#e0e8dc] bg-white/95 px-5 py-3 backdrop-blur-md sm:px-6">
              <h2
                id={titleId}
                className="font-display text-sm font-extrabold tracking-tight text-[#243b32]"
              >
                {title}
              </h2>
              <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="flex size-11 shrink-0 items-center justify-center rounded-full border border-[#e3e9de] bg-[#f5f8f0] text-[#243b32] hover:bg-[#eaf1df] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {children}
          </div>
        </div>,
        document.body,
      )
    : null;
}
