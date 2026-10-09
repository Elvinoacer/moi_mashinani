import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { CategoryBrowser } from '@/components/CategoryBrowser';
import { CATEGORIES, CATEGORY_GROUPS } from '@/lib/categories';

export const metadata = { title: 'Campus business categories | MoiMashinani', description: 'Explore food, housing, clothing, health, transport and everyday services around Moi University.' };

export default function CategoriesPage() {
  return <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]"><Navbar /><main className="mx-auto w-full max-w-6xl flex-1 px-5 py-10">
    <Link href="/" className="text-sm text-[#335e41]">← Back home</Link>
    <h1 className="mt-6 text-3xl font-bold text-[#243b32]">What do you need around campus?</h1>
    <p className="mt-3 text-[#667064]">Explore {CATEGORIES.length} business types in {CATEGORY_GROUPS.length} groups, from daily essentials to specialist services.</p>
    <CategoryBrowser />
  </main><Footer /><BottomNav /></div>;
}
