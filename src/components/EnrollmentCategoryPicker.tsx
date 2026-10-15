"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { CATEGORIES, CATEGORY_GROUPS, categorySearchText } from "@/lib/categories";

/**
 * Enrollment-only searchable picker. Results float over the form instead of
 * changing its height; on phones the same list becomes a bottom sheet.
 */
export function EnrollmentCategoryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = CATEGORIES.find((category) => category.slug === value);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = CATEGORIES.filter((category) =>
    words.every((word) => categorySearchText(category).toLowerCase().includes(word)),
  );

  useEffect(() => {
    if (open) searchRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setActiveIndex(0);
    triggerRef.current?.focus();
  }
  function choose(next: string) {
    onChange(next);
    close();
  }
  function onSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, matches.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter" && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex].slug);
    }
  }

  return (
    <div className={`relative min-w-0 ${open ? "z-[70]" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Business category"
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-results` : undefined}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="ui-input flex min-h-12 items-center justify-between gap-3 text-left font-normal"
      >
        <span className={`truncate ${selected ? "text-[#243b32]" : "text-[#667064]"}`}>
          {selected?.name || "Search or choose a business type"}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-[#335e41]" />
      </button>
      {open && (
        <>
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close category choices"
            onClick={close}
            className="fixed inset-0 z-40 cursor-default bg-[#172f29]/30 md:bg-transparent"
          />
          <div className="enrollment-category-panel fixed inset-x-3 bottom-3 z-50 flex h-[min(70dvh,480px)] flex-col overflow-hidden rounded-2xl border border-[#dfe5d8] bg-white p-3 shadow-[0_18px_60px_#183e3530] md:absolute md:inset-x-0 md:bottom-auto md:top-full md:mt-2 md:h-[320px] md:p-2">
            <div className="flex items-center justify-between gap-3 px-1 pb-2">
              <span className="text-sm font-bold text-[#183e35]">Choose business category</span>
              <button type="button" onClick={close} className="min-h-10 px-2 text-sm font-semibold text-[#335e41]">Close</button>
            </div>
            <div className="relative shrink-0">
              <Search size={18} aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#667064]" />
              <input
                ref={searchRef}
                type="search"
                role="combobox"
                aria-label="Search business categories"
                aria-autocomplete="list"
                aria-expanded={open}
                aria-controls={`${id}-results`}
                aria-activedescendant={matches[activeIndex] ? `${id}-option-${matches[activeIndex].slug}` : undefined}
                placeholder="Try mitumba, salon, printing…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setActiveIndex(0);
                }}
                onKeyDown={onSearchKeyDown}
                className="ui-input !pl-10"
              />
            </div>
            <p role="status" className="px-2 py-2 text-xs font-medium text-[#667064]">
              {matches.length} {matches.length === 1 ? "category" : "categories"} found
            </p>
            <div id={`${id}-results`} role="listbox" aria-label="Business categories" className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain">
              {matches.map((category, index) => (
                <button
                  type="button"
                  role="option"
                  key={category.slug}
                  id={`${id}-option-${category.slug}`}
                  aria-selected={value === category.slug}
                  onClick={() => choose(category.slug)}
                  onMouseEnter={() => setActiveIndex(index)}
                  className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left transition-colors ${index === activeIndex ? "bg-[#edf2e5]" : "hover:bg-[#f5f7f1]"}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#183e35]">{category.name}</span>
                    <span className="block text-xs text-[#667064]">{CATEGORY_GROUPS.find((group) => group.slug === category.group)?.name}</span>
                  </span>
                  {value === category.slug && <Check size={17} aria-hidden="true" className="shrink-0 text-[#335e41]" />}
                </button>
              ))}
              {matches.length === 0 && (
                <p className="px-3 py-5 text-sm text-[#667064]">No matching categories. Try a broader word.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
