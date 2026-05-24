"use client"

import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  Columns3,
  GitCompareArrows,
  Lightbulb,
  Lock,
  RefreshCw,
  Scale,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import {
  compareAnalysisRuns,
  compareIdeas,
  fetchComparisonOptions,
} from "@/lib/api/comparisonApi"
import { useAuthStore } from "@/store/useAuthStore"
import { useComparisonStore } from "@/store/useComparisonStore"
import {
  ComparisonItem,
  ComparisonMode,
  ComparisonOption,
  ComparisonResult,
  MetricComparisonRow,
  SectionChange,
} from "@/types/comparison"

const toLabel = (value?: string | null) =>
  (value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

const formatScore = (value?: number | string | null) =>
  typeof value === "number" ? value.toFixed(1) : value ?? "--"

const formatPercent = (value?: number | string | null) =>
  typeof value === "number" ? `${Math.round(value * 100)}%` : value ?? "--"

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

const getOptionId = (option: ComparisonOption, mode: ComparisonMode) =>
  mode === "analyses" ? option.run_id ?? "" : option.idea_id ?? ""

export default function DashboardComparisonsPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const mode = useComparisonStore((state) => state.mode)
  const options = useComparisonStore((state) => state.options)
  const result = useComparisonStore((state) => state.result)
  const selectedRunIds = useComparisonStore((state) => state.selectedRunIds)
  const selectedIdeaIds = useComparisonStore((state) => state.selectedIdeaIds)
  const isLoadingOptions = useComparisonStore((state) => state.isLoadingOptions)
  const isComparing = useComparisonStore((state) => state.isComparing)
  const error = useComparisonStore((state) => state.error)
  const setMode = useComparisonStore((state) => state.setMode)
  const setOptions = useComparisonStore((state) => state.setOptions)
  const setResult = useComparisonStore((state) => state.setResult)
  const toggleRun = useComparisonStore((state) => state.toggleRun)
  const toggleIdea = useComparisonStore((state) => state.toggleIdea)
  const clearSelection = useComparisonStore((state) => state.clearSelection)
  const setLoadingOptions = useComparisonStore((state) => state.setLoadingOptions)
  const setComparing = useComparisonStore((state) => state.setComparing)
  const setError = useComparisonStore((state) => state.setError)
  const [query, setQuery] = useState("")

  const loadOptions = useCallback(async () => {
    if (!accessToken || role !== "admin") return

    setLoadingOptions(true)
    setError(null)
    try {
      const data = await fetchComparisonOptions()
      setOptions(data)
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ??
          "Unable to load comparison options."
      )
    } finally {
      setLoadingOptions(false)
    }
  }, [accessToken, role, setError, setLoadingOptions, setOptions])

  useEffect(() => {
    void loadOptions()
  }, [loadOptions])

  const availableOptions = useMemo(
    () => (mode === "analyses" ? options?.analysis_runs ?? [] : options?.ideas ?? []),
    [mode, options]
  )
  const selectedIds = mode === "analyses" ? selectedRunIds : selectedIdeaIds

  const filteredOptions = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return availableOptions
    return availableOptions.filter((option) =>
      [
        option.label,
        option.description,
        option.idea_type,
        option.status,
        option.owner,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search)
    )
  }, [availableOptions, query])

  const handleCompare = async () => {
    setComparing(true)
    setError(null)
    setResult(null)

    try {
      const data =
        mode === "analyses"
          ? await compareAnalysisRuns(selectedRunIds)
          : await compareIdeas(selectedIdeaIds)
      if (data.status !== "ready") {
        setError(data.message ?? "Select at least two comparable items.")
      }
      setResult(data)
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ??
          "Unable to compare selected items."
      )
    } finally {
      setComparing(false)
    }
  }

  if (!accessToken) {
    return (
      <AdminGate
        title="Login required"
        message="Sign in with an admin account to view comparisons."
      />
    )
  }

  if (role !== "admin") {
    return (
      <AdminGate
        title="Admin access required"
        message="Comparison analysis is limited to users with the admin role."
      />
    )
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-[#12141D] p-6 sm:p-8">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Comparison & Analysis
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Admin Comparison Console
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Compare analysis runs or ideas side by side, highlight movement, and review the recommendation report.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadOptions()}
            disabled={isLoadingOptions}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-bold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoadingOptions ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm font-semibold text-rose-100">
          {error}
        </section>
      )}

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
          <div className="mb-5 flex rounded-2xl border border-white/10 bg-[#0B0C10] p-1">
            <ModeButton
              active={mode === "analyses"}
              icon={<GitCompareArrows size={16} />}
              label="Analyses"
              onClick={() => setMode("analyses")}
            />
            <ModeButton
              active={mode === "ideas"}
              icon={<Lightbulb size={16} />}
              label="Ideas"
              onClick={() => setMode("ideas")}
            />
          </div>

          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white">
                Select {mode === "analyses" ? "runs" : "ideas"}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {selectedIds.length} selected
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-gray-300 transition hover:bg-white/[0.05]"
            >
              Clear
            </button>
          </div>

          <div className="relative mb-4">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${mode === "analyses" ? "runs" : "ideas"}...`}
              className="min-h-11 w-full rounded-2xl border border-white/10 bg-[#0B0C10] pl-10 pr-4 text-sm font-semibold text-white outline-none transition placeholder:text-gray-600 focus:border-cyan-400/50"
            />
          </div>

          <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
            {isLoadingOptions ? (
              <SelectionSkeleton />
            ) : filteredOptions.length ? (
              filteredOptions.map((option) => {
                const id = getOptionId(option, mode)
                return (
                  <SelectableOption
                    key={`${mode}-${id}`}
                    option={option}
                    selected={selectedIds.includes(id)}
                    mode={mode}
                    onToggle={() => {
                      if (!id) return
                      if (mode === "analyses") {
                        toggleRun(id)
                      } else {
                        toggleIdea(id)
                      }
                    }}
                  />
                )
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] p-8 text-center">
                <p className="text-sm font-semibold text-gray-400">
                  No comparable {mode === "analyses" ? "runs" : "ideas"} found.
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => void handleCompare()}
            disabled={selectedIds.length < 2 || isComparing}
            className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 text-sm font-bold text-neutral-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Scale size={16} />
            {isComparing ? "Comparing" : "Compare selected"}
          </button>
        </div>

        <ComparisonWorkspace
          mode={mode}
          result={result}
          isComparing={isComparing}
        />
      </section>
    </main>
  )
}

function ModeButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${
        active
          ? "bg-gradient-to-r from-violet-500 to-cyan-400 text-white"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

function SelectableOption({
  option,
  selected,
  mode,
  onToggle,
}: {
  option: ComparisonOption
  selected: boolean
  mode: ComparisonMode
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-cyan-400/40 bg-cyan-500/10"
          : "border-white/10 bg-[#0B0C10] hover:border-white/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-bold text-white">
              {option.label}
            </h3>
            <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] font-bold text-gray-400">
              {toLabel(option.idea_type)}
            </span>
          </div>
          <p className="mt-2 text-xs font-semibold text-gray-500">
            {mode === "analyses"
              ? `Run ${option.run_id?.slice(-6) ?? "--"}`
              : option.owner ?? "Admin dataset"}
          </p>
        </div>
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
            selected
              ? "border-cyan-300 bg-cyan-400 text-neutral-950"
              : "border-white/10 text-transparent"
          }`}
        >
          <Check size={14} />
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat label="Score" value={formatScore(option.overall_score)} />
        <MiniStat label="Weighted" value={formatScore(option.weighted_score)} />
        <MiniStat label="Date" value={formatDate(option.created_at)} />
      </div>
    </button>
  )
}

