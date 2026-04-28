"use client"

import { Zap, FileEdit, Clock, ArrowRight } from "lucide-react"

function Illustration() {
  return (
    <svg
      width="128"
      height="128"
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible"
    >
      {/* Outer dashed arc */}
      <path
        d="M 30 70 A 38 38 0 0 1 64 32 A 38 38 0 0 1 98 70"
        stroke="#4b5563"
        strokeWidth="2.5"
        strokeDasharray="5 7"
        strokeLinecap="round"
      />
      {/* Inner dashed arc */}
      <path
        d="M 44 70 A 24 24 0 0 1 64 46 A 24 24 0 0 1 84 70"
        stroke="#4b5563"
        strokeWidth="2.5"
        strokeDasharray="4 6"
        strokeLinecap="round"
      />

      {/* Dollar sign */}
      <text
        x="64"
        y="66"
        fill="#4b5563"
        fontSize="36"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontWeight="700"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        $
      </text>

      {/* Up-and-to-the-right line graph arrow in purple */}
      <path
        d="M 28 92 L 56 60 L 72 76 L 104 40"
        stroke="#a78bfa"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Arrow head */}
      <path
        d="M 86 40 L 104 40 L 104 58"
        stroke="#a78bfa"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function MonetizationEmpty() {
  return (
    <div className="bg-[#15161c] border border-zinc-800/60 rounded-xl px-4 py-16 flex flex-col items-center justify-center text-center">
      {/* Custom SVG Illustration */}
      <div className="mb-8 relative w-32 h-32 flex items-center justify-center">
        <Illustration />
      </div>

      <h2 className="text-2xl font-bold text-white mb-3">
        Revenue Strategy Unavailable
      </h2>
      <p className="text-[#a1a1aa] md:text-[15px] leading-relaxed max-w-[700px] mb-10">
        The agent couldn&apos;t generate monetization strategies for this idea.
        This may be due to an API timeout, an insufficient idea description, or
        a quota limit mid-pipeline.
      </p>

      {/* Error Tags Row */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-900/20 border border-amber-700/40 text-amber-500 text-[13px] font-medium shadow-sm">
          <Zap className="w-3.5 h-3.5 fill-amber-500" />
          Quota limit possible
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-[13px] font-medium shadow-sm">
          <FileEdit className="w-3.5 h-3.5 text-orange-200" fill="currentColor" strokeWidth={1} />
          Try a more detailed idea description
        </div>

        <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700/80 text-zinc-300 text-[13px] font-medium shadow-sm">
          <Clock className="w-3.5 h-3.5 text-sky-200" fill="currentColor" strokeWidth={1} />
          Agent timed out
        </div>
      </div>

      {/* Actions Row */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="px-5 py-2.5 rounded-lg bg-purple-900/20 border border-[#4c3a7a] hover:bg-purple-900/30 text-[#b5a3f2] text-sm font-medium transition-all shadow-sm">
          Retry this section
        </button>

        <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#303036] hover:bg-[#3f3f46] border border-zinc-700 text-zinc-300 text-sm font-medium transition-all shadow-sm">
          Improve idea description
          <ArrowRight className="w-4 h-4 text-zinc-400" />
        </button>
      </div>
    </div>
  )
}
