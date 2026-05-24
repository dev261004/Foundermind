"use client"

import { useState, type ReactNode } from "react"
import { Activity, BarChart3, TrendingDown, TrendingUp } from "lucide-react"
import { HistoricalTrendPoint, ModelDrift } from "@/types/drift"

interface GlobalDriftChartProps {
  modelDrift: ModelDrift
  trends: HistoricalTrendPoint[]
}

const chartWidth = 640
const chartHeight = 260
const chartPadding = 28

const formatScore = (value?: number | null) =>
  typeof value === "number" ? value.toFixed(1) : "--"

const formatDrift = (value?: number | null) => {
  if (typeof value !== "number") return "--"
  const sign = value > 0 ? "+" : ""
  return `${sign}${value.toFixed(2)}`
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

const statusCopy: Record<string, string> = {
  drift_detected: "Drift detected",
  stable: "Stable",
  insufficient_data: "Insufficient data",
}

export function GlobalDriftChart({ modelDrift, trends }: GlobalDriftChartProps) {
  const [activePoint, setActivePoint] = useState<{
    point: HistoricalTrendPoint
    x: number
    y: number
  } | null>(null)
  const points = trends.filter((point) => typeof point.average_score === "number")
  const scores = points.map((point) => point.average_score as number)
  const minScore = Math.min(...scores, 0)
  const maxScore = Math.max(...scores, 10)
  const range = maxScore - minScore || 1

  const chartPoints = points.map((point, index) => {
      const x =
        chartPadding +
        (index * (chartWidth - chartPadding * 2)) / Math.max(points.length - 1, 1)
      const y =
        chartHeight -
        chartPadding -
        (((point.average_score as number) - minScore) / range) *
          (chartHeight - chartPadding * 2)
      return { point, x, y }
    })

  const polyline = chartPoints
    .map(({ x, y }) => `${x},${y}`)
    .join(" ")

  const isDriftDetected = modelDrift.status === "drift_detected"
  const TrendIcon = modelDrift.drift > 0 ? TrendingDown : TrendingUp

  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Model Drift Detection
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Global Score Movement
          </h2>
        </div>

        <div
          className={`inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-bold ${
            isDriftDetected
              ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
              : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
          }`}
        >
          <Activity size={16} />
          {statusCopy[modelDrift.status] ?? modelDrift.status}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="relative min-h-[320px] rounded-2xl border border-white/10 bg-[#0B0C10] p-4">
          {points.length ? (
            <>
              <svg
                role="img"
                aria-label="Historical average score trend"
                className="h-[260px] w-full overflow-visible"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="driftLine" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((index) => {
                  const y =
                    chartPadding +
                    (index * (chartHeight - chartPadding * 2)) / 3
                  return (
                    <line
                      key={index}
                      x1={chartPadding}
                      x2={chartWidth - chartPadding}
                      y1={y}
                      y2={y}
                      stroke="rgba(255,255,255,0.08)"
                      strokeWidth="1"
                    />
                  )
                })}
                <polyline
                  fill="none"
                  points={polyline}
                  stroke="url(#driftLine)"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="4"
                />
                {chartPoints.map(({ point, x, y }, index) => {
                  return (
                    <g
                      key={`${point.date}-${index}`}
                      onMouseEnter={() => setActivePoint({ point, x, y })}
                      onMouseLeave={() => setActivePoint(null)}
                      onFocus={() => setActivePoint({ point, x, y })}
                      onBlur={() => setActivePoint(null)}
                      tabIndex={0}
                      className="cursor-pointer outline-none"
                    >
                      <circle
                        cx={x}
                        cy={y}
                        r="12"
                        fill="transparent"
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={activePoint?.point.date === point.date ? "6" : "4"}
                        fill="#0B0C10"
                        stroke="#67e8f9"
                        strokeWidth="3"
                      />
                    </g>
                  )
                })}
              </svg>

              {activePoint && (
                <div
                  className="pointer-events-none absolute z-20 w-[220px] -translate-x-1/2 -translate-y-full rounded-2xl border border-white/10 bg-[#181B24] p-4 text-left shadow-2xl"
                  style={{
                    left: `${(activePoint.x / chartWidth) * 100}%`,
                    top: `${(activePoint.y / chartHeight) * 100}%`,
                  }}
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
                    {formatDate(activePoint.point.date)}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <TooltipMetric
                      label="Avg score"
                      value={formatScore(activePoint.point.average_score)}
                    />
                    <TooltipMetric
                      label="Weighted"
                      value={formatScore(activePoint.point.weighted_score)}
                    />
                    <TooltipMetric
                      label="Confidence"
                      value={
                        typeof activePoint.point.analysis_confidence === "number"
                          ? `${Math.round(activePoint.point.analysis_confidence * 100)}%`
                          : "--"
                      }
                    />
                    <TooltipMetric
                      label="Drift"
                      value={formatDrift(activePoint.point.drift_score)}
                    />
                  </div>
                  <p className="mt-3 text-xs font-semibold text-gray-500">
                    {activePoint.point.run_count} runs on this day
                  </p>
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-gray-500">
                <span>{formatDate(points[0].date)}</span>
                <span>{points.length} scored days</span>
                <span>{formatDate(points[points.length - 1].date)}</span>
              </div>
            </>
          ) : (
            <div className="flex min-h-[280px] flex-col items-center justify-center text-center">
              <BarChart3 size={32} className="mb-3 text-gray-500" />
              <p className="text-sm font-semibold text-gray-400">
                No historical drift trend yet.
              </p>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <MetricTile
            label="Recent avg"
            value={formatScore(modelDrift.recent_avg)}
            detail={`${modelDrift.window_size} run window`}
          />
          <MetricTile
            label="Baseline avg"
            value={formatScore(modelDrift.baseline_avg)}
            detail="Historical comparison"
          />
          <MetricTile
            label="Drift"
            value={formatScore(modelDrift.drift)}
            detail={`Threshold ${modelDrift.threshold.toFixed(1)}`}
            icon={<TrendIcon size={18} />}
            warning={isDriftDetected}
          />
        </div>
      </div>
    </section>
  )
}

function TooltipMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-white">{value}</p>
    </div>
  )
}

function MetricTile({
  label,
  value,
  detail,
  icon,
  warning = false,
}: {
  label: string
  value: string
  detail: string
  icon?: ReactNode
  warning?: boolean
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
          {label}
        </p>
        {icon && (
          <div className={warning ? "text-rose-300" : "text-cyan-300"}>
            {icon}
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-gray-500">{detail}</p>
    </article>
  )
}
