import Image from 'next/image';
import Link from '@/components/MotionLink';

/** One vector identity shared by the landing page, navigation, and footer. */
export function SiteBrand({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="Moi Mashinani home" className={`inline-flex min-w-0 shrink items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#335e41] ${className}`}>
      <Image
        src="/brand/moimashinani-logo.svg"
        alt="Moi Mashinani — Moi University Campus Business Directory"
        width={300}
        height={64}
        unoptimized
        loading="eager"
        className={small ? 'h-auto w-[150px]' : 'h-auto w-[128px] min-[370px]:w-[155px] min-[420px]:w-[190px] sm:w-[212px]'}
      />
    </Link>
  );
}
