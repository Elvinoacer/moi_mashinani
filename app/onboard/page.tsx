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
      <main className="flex-1 max-w-6xl w-full mx-auto px-3 py-4 sm:px-6 sm:py-7 md:px-8 space-y-4 sm:space-y-5">
        <div className="page-hero !rounded-2xl !p-4 sm:!p-6 space-y-2">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-[#243b32]">
            List your business — free
          </h1>
          <p className="text-sm text-[#667064]">
            Two simple steps: add your business and core prices, then review photos and trust details. Sign in by phone to manage your listing, or use an email invitation.
          </p>
        </div>
        <BusinessEnrollmentForm mode="public" />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

