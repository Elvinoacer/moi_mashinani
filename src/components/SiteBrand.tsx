import Image from 'next/image';
import Link from 'next/link';

/** One vector identity shared by the landing page, navigation, and footer. */
export function SiteBrand({ small = false, className = '' }: { small?: boolean; className?: string }) {
  return (
    <Link href="/" aria-label="MoiMashinani home" className={`inline-flex shrink-0 items-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#335e41] ${className}`}>
      <Image
        src="/brand/moimashinani-logo.svg"
        alt="MoiMashinani — Moi University Campus Business Directory"
        width={300}
        height={64}
        unoptimized
        loading="eager"
        className={small ? 'h-auto w-[180px]' : 'h-auto w-[160px] min-[380px]:w-[190px] sm:w-[212px]'}
      />
    </Link>
  );
}
