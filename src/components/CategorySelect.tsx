'use client';

import { useId, useState } from 'react';
import { CATEGORIES, CATEGORY_GROUPS, categorySearchText } from '@/lib/categories';

/** Native grouped selection keeps touch and keyboard navigation familiar. */
export function CategorySelect({ value, onChange, className, allowAll = false, required = false, compact = false }: {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  allowAll?: boolean;
  required?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = CATEGORIES.filter(category => words.every(word => categorySearchText(category).includes(word)));
  const selected = CATEGORIES.find(category => category.slug === value);

  if (compact) {
    return (
      <div className="min-w-0">
        <label htmlFor={`${id}-select`} className="sr-only">Category</label>
        <select
          id={`${id}-select`}
          aria-label="Category"
          value={value}
          required={required}
          onChange={event => onChange(event.target.value)}
          className={className ?? 'w-full rounded-lg border border-[#dfe5d8] bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-[#335e41]'}
        >
          <option value="">{allowAll ? 'All categories' : 'Choose a business type'}</option>
          {CATEGORY_GROUPS.map(group => (
            <optgroup key={group.slug} label={group.name}>
              {allowAll && <option value={group.slug}>All {group.name.toLowerCase()}</option>}
              {CATEGORIES.filter(category => category.group === group.slug).map(category => (
                <option key={category.slug} value={category.slug}>{category.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-1.5">
      <label htmlFor={`${id}-search`} className="sr-only">Search business categories</label>
      <input id={`${id}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Find a type: mitumba, juice, boda…" className="w-full rounded-lg border border-[#dfe5d8] bg-white px-3 py-2 text-sm font-normal text-[#243b32] focus:outline-2 focus:outline-[#335e41]" />
      <label htmlFor={`${id}-select`} className="sr-only">Category</label>
      <select id={`${id}-select`} aria-label="Category" aria-describedby={`${id}-help`} value={value} required={required} onChange={event => onChange(event.target.value)} className={className ?? 'w-full rounded-lg border border-[#dfe5d8] bg-white px-3 py-2 text-sm focus:outline-2 focus:outline-[#335e41]'}>
        <option value="">{allowAll ? 'All categories' : 'Choose a business type'}</option>
        {selected && !matches.includes(selected) && <option value={selected.slug}>{selected.name} (selected)</option>}
        {CATEGORY_GROUPS.map(group => {
          const categories = matches.filter(category => category.group === group.slug);
          if (!categories.length && !(allowAll && group.slug === value)) return null;
          return <optgroup key={group.slug} label={group.name}>
            {allowAll && <option value={group.slug}>All {group.name.toLowerCase()}</option>}
            {categories.map(category => <option key={category.slug} value={category.slug}>{category.name}</option>)}
          </optgroup>;
        })}
      </select>
      <p id={`${id}-help`} className="text-xs font-normal text-[#667064]" role="status">{words.length ? (matches.length ? `${matches.length} matching business types` : 'No matches. Try another word or clear the search.') : 'Browse by need, then choose a business type.'}</p>
    </div>
  );
}
