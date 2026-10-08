'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from '@/src/components/icons';

export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    // Default to the featured flagship merchant: kevin-phones-laptops
    router.replace('/dashboard/kevin-phones-laptops');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F2F5F8]">
      <div className="bg-white p-6 signboard-border rounded-xl text-center">
        <RefreshCw className="w-10 h-10 text-[#9B0044] animate-spin mx-auto" />
        <div className="mt-2 font-bold text-sm text-[#001C3B]">Opening Merchant Hub...</div>
      </div>
    </div>
  );
}
