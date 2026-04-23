"use client"

import Link from "next/link"
import { type ReactNode, useEffect, useState } from "react"
import {
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Lightbulb,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react"
import { ideaService, IdeaHistoryItem } from "@/app/services/ideaService"
import { useAuthStore } from "@/store/useAuthStore"

export default function DashboardIdeasPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const email = useAuthStore((state) => state.email)

  const [hasMounted, setHasMounted] = useState(false)
  const [history, setHistory] = useState<IdeaHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")

  useEffect(() => {
    setHasMounted(true)
  }, [])

  useEffect(() => {
    if (!hasMounted) {
      return
    }

    if (!accessToken) {
      setHistory([])
      setError(null)
      setIsLoading(false)
      return
    }

    let cancelled = false

    const fetchHistory = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const data = await ideaService.getHistory()

        if (!cancelled) {
          setHistory(data.history)
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const message =
            (err as { message?: string })?.message ?? "Unable to load idea history right now."
          setError(message)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchHistory()

    return () => {
      cancelled = true
    }
  }, [accessToken, hasMounted])

  const handleRefresh = async () => {
    if (!accessToken) {
      return
    }

    setIsRefreshing(true)
    setError(null)

    try {
      const data = await ideaService.getHistory()
      setHistory(data.history)
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Unable to refresh idea history right now."
      setError(message)
    } finally {
      setIsRefreshing(false)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const filteredHistory = history.filter((idea) => {
    if (!normalizedQuery) {
      return true
    }

    const haystack = [
      idea.title,
      idea.description,
      idea.idea_type,
      idea.preview,
      idea.status,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })

  const ideasWithScore = history.filter((idea) => typeof idea.overall_score === "number")
  const ideasWithConfidence = history.filter((idea) => typeof idea.analysis_confidence === "number")

  const averageScore = ideasWithScore.length
    ? ideasWithScore.reduce((sum, idea) => sum + Number(idea.overall_score ?? 0), 0) / ideasWithScore.length
    : null

  const averageConfidence = ideasWithConfidence.length
    ? ideasWithConfidence.reduce((sum, idea) => sum + Number(idea.analysis_confidence ?? 0), 0) / ideasWithConfidence.length
    : null

  const latestAnalyzedAt = history[0]?.analyzed_at ?? null

  if (!hasMounted) {
    return <HistorySkeleton />
  }

  if (!accessToken) {
    return <LoginPrompt />
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
      <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.28),transparent_40%),radial-gradient(circle_at_bottom_right,rgba(6,182,212,0.18),transparent_42%),rgba(10,10,14,0.92)] p-6 shadow-[0_25px_90px_rgba(0,0,0,0.35)] sm:p-8 lg:p-10">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.05),transparent_38%,transparent_62%,rgba(255,255,255,0.03))]" />
        <div className="absolute -right-20 top-0 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-violet-500/20 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)] lg:items-end">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
              <Sparkles size={14} />
              Ideas History
            </span>

            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Every analyzed startup idea, organized into one polished workspace.
              </h1>

              <p className="max-w-2xl text-sm leading-7 text-neutral-300 sm:text-base">
                Review the ideas you have already analyzed, revisit their latest AI report, and keep your
                founder workflow moving without losing past insight.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-300">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <Lightbulb size={15} className="text-violet-300" />
                {history.length} analyzed ideas
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2">
                <BrainCircuit size={15} className="text-cyan-300" />
                {email ?? "FounderMind user"}
              </span>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <HeroMetric
              label="Analyzed"
              value={String(history.length)}
              hint="Ideas with completed AI reports"
            />
            <HeroMetric
              label="Avg. Score"
              value={averageScore !== null ? formatScore(averageScore) : "--"}
              hint="Average overall quality signal"
            />
            <HeroMetric
              label="Last Analysis"
              value={latestAnalyzedAt ? formatDate(latestAnalyzedAt) : "--"}
              hint="Most recent completed report"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          icon={<Lightbulb size={18} className="text-violet-200" />}
          label="Total History"
          value={String(history.length)}
          detail="Analyzed ideas saved for this user"
        />
        <SummaryCard
          icon={<TrendingUp size={18} className="text-cyan-200" />}
          label="Average Score"
          value={averageScore !== null ? `${formatScore(averageScore)} / 10` : "--"}
          detail="Blended critic score across analyzed ideas"
        />
        <SummaryCard
          icon={<BrainCircuit size={18} className="text-emerald-200" />}
          label="Avg. Confidence"
          value={averageConfidence !== null ? formatPercent(averageConfidence) : "--"}
          detail="Confidence estimated by the analysis pipeline"
        />
        <SummaryCard
          icon={<CalendarClock size={18} className="text-amber-200" />}
          label="Latest Update"
          value={latestAnalyzedAt ? formatDate(latestAnalyzedAt) : "--"}
          detail="Freshest report available in history"
        />
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.035] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.2)] backdrop-blur-xl sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-white">Your analyzed ideas</h2>
            <p className="text-sm text-neutral-400">
              Search, scan, and reopen any idea report from your FounderMind history.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="relative min-w-0 flex-1 sm:min-w-[280px]">
              <Search
                size={16}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, preview, type, or status"
                className="w-full rounded-2xl border border-white/10 bg-neutral-950/70 py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-neutral-500 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/15"
              />
            </label>

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw size={16} className={isRefreshing ? "animate-spin" : ""} />
              Refresh
            </button>

            <Link
              href="/submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_40px_rgba(124,58,237,0.28)] transition hover:translate-y-[-1px]"
            >
              Analyze new idea
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      {isLoading ? (
        <HistoryGridSkeleton />
      ) : filteredHistory.length === 0 ? (
        <EmptyState hasHistory={history.length > 0} query={query} />
      ) : (
        <section className="grid gap-5 xl:grid-cols-2">
          {filteredHistory.map((idea) => (
            <IdeaHistoryCard key={idea.idea_id} idea={idea} />
          ))}
        </section>
      )}
    </div>
  )
}

