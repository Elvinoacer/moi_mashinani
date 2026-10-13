import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { AccountGate } from '@/components/AccountGate';
import { BusinessEnrollmentForm } from '@/components/BusinessEnrollmentForm';
export default function AdminEnrollmentPage() {
  return <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]"><Navbar /><main className="flex-1 max-w-6xl w-full mx-auto px-4 md:px-8 py-8"><AccountGate requiredRole="ADMIN"><div className="space-y-6"><div className="page-hero rounded-2xl border border-[#dfe5d8] bg-white p-6 space-y-2"><Link href="/admin" className="text-sm font-semibold text-[#335e41]">← Admin console</Link><h1 className="font-display text-2xl md:text-3xl font-bold text-[#243b32]">Enroll a business</h1><p className="text-sm text-[#667064]">Four quick steps: enter the essentials, select ready-made items and hours, capture photos, and send the owner their invitation.</p></div><BusinessEnrollmentForm /></div></AccountGate></main><Footer /><BottomNav /></div>;
}
