import { ShieldAlert, Wrench } from "lucide-react"
import { ToolDriftMetric } from "@/types/drift"

interface ToolDriftChartProps {
  tools: ToolDriftMetric[]
}

const toLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const formatPercent = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "--"

export function ToolDriftChart({ tools }: ToolDriftChartProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-rose-300">
            Tool Performance Drift
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Tool Reliability Watchlist
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-3 text-rose-300">
          <Wrench size={22} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {tools.length ? (
          tools.map((tool) => {
            const success = tool.recent_success ?? 0
            const drift = Math.max(tool.drift, 0)
            const isAlert = tool.status === "drift_detected"

            return (
              <article
                key={tool.tool_name}
                className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
              >
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {toLabel(tool.tool_name)}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {tool.window_size} run comparison window
                    </p>
                  </div>
                  <StatusPill status={tool.status} />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Recent" value={formatPercent(tool.recent_success)} />
                  <Metric
                    label="Historical"
                    value={formatPercent(tool.historical_success)}
                  />
                  <Metric label="Drift" value={formatPercent(drift)} alert={isAlert} />
                </div>

                <div className="mt-5 space-y-3">
                  <ProgressRow
                    label="Recent success"
                    value={success}
                    tone={isAlert ? "bg-rose-400" : "bg-emerald-400"}
                  />
                  <ProgressRow
                    label="Drift threshold"
                    value={tool.threshold}
                    tone="bg-amber-300"
                  />
                </div>
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] p-10 text-center lg:col-span-2">
            <ShieldAlert size={32} className="mx-auto mb-3 text-gray-500" />
            <p className="text-sm font-semibold text-gray-400">
              No tool execution history available.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string
  value: string
  alert?: boolean
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-lg font-bold ${alert ? "text-rose-200" : "text-white"}`}>
        {value}
      </p>
    </div>
  )
}

function ProgressRow({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: string
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-widest text-gray-500">
        <span>{label}</span>
        <span>{formatPercent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full ${tone}`}
          style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%` }}
        />
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "drift_detected"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : status === "insufficient_data"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
      {toLabel(status)}
    </span>
  )
}
