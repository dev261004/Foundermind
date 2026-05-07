"use client"

export function MarketDataEmpty() {
  return (
    <div className="bg-[#181821] border border-white/5 rounded-2xl p-10 flex flex-col items-center text-center relative overflow-hidden py-16">
      
      {/* Illustration SVG */}
      <div className="mb-8 relative flex justify-center w-full">
        <svg width="130" height="90" viewBox="0 0 130 90" fill="none" className="block relative z-10">
          <path d="M10 10 L10 80 L120 80" stroke="#3b3b4a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          
          {/* Nodes */}
          <circle cx="28" cy="68" r="4.5" fill="#885cd9" />
          <circle cx="48" cy="48" r="4.5" fill="#885cd9" />
          <circle cx="68" cy="28" r="4.5" fill="#885cd9" />
          
          {/* Dotted Line Trajectory */}
          <path d="M68 28 C 85 28, 100 65, 115 70" stroke="#71717a" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
          
          {/* End marker vertical bar */}
          <rect x="114" y="65" width="2" height="10" fill="#a1a1aa" rx="1" />
        </svg>
      </div>

      {/* Text Content */}
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-3">Market Data Unavailable</h2>
      <p className="text-[#a1a1aa] text-[15px] max-w-2xl mx-auto mb-8 leading-relaxed">
        The agent couldn&apos;t retrieve market sizing or research data for this idea. This may be due to
        search API limits, quota exhaustion, or insufficient public data for this specific market.
      </p>

      {/* Warning Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 mb-10 max-w-2xl mx-auto">
        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border outline outline-1 outline-white/5 border-transparent bg-[#242531] text-[#d4d4d8]">
          <span className="text-sm">📈</span> No TAM data retrieved
        </span>
        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border border-yellow-600/30 bg-yellow-600/10 text-[#d9aa55]">
          <span className="text-sm">⚡</span> Search API may have hit quota
        </span>
        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border outline outline-1 outline-white/5 border-transparent bg-[#242531] text-[#d4d4d8]">
          <span className="text-sm">🔎</span> Try a more specific market category
        </span>
        <span className="flex items-center gap-2 px-4 py-1.5 rounded-full text-[13px] font-medium border outline outline-1 outline-white/5 border-transparent bg-[#242531] text-[#d4d4d8]">
          <span className="text-sm">⏳</span> Agent timed out mid-research
        </span>
      </div>

      <p className="text-xs text-[#6b7280] mb-6">
        Retry controls appear below when this section can be rerun.
      </p>

    </div>
  )
}
