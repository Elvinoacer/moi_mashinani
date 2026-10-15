import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BottomNav } from '@/components/BottomNav';
import { BusinessEnrollmentForm } from '@/components/BusinessEnrollmentForm';
import {
  CORE_CAMPUS_KEYWORDS,
  generateBreadcrumbSchema,
  safeJsonLd,
} from '@/lib/seo';

export const metadata: Metadata = {
  title: 'List Your Business Free — Reach Moi University Students & Campus Community | Kesses',
  description:
    'Put your shop, hostel, salon, kibanda, or fundi service on the Moi University campus map for free. Direct student calls and WhatsApp orders in Kesses.',
  keywords: [
    'list business Moi University',
    'register shop Kesses',
    'free campus business listing',
    'advertise to Moi students',
    'Moi University directory enrollment',
    ...CORE_CAMPUS_KEYWORDS.slice(0, 15),
  ],
  alternates: {
    canonical: '/onboard',
  },
  openGraph: {
    title: 'List Your Business Free | MoiMashinani (Kesses)',
    description:
      'Put your shop, hostel, salon, kibanda, or fundi service on the Moi University campus map for free. Connect directly with students.',
    url: '/onboard',
    siteName: 'MoiMashinani',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'List Your Business Free | Moi University Campus Directory',
    description: 'Register your shop or service in Kesses and reach thousands of students.',
  },
};

export default function BusinessOnboardPage() {
  const breadcrumbsSchema = generateBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'List Your Business', url: '/onboard' },
  ]);

  return (
    <div className="interior-page min-h-screen flex flex-col bg-[#f7f8f2]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbsSchema) }}
      />
      <Navbar />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-3 px-3 pb-12 pt-4 sm:gap-4 sm:px-6 sm:pt-7">
        <div className="rounded-2xl border border-[#dce7d8] bg-[#eef4e9] px-4 py-4 sm:px-6 sm:py-5">
          <p className="text-[11px] font-extrabold uppercase tracking-[.1em] text-[#426b50]">Get discovered on campus</p>
          <h1 className="mt-1.5 font-display text-[clamp(1.55rem,5vw,2rem)] font-extrabold leading-tight tracking-tight text-[#183e35]">
            List your business for free
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#4e6557]">
            Add your business and prices, then review and submit. No account needed to start.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-[#587060]">
            You&apos;ll get an email invitation to set up your account after submitting.
            <span className="mx-1.5" aria-hidden="true">·</span>
            Already manage a listing?{" "}
            <a href="/login?next=%2Fdashboard" className="font-bold text-[#174e3c] underline decoration-[#759987] underline-offset-4 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#335e41]">
              Sign in
            </a>
          </p>
        </div>
        <BusinessEnrollmentForm mode="public" />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

