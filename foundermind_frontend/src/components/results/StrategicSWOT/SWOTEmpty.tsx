import { Check, AlertTriangle, Zap } from "lucide-react"

const DiamondIcon = ({ className, size = 16 }: { className?: string; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 2L2 12L12 22L22 12L12 2Z" />
  </svg>
)

export function SWOTEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-20 px-6 relative">

      {/* Abstract Grid Graphic */}
      <div className="relative mb-14">
        <div className="grid grid-cols-2 gap-[10px] w-32 h-32">
          <div className="border border-slate-700/50 rounded-[10px] bg-slate-800/5"></div>
          <div className="border border-slate-700/50 rounded-[10px] bg-slate-800/5"></div>
          <div className="border border-slate-700/50 rounded-[10px] bg-slate-800/5"></div>
          <div className="border border-slate-700/50 rounded-[10px] bg-slate-800/5"></div>
        </div>

        {/* Corner Glowing Dots */}
        {/* Top Left - Green */}
        <div className="absolute -top-1.5 -left-1.5">
          <div className="w-3 h-3 rounded-full bg-[#10B981] shadow-[0_0_14px_rgba(16,185,129,0.9)] relative z-10 border border-[#10B981]/50 mix-blend-screen"></div>
        </div>
        {/* Top Right - Yellow */}
        <div className="absolute -top-1.5 -right-1.5">
          <div className="w-3 h-3 rounded-full bg-[#F59E0B] shadow-[0_0_14px_rgba(245,158,11,0.9)] relative z-10 border border-[#F59E0B]/50 mix-blend-screen"></div>
        </div>
        {/* Bottom Left - Blue */}
        <div className="absolute -bottom-1.5 -left-1.5">
          <div className="w-3 h-3 rounded-full bg-[#0EA5E9] shadow-[0_0_14px_rgba(14,165,233,0.9)] relative z-10 border border-[#0EA5E9]/50 mix-blend-screen"></div>
        </div>
        {/* Bottom Right - Red */}
        <div className="absolute -bottom-1.5 -right-1.5">
          <div className="w-3 h-3 rounded-full bg-[#F43F5E] shadow-[0_0_14px_rgba(244,63,94,0.9)] relative z-10 border border-[#F43F5E]/50 mix-blend-screen"></div>
        </div>
      </div>

      <div className="text-center max-w-2xl mx-auto mb-10">
        <h2 className="text-[20px] font-semibold text-white mb-2.5 tracking-tight">Strategic Analysis Unavailable</h2>
        <p className="text-[15px] text-slate-400 font-medium leading-relaxed max-w-[650px] mx-auto">
          The agent couldn&apos;t complete the SWOT analysis for this idea. This may be due to an API timeout, quota exhaustion, or insufficient context about the competitive landscape.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-10">
        {/* Strengths */}
        <div className="flex items-center gap-2.5 bg-[#122A1E]/80 border border-[#1B4B35]/70 pr-2 pl-3 py-1.5 rounded-[10px] w-full sm:w-[270px]">
          <div className="bg-[#22C55E] text-white rounded-[4px] p-[2px]">
            <Check size={12} strokeWidth={3.5} />
          </div>
          <span className="flex-1 text-[13.5px] font-medium text-[#8CE8B2]">Strengths – missing</span>
          <span className="bg-[#194532] text-[#4ADE80] px-2 py-0.5 rounded-[5px] text-[12px] font-medium tracking-tight">0.08</span>
        </div>

        {/* Weaknesses */}
        <div className="flex items-center gap-2.5 bg-[#382411]/80 border border-[#5A3816]/70 pr-2 pl-3 py-1.5 rounded-[10px] w-full sm:w-[270px]">
          <AlertTriangle size={15} className="text-[#F59E0B]" strokeWidth={2.5} />
          <span className="flex-1 text-[13.5px] font-medium text-[#FDE68A]">Weaknesses – missing</span>
          <span className="bg-[#523313] text-[#F59E0B] px-2 py-0.5 rounded-[5px] text-[12px] font-medium tracking-tight">0.08</span>
        </div>

        {/* Opportunities */}
        <div className="flex items-center gap-2.5 bg-[#0F2633]/80 border border-[#174457]/70 pr-2 pl-3 py-1.5 rounded-[10px] w-full sm:w-[270px]">
          <DiamondIcon size={13} className="text-[#06B6D4]" />
          <span className="flex-1 text-[13.5px] font-medium text-[#A5F3FC]">Opportunities – missing</span>
          <span className="bg-[#153D4E] text-[#06B6D4] px-2 py-0.5 rounded-[5px] text-[12px] font-medium tracking-tight">0.08</span>
        </div>

        {/* Threats */}
        <div className="flex items-center gap-2.5 bg-[#38161D]/80 border border-[#5C232A]/70 pr-2 pl-3 py-1.5 rounded-[10px] w-full sm:w-[270px]">
          <Zap size={14} className="text-[#F43F5E] fill-[#F43F5E]" />
          <span className="flex-1 text-[13.5px] font-medium text-[#FECDD3]">Threats – missing</span>
          <span className="bg-[#561F25] text-[#F43F5E] px-2 py-0.5 rounded-[5px] text-[12px] font-medium tracking-tight">0.08</span>
        </div>
      </div>

      <button className="px-5 py-2.5 rounded-[10px] border border-[#1E293B] bg-transparent text-slate-300 hover:bg-[#1E293B]/50 hover:text-white transition-all text-[13px] font-medium">
        Retry analysis
      </button>

    </div>
  )
}
