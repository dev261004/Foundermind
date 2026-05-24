"use client"

import { useState } from "react"
import { RefreshCw, SlidersHorizontal } from "lucide-react"
import { RecalibrationResult } from "@/types/analytics"
import { recalibrateWeights } from "@/lib/api/analyticsApi"

const IDEA_TYPES = ["tech", "marketplace", "deeptech", "general"]

const toLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

export function WeightRecalibrationPanel() {
  const [ideaType, setIdeaType] = useState(IDEA_TYPES[0])
  const [result, setResult] = useState<RecalibrationResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleRecalibrate = async () => {
    setIsSubmitting(true)
    setError(null)
    setResult(null)

    try {
      const data = await recalibrateWeights(ideaType)
      setResult(data)
    } catch (err: unknown) {
      setError(
        (err as { message?: string })?.message ??
          "Unable to recalibrate weights right now."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">
            Recalibration
          </p>
          <h2 className="mt-2 text-xl font-bold text-white">
            Weight Recalibration Panel
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
            Adjust scoring weights for an idea type using historical section quality.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-3">
          <SlidersHorizontal size={22} className="text-emerald-300" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <select
          value={ideaType}
          onChange={(event) => setIdeaType(event.target.value)}
          className="min-h-12 flex-1 rounded-2xl border border-white/10 bg-[#0B0C10] px-4 text-sm font-semibold text-white outline-none transition focus:border-cyan-400/50"
        >
          {IDEA_TYPES.map((type) => (
            <option key={type} value={type}>
              {toLabel(type)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRecalibrate}
          disabled={isSubmitting}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-emerald-400 px-5 text-sm font-bold text-neutral-950 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={isSubmitting ? "animate-spin" : ""} />
          {isSubmitting ? "Recalibrating" : "Recalibrate"}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      )}

      {result && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-[#0B0C10] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-bold text-white">
              Status: <span className="text-cyan-300">{toLabel(result.status)}</span>
            </p>
            {result.idea_type && (
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
                {toLabel(result.idea_type)}
              </p>
            )}
          </div>

          {result.new_weights && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(result.new_weights).map(([section, weight]) => (
                <div
                  key={section}
                  className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                >
                  <div className="mb-2 flex justify-between gap-3 text-sm">
                    <span className="font-semibold text-gray-300">
                      {toLabel(section)}
                    </span>
                    <span className="font-bold text-white">
                      {Math.round(weight * 100)}%
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-cyan-400"
                      style={{ width: `${Math.min(weight * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
