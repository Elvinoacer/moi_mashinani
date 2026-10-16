import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Check, Sparkles } from 'lucide-react';

/** A local landmark anchors the invitation to the community it serves. */
export function JoinNeighborhoodCard() {
  return (
    <section aria-labelledby="join-neighborhood-heading"
      className="join-neighborhood relative isolate min-w-0 overflow-hidden rounded-[26px] bg-[#183e35] text-white shadow-[0_18px_36px_#183e3514]">
      <div className="join-neighborhood-backdrop" aria-hidden="true">
        <Image
          src="/images/university_gate.webp"
          alt=""
          fill
          sizes="(max-width: 639px) 100vw, (max-width: 1152px) 75vw, 828px"
          className="join-neighborhood-photo"
        />
      </div>
      <div className="join-neighborhood-copy relative z-10 px-6 py-9 sm:px-9 sm:py-11 lg:px-12 lg:py-14">
        <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#d9f279]">
          <Sparkles size={15} className="shrink-0" aria-hidden="true" /> A place for every local business
        </p>
        <h2 id="join-neighborhood-heading" className="max-w-[550px] text-[30px] font-bold leading-[1.14] tracking-[-0.055em] sm:text-[40px] lg:text-[46px]">
          Your business deserves to be <span className="text-[#d9f279]">found around here.</span>
        </h2>
        <p className="mt-4 max-w-[430px] text-sm leading-7 text-[#d9e6d9]">
          From a weekend hustle to a busy shop. Give your work a home where students already look for help.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-[#e4efdc]">
          <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#d9f279]" aria-hidden="true" /> Free to get listed</span>
          <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#d9f279]" aria-hidden="true" /> Customers contact you directly</span>
        </div>
        <Link href="/onboard"
          className="mt-7 inline-flex min-h-[50px] items-center justify-between gap-5 rounded-[12px] bg-[#d9f279] px-5 py-3 text-sm font-extrabold text-[#183e35] transition-transform hover:-translate-y-0.5 hover:bg-[#e4faa0] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white">
          Put your business on the map <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
        <Link href="/dashboard" className="mt-4 flex min-h-11 w-fit items-center text-xs font-semibold text-[#e4efdc] underline underline-offset-4 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white">
          Manage my shop
        </Link>
      </div>
    </section>
  );
}
