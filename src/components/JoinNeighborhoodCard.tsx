import Link from 'next/link';
import { ArrowUpRight, Check, MapPin, Sparkles, Store } from 'lucide-react';

/** An owner invitation that shares the landing page's hand-built neighborhood motif. */
export function JoinNeighborhoodCard() {
  return (
    <section aria-labelledby="join-neighborhood-heading"
      className="relative isolate grid min-w-0 overflow-hidden rounded-[26px] bg-[#183e35] text-white shadow-[0_18px_36px_#183e3514] md:grid-cols-[1.08fr_0.92fr]">
      <div className="relative z-10 px-6 py-9 sm:px-9 sm:py-11 lg:px-12 lg:py-14">
        <p className="mb-4 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.16em] text-[#d9f279]">
          <Sparkles size={15} /> A place for every local business
        </p>
        <h2 id="join-neighborhood-heading" className="max-w-[550px] text-[30px] font-bold leading-[1.14] tracking-[-0.055em] sm:text-[40px] lg:text-[46px]">
          Your business deserves to be <span className="text-[#d9f279]">found around here.</span>
        </h2>
        <p className="mt-4 max-w-[430px] text-sm leading-7 text-[#d9e6d9]">
          From a weekend hustle to a busy shop. Give your work a home where students already look for help.
        </p>
        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[11px] font-semibold text-[#e4efdc]">
          <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#d9f279]" /> Free to get listed</span>
          <span className="inline-flex items-center gap-2"><Check size={15} className="text-[#d9f279]" /> Customers contact you directly</span>
        </div>
        <Link href="/onboard"
          className="mt-7 inline-flex min-h-[50px] items-center justify-between gap-5 rounded-[12px] bg-[#d9f279] px-5 py-3 text-sm font-extrabold text-[#183e35] transition-transform hover:-translate-y-0.5 hover:bg-[#e4faa0] focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-white">
          Put your business on the map <ArrowUpRight size={18} aria-hidden="true" />
        </Link>
      </div>

      <div aria-hidden="true" className="relative flex min-h-[240px] items-center justify-center overflow-hidden bg-[#2a4e3f] sm:min-h-[280px] md:min-h-0">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#d9f279 1px, transparent 1px)', backgroundSize: '22px 22px' }} />
        <div className="absolute -right-20 -top-24 h-[260px] w-[260px] rounded-full border-[48px] border-[#aec96c33]" />
        <div className="absolute -bottom-32 -left-20 h-[310px] w-[310px] rounded-full border-[55px] border-[#aec96c22]" />
        <div className="relative -rotate-[5deg] rounded-[20px] bg-[#f7f8f2] p-3 pb-4 shadow-[0_26px_45px_#102b2240]">
          <div className="relative h-28 w-52 overflow-hidden rounded-[12px] bg-[#e2eaca] sm:h-32 sm:w-60">
            <div className="absolute bottom-0 left-8 h-20 w-36 rounded-t-lg bg-[#50725b] sm:left-10 sm:w-40" />
            <div className="absolute bottom-16 left-6 h-5 w-40 -skew-x-12 rounded-t-lg bg-[#d9f279] sm:left-8 sm:w-44" />
            <div className="absolute bottom-0 left-14 h-14 w-12 bg-[#e0ead8] sm:left-16" />
            <div className="absolute bottom-8 right-9 h-8 w-7 rounded-t-sm bg-[#b9d3ad]" />
            <MapPin className="absolute right-3 top-3 text-[#385b42]" size={24} />
          </div>
          <div className="mt-3 flex items-center gap-2 pl-1">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#e6eddd] text-[#385b42]"><Store size={18} /></span>
            <span className="text-left"><strong className="block text-[12px] text-[#183e35]">Your shop, discovered.</strong><small className="text-[10px] text-[#667064]">Good things happen locally.</small></span>
          </div>
        </div>
        <div className="absolute bottom-6 right-6 rotate-[7deg] rounded-[11px] bg-[#d9f279] px-4 py-2 text-[11px] font-extrabold text-[#183e35] shadow-lg sm:bottom-10 sm:right-10">HELLO, NEIGHBOR ↗</div>
      </div>
    </section>
  );
}