function HeroMetric({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-md">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{hint}</p>
    </div>
  )
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/[0.035] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.18)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          {icon}
        </span>
        <span className="text-xs font-medium uppercase tracking-[0.22em] text-neutral-500">{label}</span>
      </div>
      <p className="mt-5 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{detail}</p>
    </article>
  )
}

function IdeaHistoryCard({ idea }: { idea: IdeaHistoryItem }) {
  return (
    <article className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_28px_80px_rgba(6,182,212,0.08)]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(124,58,237,0.12),transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100" />

      <div className="relative flex h-full flex-col gap-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <Tag>{humanizeLabel(idea.status ?? "active")}</Tag>
            <Tag>{humanizeLabel(idea.idea_type ?? "general")}</Tag>
            <Tag>{idea.sections_ready} sections ready</Tag>
          </div>

          <div className="min-w-[88px] rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">Score</p>
            <p className="mt-1 text-2xl font-semibold text-white">
              {idea.overall_score !== null && idea.overall_score !== undefined
                ? formatScore(idea.overall_score)
                : "--"}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight text-white">{idea.title}</h2>
          <p className="text-sm leading-7 text-neutral-400">
            {truncateText(idea.description || "No description was saved for this idea.", 180)}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <MiniStat label="Analyzed" value={formatDate(idea.analyzed_at)} />
          <MiniStat label="Confidence" value={formatPercent(idea.analysis_confidence)} />
          <MiniStat label="Report" value={idea.agent_run_id ? "Ready" : "Saved"} />
        </div>

        <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">Preview</p>
          <p className="mt-3 text-sm leading-7 text-neutral-300">
            {idea.preview || "This report is available, and you can open the full analysis for complete detail."}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-3 sm:flex-row">
          <Link
            href={`/idea/${idea.idea_id}`}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_38px_rgba(124,58,237,0.28)] transition hover:translate-y-[-1px]"
          >
            View full analysis
            <ArrowRight size={16} />
          </Link>

          <Link
            href="/submit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
          >
            Analyze another idea
          </Link>
        </div>
      </div>
    </article>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/5 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-neutral-300">
      {children}
    </span>
  )
}

function EmptyState({
  hasHistory,
  query,
}: {
  hasHistory: boolean
  query: string
}) {
  return (
    <section className="rounded-[30px] border border-dashed border-white/12 bg-white/[0.03] px-6 py-14 text-center shadow-[0_18px_50px_rgba(0,0,0,0.16)]">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-[22px] border border-white/10 bg-white/5 text-cyan-200">
          <BrainCircuit size={28} />
        </div>

        <h2 className="text-2xl font-semibold text-white">
          {hasHistory ? "No ideas match that search yet." : "No analyzed ideas yet."}
        </h2>

        <p className="text-sm leading-7 text-neutral-400">
          {hasHistory
            ? `Try a different search term than "${query.trim()}" or refresh the list to reload your history.`
            : "Run your first FounderMind analysis and it will appear here with quick access to the full report."}
        </p>

        <Link
          href="/submit"
          className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white"
        >
          Start an analysis
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

function LoginPrompt() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center">
      <div className="w-full rounded-[32px] border border-white/10 bg-white/[0.04] p-8 text-center shadow-[0_25px_70px_rgba(0,0,0,0.26)] backdrop-blur-xl sm:p-10">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-violet-200">
          <Lightbulb size={28} />
        </div>

        <h1 className="mt-5 text-3xl font-semibold text-white">Login to view your idea history</h1>
        <p className="mt-3 text-sm leading-7 text-neutral-400">
          Your dashboard history is tied to your account so you can reopen previous analyses any time.
        </p>

        <Link
          href="/login"
          className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-3 text-sm font-semibold text-white"
        >
          Go to login
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}

function HistorySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 animate-pulse">
      <div className="h-72 rounded-[32px] bg-white/[0.05]" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-36 rounded-[24px] bg-white/[0.05]" />
        ))}
      </div>
      <div className="h-24 rounded-[28px] bg-white/[0.05]" />
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-96 rounded-[28px] bg-white/[0.05]" />
        ))}
      </div>
    </div>
  )
}

function HistoryGridSkeleton() {
  return (
    <section className="grid gap-5 xl:grid-cols-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-96 rounded-[28px] bg-white/[0.05]" />
      ))}
    </section>
  )
}

function formatDate(value?: string | null) {
  if (!value) {
    return "--"
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return "--"
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function formatScore(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--"
  }

  return Number(value).toFixed(1)
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--"
  }

  return `${Math.round(Number(value) * 100)}%`
}

function humanizeLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function truncateText(value: string, maxLength: number) {
  const cleaned = value.split().join(" ").trim()

  if (cleaned.length <= maxLength) {
    return cleaned
  }

  return `${cleaned.slice(0, maxLength - 3).trimEnd()}...`
}
