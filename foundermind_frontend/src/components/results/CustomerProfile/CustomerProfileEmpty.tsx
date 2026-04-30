import { Clock, Search, User, Zap } from "lucide-react";

export function CustomerProfileEmpty() {
  return (
    <div className="flex flex-col md:flex-row gap-4 items-stretch">
      <div className="flex flex-col gap-4 w-full md:w-[320px] shrink-0">
        <div className="flex-1 rounded-[20px] border border-white/[0.06] bg-[#111116] p-7 flex flex-col justify-center items-center text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.03] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="w-[110px] h-[110px] rounded-full bg-[#161720] mb-6 flex items-center justify-center border border-white/[0.05] shadow-inner relative">
              <div className="absolute inset-0 rounded-full border-[1.5px] border-slate-700/30 border-dashed animate-[spin_20s_linear_infinite]" />
              <User className="w-10 h-10 text-[#383b4d]" strokeWidth={1.5} />
            </div>

            <h2 className="text-[20px] font-bold text-[#8e93a6] leading-[1.2] mb-3">
              No Persona
              <br />
              Generated
            </h2>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#383b4d]/40 bg-[#1f2130] text-[#6b6f84] text-[12px] font-medium tracking-wide mb-6">
              <Clock className="w-3 h-3" />
              <span>Awaiting Data</span>
            </div>

            <p className="text-[#5c6074] text-[13.5px] leading-[1.6]">
              Provide more details about your concept to generate a targeted customer profile.
            </p>
          </div>
        </div>

        <div className="rounded-[16px] border border-white/[0.06] bg-[#111116] p-5">
          <div className="flex justify-between items-center mb-4">
            <span className="text-[14px] font-bold text-[#5c6074] tracking-wide">Persona Strength</span>
            <span className="text-[14px] font-bold text-[#383b4d]">0%</span>
          </div>
          <div className="h-[6px] w-full bg-[#1b1d27] rounded-full overflow-hidden">
            <div className="h-full bg-[#383b4d] w-[0%] rounded-full" />
          </div>
        </div>
      </div>

      <div className="flex-1 rounded-[20px] border border-white/[0.06] bg-[#111116] p-10 flex flex-col items-center justify-center text-center">
        <div className="relative w-[300px] h-[300px] mb-8 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full text-[#383b4d]" viewBox="0 0 200 200">
            <path d="M 15 100 A 85 85 0 0 1 185 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
            <path d="M 185 100 A 85 85 0 0 1 15 100" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" />
            <path d="M 183 104 L 188 94 L 178 94" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, 5) rotate(15, 185, 100)" />
            <path d="M 17 96 L 12 106 L 22 106" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" transform="translate(0, -5) rotate(15, 15, 100)" />
          </svg>

          <div className="absolute inset-[36px] rounded-full border-[1.5px] border-[#383b4d]/50 border-dashed" />

          <div className="absolute inset-[72px] rounded-full bg-[#1f2130] border-[1.5px] border-[#3e3465]/60 flex items-center justify-center shadow-[0_0_30px_rgba(40,25,80,0.5)]">
            <User className="w-[68px] h-[68px] text-[#7b61c9]" strokeWidth={1.2} />
          </div>
        </div>

        <h2 className="text-[24px] font-bold text-white tracking-wide mb-4">
          Customer Profile Unavailable
        </h2>

        <p className="text-[#8e93a6] text-[15.5px] leading-[1.7] max-w-[440px] mx-auto mb-10">
          The agent couldn&apos;t build a customer persona for this idea. This may be due to an API timeout, insufficient market data, or an early-stage concept with no defined audience yet.
        </p>

        <div className="flex flex-col gap-[14px] w-full max-w-[280px] mb-12">
          <div className="flex items-center gap-[14px] px-5 py-[10px] rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-500 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent w-full h-full pointer-events-none" />
            <Zap className="w-[18px] h-[18px] shrink-0" fill="currentColor" fillOpacity={0.2} />
            <span className="text-[14.5px] font-medium tracking-wide">Early-stage concept</span>
          </div>
          <div className="flex items-center gap-[14px] px-5 py-[10px] rounded-full border border-white/[0.08] bg-[#1c1d25] text-slate-300">
            <Search className="w-[18px] h-[18px] shrink-0 text-slate-500" />
            <span className="text-[14.5px] font-medium text-[#c0c3d4]">Insufficient public data</span>
          </div>
          <div className="flex items-center gap-[14px] px-5 py-[10px] rounded-full border border-white/[0.08] bg-[#1c1d25] text-slate-300">
            <Clock className="w-[18px] h-[18px] shrink-0 text-slate-500" />
            <span className="text-[14.5px] font-medium text-[#c0c3d4]">Agent timeout possible</span>
          </div>
        </div>

        <button
          type="button"
          className="px-6 py-2.5 rounded-[10px] border border-[#6d4d9c]/80 bg-transparent text-[#977be3] font-medium text-[15px] hover:bg-[#6d4d9c]/15 transition-colors focus:ring-2 focus:ring-[#6d4d9c]/50 outline-none"
        >
          Retry this section
        </button>
      </div>
    </div>
  );
}
