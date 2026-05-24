import { BarChart3, ShieldAlert, TrendingUp } from "lucide-react"
import { AnalyticsSummary } from "@/types/analytics"

interface MetricsChartsProps {
  summary: AnalyticsSummary
}

const toLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const percent = (value: number) => `${Math.round(value * 100)}%`

export function RollingMetricsChart({ summary }: MetricsChartsProps) {
  const scoreEntries = Object.entries(summary.score_by_idea_type)
  const failureEntries = Object.entries(summary.tool_failure_rate)

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <div className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
              Scores
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">Score by Idea Type</h2>
          </div>
          <TrendingUp size={20} className="text-violet-300" />
        </div>

        <div className="space-y-4">
          {scoreEntries.length ? (
            scoreEntries.map(([ideaType, score]) => (
              <MetricBar
                key={ideaType}
                label={toLabel(ideaType)}
                value={`${score.toFixed(1)} / 10`}
                width={Math.min(score * 10, 100)}
                fillClass="bg-gradient-to-r from-violet-500 to-cyan-400"
              />
            ))
          ) : (
            <EmptyState text="No scored idea types yet." />
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-rose-300">
              Reliability
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">Tool Failure Rates</h2>
          </div>
          <ShieldAlert size={20} className="text-rose-300" />
        </div>

        <div className="space-y-4">
          {failureEntries.length ? (
            failureEntries.map(([tool, rate]) => (
              <MetricBar
                key={tool}
                label={toLabel(tool)}
                value={percent(rate)}
                width={Math.min(rate * 100, 100)}
                fillClass={rate > 0.15 ? "bg-rose-400" : "bg-emerald-400"}
              />
            ))
          ) : (
            <EmptyState text="No tool execution data yet." />
          )}
        </div>
      </div>
    </section>
  )
}

function MetricBar({
  label,
  value,
  width,
  fillClass,
}: {
  label: string
  value: string
  width: number
  fillClass: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-gray-300">{label}</span>
        <span className="font-bold text-white">{value}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${fillClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] text-center">
      <BarChart3 className="mb-3 text-gray-500" size={28} />
      <p className="text-sm font-medium text-gray-400">{text}</p>
    </div>
  )
}
