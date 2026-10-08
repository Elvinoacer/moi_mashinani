import Link from "next/link";
import { MapPin } from "lucide-react";

/** Mirrors the approved landing-page wordmark without coupling interior routes to its CSS module. */
export function SiteBrand({ small = false }: { small?: boolean }) {
  return (
    <Link href="/" aria-label="MoiMashinani home" className="inline-flex shrink-0 items-center gap-2.5 text-[#183e35] group">
      <span className="grid h-[38px] w-[34px] shrink-0 -rotate-[7deg] place-items-center rounded-[11px_11px_11px_3px] bg-[#183e35] text-[#d9f279] transition-transform group-hover:-rotate-[2deg]">
        <MapPin size={21} strokeWidth={2.6} className="rotate-[7deg]" />
      </span>
      <span className={\`font-display whitespace-nowrap font-extrabold tracking-[-1.2px] \${small ? "text-[20px]" : "text-[23px]"}\`}>
        moi<span className="font-medium">mashinani</span><span className="text-[#799633]">.</span>
      </span>
    </Link>
  );
}
