'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, CATEGORY_GROUPS, categorySearchText } from '@/lib/categories';
import { CategoryIcon } from '@/components/icons';
import { Search, X } from 'lucide-react';

export function CategoryBrowser() {
  const id = useId();
  const [query, setQuery] = useState('');
  const trimmed = query.trim();
  const words = trimmed.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = CATEGORIES.filter(category => words.every(word => categorySearchText(category).includes(word)));

  return (
    <div className="space-y-5 py-4">
      <div>
        <label htmlFor={id} className="block text-sm font-semibold mb-1.5 text-[#243b32]">
          Find what you need around campus
        </label>
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#758071] pointer-events-none" aria-hidden="true" />
          <input
            id={id}
            type="search"
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Try snacks, bedsitters, mitumba, M-Pesa…"
            className="w-full rounded-xl border border-[#dfe5d8] bg-white pl-10 pr-10 py-3 text-sm text-[#243b32] placeholder:text-[#758071] focus:outline-2 focus:outline-[#335e41]"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#758071] hover:text-[#243b32] rounded-full hover:bg-[#e9eedf] transition"
              aria-label="Clear category search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {trimmed.length > 0 && matches.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#e9eedf]/70 border border-[#dfe5d8] px-4 py-2.5 text-xs text-[#243b32]">
          <span>Looking for specific businesses or items?</span>
          <Link
            href={`/search?q=${encodeURIComponent(trimmed)}`}
            className="font-bold text-[#183e35] hover:underline"
          >
            Search all businesses for &ldquo;{trimmed}&rdquo; →
          </Link>
        </div>
      )}

      <p role="status" className="text-xs text-[#667064]">
        {matches.length} business types{words.length ? ' match your search' : ' across everyday campus needs'}
      </p>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORY_GROUPS.map(group => {
          const categories = matches.filter(category => category.group === group.slug);
          if (!categories.length) return null;
          return (
            <section key={group.slug} className="rounded-xl border border-[#dfe5d8] bg-white p-4">
              <h3 className="mb-3 text-sm font-bold">
                <Link href={`/search?category=${group.slug}`} className="hover:underline">
                  {group.name} →
                </Link>
              </h3>
              <ul className="space-y-1">
                {categories.map(category => (
                  <li key={category.slug}>
                    <Link
                      href={`/c/${category.slug}`}
                      className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#e9eedf] focus-visible:outline-2 focus-visible:outline-[#335e41]"
                    >
                      <CategoryIcon slug={category.slug} className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{category.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      {!matches.length && (
        <div className="rounded-xl border border-[#dfe5d8] bg-white p-6 text-center space-y-3">
          <p className="text-sm text-[#667064]">
            No categories found matching &ldquo;{query}&rdquo;.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={`/search?q=${encodeURIComponent(trimmed)}`}
              className="inline-flex items-center gap-1.5 bg-[#183e35] text-white px-4 py-2 rounded-full font-bold text-xs uppercase hover:bg-[#243b32] transition"
            >
              Search all businesses for &ldquo;{trimmed}&rdquo; →
            </Link>
            <button
              type="button"
              className="text-xs font-bold text-[#335e41] hover:underline"
              onClick={() => setQuery('')}
            >
              Show all categories
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

