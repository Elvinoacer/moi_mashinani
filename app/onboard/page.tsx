import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessEnrollmentForm } from '@/components/BusinessEnrollmentForm';
export default function BusinessOnboardPage() {
  return <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]"><Navbar /><main className="flex-1 max-w-3xl w-full mx-auto px-4 md:px-8 py-8 space-y-6"><div className="page-hero rounded-2xl border border-[#dfe5d8] bg-white p-6 space-y-2"><h1 className="font-display text-2xl md:text-3xl font-bold text-[#243b32]">List your business — free</h1><p className="text-sm text-[#667064]">Reach students around Moi University. Verify your email to manage your profile, prices and offers.</p></div><BusinessEnrollmentForm mode="public" /></main><Footer /><BottomNav /></div>;
}
