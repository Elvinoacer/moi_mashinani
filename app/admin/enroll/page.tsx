import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { BottomNav } from "@/components/BottomNav";
import { AccountGate } from "@/components/AccountGate";
import { BusinessEnrollmentForm } from "@/components/BusinessEnrollmentForm";

export default function AdminEnrollmentPage() {
  return (
    <div className="interior-page flex min-h-screen flex-col bg-[#f7f8f2]">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-6 sm:py-7 md:px-8">
        <AccountGate requiredRole="ADMIN">
          <div className="space-y-4 sm:space-y-5">
            <div className="page-hero space-y-2 !rounded-2xl !p-4 sm:!p-6">
              <Link href="/admin" className="inline-flex min-h-9 items-center text-sm font-semibold text-[#335e41]">
                ← Admin console
              </Link>
              <h1 className="text-2xl font-bold text-[#183e35] sm:text-3xl">Enroll a business</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-[#526154]">
                Two steps: add the business and its prices, then review photos, trust details and owner consent.
              </p>
            </div>
            <BusinessEnrollmentForm />
          </div>
        </AccountGate>
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
