"use client"

import { motion } from "framer-motion"
import { Building2, Code2, User, Database, Star, type LucideIcon } from "lucide-react"
import {
  MonetizationStrategyItem,
  MonetizationFitScore,
  MonetizationType,
} from "@/types/analysis"

// ─── Lookups ──────────────────────────────────────────────────────────────────

const ICON_MAP: Record<MonetizationType, LucideIcon> = {
  B2B: Building2,
  API: Code2,
  B2C: User,
  Institutional: Database,
}

const COLOR_MAP: Record<MonetizationType, string> = {
  B2B: "#818cf8",
  API: "#2dd4bf",
  B2C: "#34d399",
  Institutional: "#fbbf24",
}

const FIT_LABEL: Record<MonetizationFitScore, string> = {
  High: "High Fit",
  Medium: "Medium Fit",
  Low: "Low Fit",
}

// ─── StrategyCard ─────────────────────────────────────────────────────────────

function StrategyCard({
  strategy,
  index,
}: {
  strategy: MonetizationStrategyItem
  index: number
}) {
  const Icon = ICON_MAP[strategy.type] ?? Building2
  const colorHex = COLOR_MAP[strategy.type] ?? "#818cf8"
  const fitLabel = FIT_LABEL[strategy.fit_score] ?? "Medium Fit"
  const isHighFit = strategy.fit_score === "High"
  const topPick = index === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group relative flex flex-col p-6 rounded-2xl bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-sm overflow-hidden hover:bg-zinc-800/50 transition-all duration-500 hover:shadow-2xl hover:border-zinc-700/80"
      style={{ boxShadow: `0 0 40px -15px ${colorHex}10` }}
    >
      {/* Top subtle color dash */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px] opacity-70 group-hover:opacity-100 transition-opacity duration-500 scale-x-95 group-hover:scale-x-100 rounded-t-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${colorHex}, transparent)`,
        }}
      />

      {/* Decorative corner blur */}
      <div
        className="absolute -top-12 -right-12 w-32 h-32 rounded-full blur-[50px] opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
        style={{ backgroundColor: colorHex }}
      />

      <div className="relative flex justify-between items-start mb-6">
        {/* Icon block */}
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center border border-zinc-700/50 shadow-inner group-hover:scale-110 transition-transform duration-500"
          style={{ backgroundColor: `${colorHex}15` }}
        >
          <Icon
            className="w-5 h-5"
            style={{ color: colorHex }}
            strokeWidth={2}
          />
        </div>

        {/* Badges */}
        <div className="flex gap-2 items-center">
          {topPick && (
            <div className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold tracking-wider text-white uppercase rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Star className="w-3 h-3 fill-white" />
              <span>Top Pick</span>
            </div>
          )}
          <div
            className={`px-2 py-1 text-[10px] font-bold tracking-wider uppercase rounded-full border ${
              isHighFit
                ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/30"
                : "bg-amber-950/30 text-amber-500 border-amber-900/30"
            }`}
          >
            {fitLabel}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow flex flex-col min-h-[120px]">
        <h3 className="text-[17px] font-semibold text-zinc-100 mb-2.5 leading-snug tracking-tight group-hover:text-white transition-colors">
          {strategy.strategy_name}
        </h3>
        <p className="text-[14px] text-zinc-400/90 leading-relaxed mb-6 font-medium">
          {strategy.description}
        </p>
      </div>

      {/* Revenue Potential */}
      <div className="w-full mt-auto pt-4 border-t border-zinc-800/60">
        <div className="flex justify-between items-center text-[11px] font-bold tracking-wider uppercase text-zinc-500 mb-3">
          <span>Revenue Potential</span>
          <span className="text-zinc-300">{strategy.revenue_potential}%</span>
        </div>
        <div className="h-1.5 w-full bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
          <motion.div
            className="h-full rounded-full relative"
            initial={{ width: 0 }}
            whileInView={{ width: `${strategy.revenue_potential}%` }}
            viewport={{ once: false }}
            transition={{
              duration: 1.2,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.2 + index * 0.1,
            }}
            style={{ backgroundColor: colorHex }}
          >
            {/* Inner glow on progress bar */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 opacity-50" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface MonetizationStrategyProps {
  strategies: MonetizationStrategyItem[]
}

export function MonetizationStrategy({ strategies }: MonetizationStrategyProps) {
  return (
    <div className="relative overflow-hidden">
      {/* Subtle Ambient Glow */}
      <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[60%] h-[40%] rounded-full bg-indigo-900/10 blur-[100px] pointer-events-none" />

      {/* Strategies Grid */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4">
        {strategies.map((strategy, index) => (
          <StrategyCard key={index} strategy={strategy} index={index} />
        ))}
      </div>
    </div>
  )
}
