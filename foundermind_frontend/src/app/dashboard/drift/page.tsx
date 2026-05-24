"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { toast, Toaster } from "sonner"
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  CheckCircle2,
  ExternalLink,
  Lock,
  Radar,
  RefreshCw,
  ShieldCheck,
  SlidersHorizontal,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
  Zap,
} from "lucide-react"
import { GlobalDriftChart } from "@/components/drift/GlobalDriftChart"
import { IdeaTypeDriftChart } from "@/components/drift/IdeaTypeDriftChart"
import { ToolDriftChart } from "@/components/drift/ToolDriftChart"
import { fetchDriftMetrics } from "@/lib/api/driftApi"
import { recalibrateWeights } from "@/lib/api/analyticsApi"
import { useAuthStore } from "@/store/useAuthStore"
import { useDriftStore } from "@/store/useDriftStore"
import { RecalibrationResult } from "@/types/analytics"
import {
  CompetitorSignal,
  DriftMetrics,
  DriftRecommendation,
  MarketLandscapeSignal,
} from "@/types/drift"

const IDEA_TYPES = ["all", "tech", "marketplace", "deeptech", "general"]

const toLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const formatScore = (value?: number | null) =>
  typeof value === "number" ? value.toFixed(1) : "--"

const formatPercent = (value?: number | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : "--"

const formatSignedPercent = (value?: number | null) => {
  if (typeof value !== "number") return "--"
  const sign = value > 0 ? "+" : ""
  return `${sign}${Math.round(value * 100)}%`
}

const formatDate = (value?: string | null) => {
  if (!value) return "--"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "--"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

interface RecalibrationRun {
  id: string
  ideaType: string
  status: string
  startedAt: string
  completedAt: string
  result: RecalibrationResult
  message?: string
}

export default function DashboardDriftPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const driftData = useDriftStore((state) => state.driftData)
  const isLoading = useDriftStore((state) => state.isLoading)
  const error = useDriftStore((state) => state.error)
  const setDriftData = useDriftStore((state) => state.setDriftData)
  const setLoading = useDriftStore((state) => state.setLoading)
  const setError = useDriftStore((state) => state.setError)
  const [ideaTypeFilter, setIdeaTypeFilter] = useState("all")
  const [recalibratingIdeaType, setRecalibratingIdeaType] = useState<string | null>(
    null
  )
  const [recalibrationProgress, setRecalibrationProgress] = useState(0)
  const [recalibrationErrors, setRecalibrationErrors] = useState<
    Record<string, string>
  >({})
  const [recalibrationRuns, setRecalibrationRuns] = useState<RecalibrationRun[]>(
    []
  )

  const loadDrift = useCallback(async () => {
    if (!accessToken || role !== "admin") return

    setLoading(true)
    setError(null)

    try {
      const data = await fetchDriftMetrics(
        ideaTypeFilter === "all" ? undefined : ideaTypeFilter
      )
      setDriftData(data)
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ??
          "Unable to load drift analytics."
      )
    } finally {
      setLoading(false)
    }
  }, [accessToken, ideaTypeFilter, role, setDriftData, setError, setLoading])

  useEffect(() => {
    void loadDrift()
  }, [loadDrift])

  const handleRecalibrate = async (ideaType: string) => {
    const startedAt = new Date().toISOString()
    let progressTimer: number | null = null

    setRecalibratingIdeaType(ideaType)
    setRecalibrationProgress(8)
    setRecalibrationErrors((previous) => {
      const next = { ...previous }
      delete next[ideaType]
      return next
    })

    progressTimer = window.setInterval(() => {
      setRecalibrationProgress((current) =>
        current >= 88 ? current : current + 8
      )
    }, 350)

    try {
      const result = await recalibrateWeights(ideaType)
      const completedAt = new Date().toISOString()
      const statusMessage =
        result.status === "updated"
          ? `${toLabel(ideaType)} weights recalibrated`
          : result.status === "unchanged"
            ? result.reason ?? `${toLabel(ideaType)} weights did not need a change`
          : `${toLabel(ideaType)} recalibration returned ${toLabel(result.status)}`

      if (progressTimer) {
        window.clearInterval(progressTimer)
        progressTimer = null
      }

      setRecalibrationProgress(100)
      setRecalibrationRuns((previous) => [
        {
          id: `${ideaType}-${Date.now()}`,
          ideaType,
          status: result.status,
          startedAt,
          completedAt,
          result,
          message: statusMessage,
        },
        ...previous,
      ].slice(0, 8))

      if (result.status === "updated") {
        toast.success(`${statusMessage}. Refresh metrics when ready.`)
      } else if (result.status === "unchanged") {
        toast(statusMessage)
      } else {
        setRecalibrationErrors((previous) => ({
          ...previous,
          [ideaType]: statusMessage,
        }))
        toast.error(statusMessage)
      }
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ??
        "Unable to recalibrate weights."

      if (progressTimer) {
        window.clearInterval(progressTimer)
        progressTimer = null
      }

      setRecalibrationErrors((previous) => ({
        ...previous,
        [ideaType]: message,
      }))
      setRecalibrationRuns((previous) => [
        {
          id: `${ideaType}-${Date.now()}`,
          ideaType,
          status: "failed",
          startedAt,
          completedAt: new Date().toISOString(),
          result: { status: "failed" },
          message,
        },
        ...previous,
      ].slice(0, 8))
      toast.error(message)
    } finally {
      if (progressTimer) {
        window.clearInterval(progressTimer)
      }

      window.setTimeout(() => {
        setRecalibratingIdeaType(null)
        setRecalibrationProgress(0)
      }, 500)
    }
  }

  if (!accessToken) {
    return (
      <AdminGate
        title="Login required"
        message="Sign in with an admin account to view drift analytics."
      />
    )
  }

  if (role !== "admin") {
    return (
      <AdminGate
        title="Admin access required"
        message="Drift analytics is limited to users with the admin role."
      />
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-[#12141D] p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Drift Analytics
            </p>
            <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
              Drift Detection & Monitoring
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Admin console for model quality drift, tool degradation, market shifts, competitor signals, and recalibration actions.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex flex-wrap rounded-2xl border border-white/10 bg-[#0B0C10] p-1">
              {IDEA_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIdeaTypeFilter(type)}
                  className={`min-h-10 rounded-xl px-4 text-sm font-bold transition ${
                    ideaTypeFilter === type
                      ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {type === "all" ? "All" : toLabel(type)}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => void loadDrift()}
              disabled={isLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-bold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      {isLoading && !driftData ? (
        <DriftSkeleton />
      ) : driftData ? (
        <DriftDashboard
          data={driftData}
          recalibratingIdeaType={recalibratingIdeaType}
          recalibrationProgress={recalibrationProgress}
          recalibrationErrors={recalibrationErrors}
          recalibrationRuns={recalibrationRuns}
          onRecalibrate={(ideaType) => void handleRecalibrate(ideaType)}
        />
      ) : (
        <section className="rounded-3xl border border-dashed border-white/10 bg-[#12141D] p-10 text-center">
          <Radar className="mx-auto mb-3 text-gray-500" size={36} />
          <h2 className="text-xl font-bold text-white">No drift data yet</h2>
          <p className="mt-2 text-sm text-gray-400">
            Completed analysis runs will populate the drift console.
          </p>
        </section>
      )}

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#12141D",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#fff",
            borderRadius: "20px",
          },
        }}
      />
    </main>
  )
}

function DriftDashboard({
  data,
  recalibratingIdeaType,
  recalibrationProgress,
  recalibrationErrors,
  recalibrationRuns,
  onRecalibrate,
}: {
  data: DriftMetrics
  recalibratingIdeaType: string | null
  recalibrationProgress: number
  recalibrationErrors: Record<string, string>
  recalibrationRuns: RecalibrationRun[]
  onRecalibrate: (ideaType: string) => void
}) {
  return (
    <>
      <SummaryCards data={data} />
      <GlobalDriftChart
        modelDrift={data.model_drift}
        trends={data.historical_trends}
      />
      <IdeaTypeDriftChart
        drift={data.idea_type_drift}
        weightAlerts={data.weight_alerts}
        triggers={data.recalibration_triggers}
        recalibratingIdeaType={recalibratingIdeaType}
        recalibrationProgress={recalibrationProgress}
        recalibrationErrors={recalibrationErrors}
        onRecalibrate={onRecalibrate}
      />
      <RecalibrationResultsPanel runs={recalibrationRuns} />
      <ToolDriftChart tools={data.tool_drift} />
      <MarketLandscapePanel items={data.market_landscape} />
      <CompetitorPanel competitors={data.competitors} />
      <RecommendationsPanel recommendations={data.recommendations} />
    </>
  )
}

function SummaryCards({ data }: { data: DriftMetrics }) {
  const cards = [
    {
      label: "Overall status",
      value: toLabel(data.summary.overall_status),
      detail: "Current drift posture",
      icon: ShieldCheck,
      tone: "text-emerald-300",
    },
    {
      label: "Active alerts",
      value: String(data.summary.active_alerts),
      detail: "Model, tool, market, and weight signals",
      icon: AlertTriangle,
      tone:
        data.summary.active_alerts > 0 ? "text-amber-300" : "text-emerald-300",
    },
    {
      label: "Completed runs",
      value: String(data.summary.total_completed_runs),
      detail: "Runs available for monitoring",
      icon: Brain,
      tone: "text-violet-300",
    },
    {
      label: "Recommendations",
      value: String(data.summary.recommendation_count),
      detail: `Updated ${formatDate(data.generated_at)}`,
      icon: Target,
      tone: "text-cyan-300",
    },
  ]

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <article
            key={card.label}
            className="rounded-3xl border border-white/10 bg-[#12141D] p-5"
          >
            <div className="mb-5 flex items-center justify-between">
              <div className={`rounded-2xl bg-white/[0.06] p-3 ${card.tone}`}>
                <Icon size={20} />
              </div>
              <Activity size={16} className="text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-gray-400">{card.label}</p>
            <p className="mt-2 text-2xl font-bold text-white">{card.value}</p>
            <p className="mt-2 text-xs leading-5 text-gray-500">{card.detail}</p>
          </article>
        )
      })}
    </section>
  )
}

function RecalibrationResultsPanel({ runs }: { runs: RecalibrationRun[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Recalibration Results
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Completed Recalibration Runs
          </h2>
        </div>
        <SlidersHorizontal size={22} className="text-cyan-300" />
      </div>

      {runs.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {runs.map((run) => {
            const isUpdated = run.status === "updated"
            const isUnchanged = run.status === "unchanged"
            const sections = Array.from(
              new Set([
                ...Object.keys(run.result.previous_weights ?? {}),
                ...Object.keys(run.result.new_weights ?? {}),
                ...Object.keys(run.result.changes ?? {}),
              ])
            )

            return (
              <article
                key={run.id}
                className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">
                        {toLabel(run.ideaType)}
                      </h3>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold ${
                          isUpdated
                            ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                            : isUnchanged
                              ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
                            : "border-rose-400/30 bg-rose-500/10 text-rose-200"
                        }`}
                      >
                        {isUpdated || isUnchanged ? (
                          <CheckCircle2 size={13} />
                        ) : (
                          <XCircle size={13} />
                        )}
                        {toLabel(run.status)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      Completed {formatDate(run.completedAt)}
                    </p>
                  </div>
                </div>

                {run.message && (
                  <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-gray-300">
                    {run.message}
                  </p>
                )}

                {sections.length ? (
                  <div className="mt-5 grid gap-3">
                    {sections.map((section) => {
                      const previous = run.result.previous_weights?.[section]
                      const next = run.result.new_weights?.[section]
                      const delta = run.result.changes?.[section]

                      return (
                        <div
                          key={section}
                          className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                        >
                          <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                            <span className="truncate font-bold text-gray-300">
                              {toLabel(section)}
                            </span>
                            <span className="font-bold text-white">
                              {formatWeightChange(previous, next)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs font-semibold text-gray-500">
                            <span>
                              Avg score{" "}
                              {formatScore(run.result.section_averages?.[section])}
                            </span>
                            <span className={delta && delta > 0 ? "text-emerald-300" : delta && delta < 0 ? "text-rose-300" : "text-gray-500"}>
                              {formatDelta(delta)}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-semibold text-gray-400">
                    No weight changes were returned for this recalibration.
                  </p>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] p-10 text-center">
          <p className="text-sm font-semibold text-gray-400">
            Recalibration results will appear here after an admin runs recalibration.
          </p>
        </div>
      )}
    </section>
  )
}

function formatWeight(value?: number) {
  return typeof value === "number" ? `${Math.round(value * 100)}%` : "--"
}

function formatWeightChange(previous?: number, next?: number) {
  if (typeof previous === "number" && typeof next === "number") {
    return `${formatWeight(previous)} to ${formatWeight(next)}`
  }
  if (typeof previous === "number") {
    return `${formatWeight(previous)} to removed`
  }
  if (typeof next === "number") {
    return `added ${formatWeight(next)}`
  }
  return "--"
}

function formatDelta(value?: number) {
  if (typeof value !== "number") return "--"
  const sign = value > 0 ? "+" : ""
  return `${sign}${Math.round(value * 100)} pts`
}

function MarketLandscapePanel({ items }: { items: MarketLandscapeSignal[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Market Landscape Changes
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Market Movement by Idea Type
          </h2>
        </div>
        <BarChart3 size={22} className="text-emerald-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => {
          const TrendIcon =
            item.trend === "contracting"
              ? TrendingDown
              : item.trend === "expanding"
                ? TrendingUp
                : BarChart3
          return (
            <article
              key={item.idea_type}
              className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {toLabel(item.idea_type)}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {item.sample_size} market models
                  </p>
                </div>
                <div
                  className={`rounded-2xl border border-white/10 bg-white/[0.04] p-3 ${
                    item.trend === "contracting"
                      ? "text-rose-300"
                      : item.trend === "expanding"
                        ? "text-emerald-300"
                        : "text-cyan-300"
                  }`}
                >
                  <TrendIcon size={20} />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-3">
                <SignalMetric
                  label="TAM"
                  value={
                    typeof item.current_tam_billion_usd === "number"
                      ? `$${item.current_tam_billion_usd.toFixed(1)}B`
                      : "--"
                  }
                  delta={formatSignedPercent(item.tam_delta_percent)}
                />
                <SignalMetric
                  label="CAGR"
                  value={formatPercent(item.current_cagr)}
                  delta={formatSignedPercent(item.cagr_delta)}
                />
                <SignalMetric
                  label="Opportunity"
                  value={formatScore(item.opportunity_score)}
                  delta={toLabel(item.trend)}
                />
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function SignalMetric({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-gray-500">{delta}</p>
    </div>
  )
}

function CompetitorPanel({
  competitors,
}: {
  competitors: CompetitorSignal[]
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
            Competitor Tracking
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Repeated Competitive Signals
          </h2>
        </div>
        <Building2 size={22} className="text-amber-300" />
      </div>

      {competitors.length ? (
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="hidden grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] gap-4 bg-[#0B0C10] px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-500 md:grid">
            <span>Company</span>
            <span>Category</span>
            <span>Signals</span>
            <span>Latest</span>
          </div>
          <div className="divide-y divide-white/10">
            {competitors.map((competitor) => (
              <CompetitorRow
                key={`${competitor.company_name}-${competitor.latest_seen_at}`}
                competitor={competitor}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] p-10 text-center">
          <p className="text-sm font-semibold text-gray-400">
            No repeated competitor signals yet.
          </p>
        </div>
      )}
    </section>
  )
}

function CompetitorRow({ competitor }: { competitor: CompetitorSignal }) {
  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-4 text-sm text-gray-300 md:grid-cols-[1.2fr_0.8fr_0.7fr_0.8fr] md:items-center md:gap-4">
      <div>
        <div className="flex items-center gap-2">
          <p className="font-bold text-white">{competitor.company_name}</p>
          {competitor.url && (
            <a
              href={competitor.url}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-300 transition hover:text-cyan-200"
              aria-label={`Open ${competitor.company_name}`}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {competitor.idea_types.map(toLabel).join(", ") || "General"}
        </p>
      </div>
      <span>{competitor.category_tag || "--"}</span>
      <span className="font-bold text-white">
        {competitor.appearances} / {competitor.signal_strength}
      </span>
      <span>{formatDate(competitor.latest_seen_at)}</span>
    </div>
  )
}

function RecommendationsPanel({
  recommendations,
}: {
  recommendations: DriftRecommendation[]
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Actionable Recommendations
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Next Admin Actions
          </h2>
        </div>
        <Zap size={22} className="text-cyan-300" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {recommendations.map((recommendation) => (
          <article
            key={`${recommendation.area}-${recommendation.title}`}
            className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <PriorityBadge priority={recommendation.priority} />
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold text-gray-300">
                {toLabel(recommendation.area)}
              </span>
              {recommendation.idea_type && (
                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-200">
                  {toLabel(recommendation.idea_type)}
                </span>
              )}
            </div>
            <h3 className="text-lg font-bold text-white">
              {recommendation.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {recommendation.description}
            </p>
            <p className="mt-4 text-sm font-bold text-cyan-200">
              {recommendation.action}
            </p>
          </article>
        ))}
      </div>
    </section>
  )
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "high"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : priority === "medium"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
      {toLabel(priority)}
    </span>
  )
}

function AdminGate({ title, message }: { title: string; message: string }) {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-6">
      <div className="w-full rounded-3xl border border-white/10 bg-[#12141D] p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-300">
          <Lock size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-white">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400">{message}</p>
        <Link
          href="/login"
          className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-bold text-white transition hover:brightness-110"
        >
          Go to login
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

function DriftSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-40 rounded-3xl bg-white/[0.05]" />
        ))}
      </div>
      <div className="h-96 rounded-3xl bg-white/[0.05]" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-96 rounded-3xl bg-white/[0.05]" />
        <div className="h-96 rounded-3xl bg-white/[0.05]" />
      </div>
    </div>
  )
}
