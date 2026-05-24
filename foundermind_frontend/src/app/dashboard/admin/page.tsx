"use client"

import { useCallback, useEffect } from "react"
import Link from "next/link"
import { ArrowRight, Lock, RefreshCw } from "lucide-react"
import { PerformanceSummaryCard } from "@/components/analytics/PerformanceSummaryCard"
import { RollingMetricsChart } from "@/components/analytics/RollingMetricsChart"
import { WeightRecalibrationPanel } from "@/components/analytics/WeightRecalibrationPanel"
import { fetchAnalyticsSummary } from "@/lib/api/analyticsApi"
import { useAnalyticsStore } from "@/store/useAnalyticsStore"
import { useAuthStore } from "@/store/useAuthStore"

export default function DashboardAdminPage() {
  const accessToken = useAuthStore((state) => state.accessToken)
  const role = useAuthStore((state) => state.role)
  const summary = useAnalyticsStore((state) => state.summary)
  const isLoading = useAnalyticsStore((state) => state.isLoading)
  const error = useAnalyticsStore((state) => state.error)
  const setSummary = useAnalyticsStore((state) => state.setSummary)
  const setLoading = useAnalyticsStore((state) => state.setLoading)
  const setError = useAnalyticsStore((state) => state.setError)

  const loadSummary = useCallback(async () => {
    if (!accessToken || role !== "admin") return

    setLoading(true)
    setError(null)

    try {
      const data = await fetchAnalyticsSummary()
      setSummary(data)
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ??
          "Unable to load admin analytics."
      )
    } finally {
      setLoading(false)
    }
  }, [accessToken, role, setError, setLoading, setSummary])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  if (!accessToken) {
    return <AdminGate title="Login required" message="Sign in with an admin account to view platform metrics." />
  }

  if (role !== "admin") {
    return <AdminGate title="Admin access required" message="This dashboard is limited to users with the admin role." />
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-3xl border border-white/10 bg-[#12141D] p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-cyan-300">
              Admin Dashboard
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Platform Intelligence Console
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Monitor agent quality, tool reliability, scoring behavior, and dynamic weight updates.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadSummary()}
            disabled={isLoading}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-5 text-sm font-bold text-white transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
          {error}
        </section>
      )}

      {isLoading && !summary ? (
        <AdminSkeleton />
      ) : summary ? (
        <>
          <PerformanceSummaryCard summary={summary} />
          <RollingMetricsChart summary={summary} />
          <WeightRecalibrationPanel />
        </>
      ) : (
        <section className="rounded-3xl border border-dashed border-white/10 bg-[#12141D] p-10 text-center">
          <h2 className="text-xl font-bold text-white">No analytics data yet</h2>
          <p className="mt-2 text-sm text-gray-400">
            Completed or partial agent runs will appear here once available.
          </p>
        </section>
      )}
    </main>
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

function AdminSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-72 rounded-3xl bg-white/[0.05]" />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-80 rounded-3xl bg-white/[0.05]" />
        <div className="h-80 rounded-3xl bg-white/[0.05]" />
      </div>
      <div className="h-72 rounded-3xl bg-white/[0.05]" />
    </div>
  )
}