function ComparisonWorkspace({
  mode,
  result,
  isComparing,
}: {
  mode: ComparisonMode
  result: ComparisonResult | null
  isComparing: boolean
}) {
  if (isComparing) {
    return <ResultSkeleton />
  }

  if (!result || result.status !== "ready") {
    return (
      <section className="flex min-h-[620px] flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 bg-[#12141D] p-10 text-center">
        <Columns3 size={42} className="mb-4 text-gray-500" />
        <h2 className="text-2xl font-bold text-white">Choose items to compare</h2>
        <p className="mt-3 max-w-md text-sm leading-6 text-gray-400">
          Select at least two {mode === "analyses" ? "analysis runs" : "ideas"} to generate side-by-side metrics, changes, and a comparison report.
        </p>
      </section>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <SummaryStrip result={result} />
      <SideBySideItems items={result.items ?? []} mode={mode} />
      <MetricMatrix
        rows={
          mode === "analyses"
            ? result.metric_deltas ?? []
            : result.side_by_side_metrics ?? []
        }
        mode={mode}
      />
      {mode === "analyses" ? (
        <ChangeHighlights
          improved={result.improved ?? []}
          degraded={result.degraded ?? []}
          sectionChanges={result.section_changes ?? []}
        />
      ) : (
        <IdeaRanking ranking={result.ranking ?? []} />
      )}
      <ComparisonReportPanel result={result} />
    </div>
  )
}

function SummaryStrip({ result }: { result: ComparisonResult }) {
  const summary = result.summary
  const cards = [
    {
      label: "Compared",
      value: String(summary?.items_compared ?? 0),
      detail: "Selected items",
      icon: Columns3,
    },
    {
      label: "Best option",
      value: summary?.best_label ?? "--",
      detail: "Highest score",
      icon: Sparkles,
    },
    {
      label: "Avg score",
      value: formatScore(summary?.average_overall_score),
      detail: "Across selected items",
      icon: BarChart3,
    },
    {
      label: "Score spread",
      value: formatScore(summary?.score_spread),
      detail: "Distance between high and low",
      icon: Scale,
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
            <Icon size={20} className="mb-5 text-cyan-300" />
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              {card.label}
            </p>
            <p className="mt-2 line-clamp-2 text-xl font-bold text-white">
              {card.value}
            </p>
            <p className="mt-2 text-xs text-gray-500">{card.detail}</p>
          </article>
        )
      })}
    </section>
  )
}

