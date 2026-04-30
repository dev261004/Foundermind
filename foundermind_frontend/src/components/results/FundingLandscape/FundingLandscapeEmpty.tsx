export function FundingLandscapeEmpty() {
  return (
    <div className="mt-1 border border-[#1d1f27] rounded-[10px] bg-gradient-to-b from-[#0e0e14] to-[#0A0B10] flex flex-col items-center justify-center py-16 px-6 relative overflow-hidden">
      <div className="relative w-[130px] h-[130px] mb-8 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-[#3e3465]/60 z-10" />
        <div className="absolute inset-[15%] rounded-full border border-[#3e3465]/50 z-10" />
        <div className="absolute inset-[30%] rounded-full border border-[#3e3465]/40 z-10" />
        <div className="absolute inset-[45%] rounded-full border border-[#3e3465]/30 z-10" />

        <div className="absolute inset-[-1px] rounded-full animate-[spin_3s_linear_infinite] overflow-hidden mix-blend-screen opacity-90 z-20">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg at 50% 50%, transparent 0%, transparent 35%, rgba(167, 139, 250, 0.45) 100%)",
            }}
          />
          <div className="absolute top-0 left-1/2 h-1/2 w-[2px] bg-[#b38bf3] shadow-[0_0_12px_4px_rgba(167,139,250,0.8)] -translate-x-1/2 origin-bottom" />
          <div className="absolute top-0 left-1/2 h-1/2 w-[1px] bg-[#ffffff] shadow-[0_0_2px_1px_rgba(255,255,255,0.8)] -translate-x-1/2 origin-bottom" />
        </div>

        <div className="absolute w-[4px] h-[4px] rounded-full bg-[#daccff] shadow-[0_0_8px_3px_rgba(167,139,250,0.8)] z-30" />
      </div>

      <h3 className="text-[#f8f8f8] text-[22px] font-semibold mb-3 tracking-wide text-center">
        No Funding Signals Found
      </h3>

      <p className="text-[#8c8f9b] text-center max-w-[600px] text-[15px] leading-relaxed mb-6 font-medium">
        The agent scanned public sources but couldn&apos;t retrieve recent
        funding activity for this space. This may indicate an early-stage
        market, a stealth funding environment, or a data gap.
      </p>

      <div className="flex flex-wrap justify-center items-center gap-[10px] mb-12">
        <span className="px-[14px] py-1.5 rounded-full bg-[#311f11] text-[#C48446] text-xs font-semibold border border-[#3d2716]">
          Early-stage market signal
        </span>
        <span className="px-[14px] py-1.5 rounded-full bg-[#242631] text-[#A0A2AE] text-xs font-semibold border border-[#2d2f3d]">
          Data may exist behind paywalls
        </span>
      </div>

      <button
        type="button"
        className="px-5 py-2 rounded-md bg-[#13111f]/60 border border-[#3E315D] text-[#a794e6] text-[14px] font-medium hover:bg-[#1a172c] hover:border-[#4d3a82] transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-[#a794e6]/50"
      >
        Retry this section
      </button>
    </div>
  );
}
