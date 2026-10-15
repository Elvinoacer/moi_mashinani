"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, MapPin, Search, X } from "lucide-react";
import { ZONES } from "@/lib/constants";

interface CampusZonePickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * A searchable location picker. The search/list lives in an anchored overlay,
 * so opening it never moves the hero or pushes another control off-screen.
 */
export function CampusZonePicker({ value, onChange, disabled = false }: CampusZonePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const selected = ZONES.find((zone) => zone.slug === value) || ZONES[0];
  const results = ZONES.filter((zone) =>
    (zone.name + " " + zone.landmarkHint).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
    function dismiss(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", onEscape);
    };
  }, [open]);

  function choose(zone: string) {
    onChange(zone);
    setOpen(false);
    setQuery("");
    setActive(0);
    triggerRef.current?.focus();
  }

  return (
    <div className="campus-zone-picker" ref={rootRef}>
      <span className="campus-zone-label" id={`${listId}-label`}>
        <MapPin size={16} aria-hidden="true" /> Your campus area
      </span>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        className="campus-zone-trigger"
        aria-labelledby={`${listId}-label ${listId}-value`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? `${listId}-panel` : undefined}
        onClick={() => { setQuery(""); setActive(0); setOpen((previous) => !previous); }}
      >
        <span id={`${listId}-value`} className="min-w-0 truncate">{selected.name}</span>
        <span className="campus-zone-trigger-action">Change <ChevronDown size={16} aria-hidden="true" className={open ? "rotate-180" : ""} /></span>
      </button>
      <p className="campus-zone-hint">Showing places in {value === "all" ? "all campus areas" : selected.name}.</p>
      {open && (
        <div className="campus-zone-panel" id={`${listId}-panel`} role="dialog" aria-label="Choose a campus area">
          <div className="campus-zone-search-wrap">
            <Search size={18} aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              role="combobox"
              aria-label="Search campus areas"
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded="true"
              aria-activedescendant={results[active] ? `${listId}-option-${results[active].slug}` : undefined}
              autoComplete="off"
              value={query}
              onChange={(event) => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => Math.min(index + 1, results.length - 1)); }
                if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(0, index - 1)); }
                if (event.key === "Enter" && results[active]) { event.preventDefault(); choose(results[active].slug); }
                if (event.key === "Escape") { event.preventDefault(); setOpen(false); triggerRef.current?.focus(); }
              }}
              placeholder="Search Stage, Soweto, Talai…"
            />
            {query && <button type="button" aria-label="Clear area search" className="campus-zone-clear" onClick={() => { setQuery(""); setActive(0); searchRef.current?.focus(); }}><X size={16} /></button>}
          </div>
          <div id={listId} role="listbox" aria-label="Campus areas" className="campus-zone-options">
            {results.length ? results.map((zone, index) => (
              <button
                type="button"
                key={zone.slug}
                id={`${listId}-option-${zone.slug}`}
                role="option"
                aria-selected={zone.slug === selected.slug}
                className={`campus-zone-option ${index === active ? "campus-zone-option-active" : ""}`}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(zone.slug)}
              >
                <span className="min-w-0">
                  <strong>{zone.name}</strong>
                  <small>{zone.landmarkHint}</small>
                </span>
                {zone.slug === selected.slug && <Check size={18} aria-hidden="true" />}
              </button>
            )) : <p className="campus-zone-empty" role="status">No matching area. Try another landmark or choose All Kesses.</p>}
          </div>
          <p className="campus-zone-keyboard">Type to filter · Use ↑ ↓ and Enter to choose</p>
        </div>
      )}
    </div>
  );
}
