import { Activity, Brain, Gauge, RefreshCw, ShieldAlert, Target } from "lucide-react"
import { AnalyticsSummary } from "@/types/analytics"

interface PerformanceSummaryCardProps {
  summary: AnalyticsSummary
}

const formatScore = (value: number) => value.toFixed(1)
const formatPercent = (value: number) => `${Math.round(value * 100)}%`

export function PerformanceSummaryCard({ summary }: PerformanceSummaryCardProps) {
  const cards = [
    {
      label: "Overall score",
      value: formatScore(summary.average_overall_score),
      detail: "Average completed run quality",
      icon: Target,
      tone: "text-cyan-300",
    },
    {
      label: "Intelligence index",
      value: formatScore(summary.intelligence_index),
      detail: "Composite system performance",
      icon: Brain,
      tone: "text-violet-300",
    },
    {
      label: "Self healing",
      value: formatPercent(summary.self_healing_ratio),
      detail: "Runs improved through reruns",
      icon: RefreshCw,
      tone: "text-emerald-300",
    },
    {
      label: "Calibration error",
      value: formatPercent(summary.confidence_calibration_error),
      detail: "Confidence vs. final score gap",
      icon: Gauge,
      tone: "text-amber-300",
    },
  ]

  const avgFailureRate = Object.values(summary.tool_failure_rate).length
    ? Object.values(summary.tool_failure_rate).reduce((sum, rate) => sum + rate, 0) /
      Object.values(summary.tool_failure_rate).length
    : 0

  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Performance
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
            Agent Health Summary
          </h2>
        </div>
        <div className="inline-flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-gray-300">
          <Activity size={16} className="text-emerald-300" />
          Live backend metrics
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <article
              key={card.label}
              className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
            >
              <div className="mb-5 flex items-center justify-between">
                <div className={`rounded-xl bg-white/[0.06] p-2.5 ${card.tone}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-400">{card.label}</p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-500">{card.detail}</p>
            </article>
          )
        })}
      </div>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert size={18} className="text-rose-300" />
            <div>
              <p className="text-sm font-bold text-white">Average tool failure rate</p>
              <p className="text-xs text-gray-500">Calculated across tools with execution logs</p>
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{formatPercent(avgFailureRate)}</p>
        </div>
      </div>
    </section>
  )
}