function SideBySideItems({
  items,
  mode,
}: {
  items: ComparisonItem[]
  mode: ComparisonMode
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            Side-by-Side Results
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {mode === "analyses" ? "Analysis Run Cards" : "Idea Cards"}
          </h2>
        </div>
        <Columns3 size={22} className="text-violet-300" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {items.map((item) => (
          <article
            key={`${item.idea_id}-${item.run_id}`}
            className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">{item.label}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {toLabel(item.idea_type)} · {toLabel(item.status)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  Score
                </p>
                <p className="mt-1 text-2xl font-bold text-white">
                  {formatScore(item.overall_score)}
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <MiniStat label="Weighted" value={formatScore(item.weighted_score)} />
              <MiniStat
                label="Confidence"
                value={formatPercent(item.analysis_confidence)}
              />
              <MiniStat
                label="Sections"
                value={String(item.signals.sections_ready ?? "--")}
              />
            </div>

            <div className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="line-clamp-3 text-sm leading-6 text-gray-400">
                {item.report_summary || item.description || "No report summary available."}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function MetricMatrix({
  rows,
  mode,
}: {
  rows: MetricComparisonRow[]
  mode: ComparisonMode
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Metrics
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {mode === "analyses" ? "Run Metric Deltas" : "Idea Side-by-Side Metrics"}
          </h2>
        </div>
        <BarChart3 size={22} className="text-cyan-300" />
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div
            key={row.metric}
            className="rounded-2xl border border-white/10 bg-[#0B0C10] p-4"
          >
            <p className="mb-4 text-sm font-bold text-white">{row.label}</p>
            <div className="grid gap-3">
              {row.values.map((value) => (
                <MetricValueRow key={`${row.metric}-${value.id}`} value={value} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function MetricValueRow({ value }: { value: { label: string; value: number | string | null; delta_from_first?: number | null } }) {
  const numeric = typeof value.value === "number" ? value.value : 0
  const width = Math.min(Math.max(numeric * 10, 4), 100)

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-semibold text-gray-400">{value.label}</span>
        <span className="font-bold text-white">
          {formatScore(value.value)}
          {typeof value.delta_from_first === "number" && value.delta_from_first !== 0 && (
            <span
              className={
                value.delta_from_first > 0
                  ? "ml-2 text-emerald-300"
                  : "ml-2 text-rose-300"
              }
            >
              {value.delta_from_first > 0 ? "+" : ""}
              {value.delta_from_first.toFixed(1)}
            </span>
          )}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  )
}

function ChangeHighlights({
  improved,
  degraded,
  sectionChanges,
}: {
  improved: SectionChange[]
  degraded: SectionChange[]
  sectionChanges: SectionChange[]
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-2">
      <ChangePanel
        title="What Improved"
        items={improved}
        emptyText="No meaningful section improvements."
        tone="emerald"
        icon={<TrendingUp size={22} />}
      />
      <ChangePanel
        title="What Degraded"
        items={degraded}
        emptyText="No meaningful section degradation."
        tone="rose"
        icon={<TrendingDown size={22} />}
      />
      <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6 xl:col-span-2">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
          Change Highlighting
        </p>
        <h2 className="mt-2 text-2xl font-bold text-white">All Section Movement</h2>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {sectionChanges.map((change) => (
            <div
              key={change.section}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#0B0C10] p-4"
            >
              <div>
                <p className="font-bold text-white">{change.label}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  Spread {formatScore(change.spread)}
                </p>
              </div>
              <TrendBadge trend={change.trend} delta={change.delta} />
            </div>
          ))}
        </div>
      </section>
    </section>
  )
}

function ChangePanel({
  title,
  items,
  emptyText,
  tone,
  icon,
}: {
  title: string
  items: SectionChange[]
  emptyText: string
  tone: "emerald" | "rose"
  icon: ReactNode
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        <div className={tone === "emerald" ? "text-emerald-300" : "text-rose-300"}>
          {icon}
        </div>
      </div>
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.section}
              className="rounded-2xl border border-white/10 bg-[#0B0C10] p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-bold text-white">{item.label}</p>
                <TrendBadge trend={item.trend} delta={item.delta} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] p-8 text-center">
          <p className="text-sm font-semibold text-gray-400">{emptyText}</p>
        </div>
      )}
    </section>
  )
}

function IdeaRanking({ ranking }: { ranking: ComparisonItem[] }) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Help Choose Between Ideas
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">Decision Ranking</h2>
        </div>
        <Sparkles size={22} className="text-emerald-300" />
      </div>
      <div className="space-y-3">
        {ranking.map((item, index) => (
          <div
            key={item.idea_id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#0B0C10] p-4"
          >
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-cyan-200">
                {index + 1}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold text-white">{item.label}</p>
                <p className="mt-1 text-xs font-semibold text-gray-500">
                  {toLabel(item.idea_type)}
                </p>
              </div>
            </div>
            <p className="text-xl font-bold text-white">
              {formatScore(item.decision_score)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}

function ComparisonReportPanel({ result }: { result: ComparisonResult }) {
  const report = result.report
  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
            Comparison Report
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            {report?.title ?? "Report"}
          </h2>
        </div>
        <ChevronRight size={22} className="text-cyan-300" />
      </div>
      <p className="text-sm leading-6 text-gray-400">
        {report?.summary ?? "No comparison report available."}
      </p>
      <div className="mt-5 grid gap-3">
        {(report?.recommendations ?? []).map((recommendation) => (
          <div
            key={recommendation}
            className="rounded-2xl border border-cyan-400/20 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-100"
          >
            {recommendation}
          </div>
        ))}
      </div>
    </section>
  )
}

function TrendBadge({
  trend,
  delta,
}: {
  trend: string
  delta?: number | null
}) {
  const tone =
    trend === "improved"
      ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
      : trend === "degraded"
        ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
        : "border-white/10 bg-white/[0.04] text-gray-300"

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
      {toLabel(trend)} {typeof delta === "number" ? formatScore(delta) : ""}
    </span>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-white">{value}</p>
    </div>
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

function SelectionSkeleton() {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="h-28 rounded-2xl bg-white/[0.05]" />
      ))}
    </div>
  )
}

function ResultSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 rounded-3xl bg-white/[0.05]" />
        ))}
      </div>
      <div className="h-96 rounded-3xl bg-white/[0.05]" />
      <div className="h-96 rounded-3xl bg-white/[0.05]" />
    </div>
  )
}
