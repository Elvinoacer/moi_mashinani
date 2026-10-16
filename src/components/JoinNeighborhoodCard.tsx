import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";

/** An action-first invitation to campus sellers. */
export function JoinNeighborhoodCard() {
  return (
    <section aria-labelledby="join-neighborhood-heading"
      className="join-neighborhood relative isolate min-w-0 overflow-hidden rounded-[22px] bg-[#183e35] text-white shadow-[0_12px_28px_#183e3514]">
      <div className="join-neighborhood-backdrop" aria-hidden="true">
        <Image src="/images/university_gate.webp" alt="" fill
          sizes="(max-width: 639px) 100vw, (max-width: 1152px) 75vw, 828px"
          className="join-neighborhood-photo" />
      </div>
      <div className="join-neighborhood-copy relative z-10 px-6 py-7 sm:px-9 sm:py-9 lg:px-12 lg:py-11">
        <p className="mb-2 text-[10px] font-extrabold uppercase tracking-[0.12em] text-[#d9f279]">For local businesses</p>
        <h2 id="join-neighborhood-heading" className="max-w-[570px] text-[27px] font-bold leading-[1.15] tracking-[-0.045em] sm:text-[38px] lg:text-[42px]">
          Get your business <span className="text-[#d9f279]">found around Moi.</span>
        </h2>
        <p className="mt-3 max-w-[440px] text-sm leading-6 text-[#d9e6d9]">
          List free. Students find you and contact you directly.
        </p>
        <div className="join-neighborhood-actions mt-5 flex flex-wrap items-center gap-3">
          <Link href="/onboard"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[11px] bg-[#d9f279] px-4 py-2.5 text-sm font-extrabold text-[#183e35] transition-colors hover:bg-[#e4faa0] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white">
            List free <ArrowUpRight size={18} aria-hidden="true" />
          </Link>
          <Link href="/dashboard"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-[#e4efdc] underline underline-offset-4 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white">
            Manage listing
          </Link>
        </div>
      </div>
    </section>
  );
}
