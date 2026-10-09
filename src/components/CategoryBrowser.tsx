'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { CATEGORIES, CATEGORY_GROUPS, categorySearchText } from '@/lib/categories';
import { CategoryIcon } from '@/components/icons';

export function CategoryBrowser() {
  const id = useId();
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = CATEGORIES.filter(category => words.every(word => categorySearchText(category).includes(word)));
  return <div className="space-y-5 py-4">
    <label htmlFor={id} className="block text-sm font-semibold">Find what you need around campus</label>
    <input id={id} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Try snacks, bedsitters, mitumba, M-Pesa…" className="w-full rounded-xl border border-[#dfe5d8] bg-white px-4 py-3 text-sm focus:outline-2 focus:outline-[#335e41]" />
    <p role="status" className="text-xs text-[#667064]">{matches.length} business types{words.length ? ' match your search' : ' across everyday campus needs'}</p>
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {CATEGORY_GROUPS.map(group => {
        const categories = matches.filter(category => category.group === group.slug);
        if (!categories.length) return null;
        return <section key={group.slug} className="rounded-xl border border-[#dfe5d8] bg-white p-4">
          <h3 className="mb-3 text-sm font-bold"><Link href={`/search?category=${group.slug}`}>{group.name} →</Link></h3>
          <ul className="space-y-1">
            {categories.map(category => <li key={category.slug}><Link href={`/c/${category.slug}`} className="flex items-start gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[#e9eedf] focus-visible:outline-2 focus-visible:outline-[#335e41]"><CategoryIcon slug={category.slug} className="mt-0.5 h-4 w-4 shrink-0" /><span>{category.name}</span></Link></li>)}
          </ul>
        </section>;
      })}
    </div>
    {!matches.length && <p className="text-sm text-[#667064]">No categories found. Try a different word or <button type="button" className="underline" onClick={() => setQuery('')}>show all categories</button>.</p>}
  </div>;
}
