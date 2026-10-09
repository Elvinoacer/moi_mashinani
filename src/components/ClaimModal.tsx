'use client';

import Link from 'next/link';
import { ModalFrame } from '@/components/ModalFrame';

export function ClaimModal({ businessSlug, businessName, onClose }: {
  businessSlug: string;
  businessName: string;
  onClose: () => void;
}) {
  return (
    <ModalFrame title={`Manage ${businessName}`} onClose={onClose}>
      <div className="space-y-4 p-6">
        <p className="text-sm text-[#667064]">Use the verification link sent to your owner email when the admin enrolled your business. Once verified, you can sign in and manage your listing.</p>
        <p className="text-sm text-[#667064]">If you have not received an invitation, ask the admin who visited your business to confirm your email and resend it.</p>
        <Link href={`/login?next=${encodeURIComponent(`/dashboard/${businessSlug}`)}`} className="inline-block rounded-full bg-[#335e41] px-5 py-2.5 text-sm font-bold text-white">Sign in to your business</Link>
      </div>
    </ModalFrame>
  );
}
