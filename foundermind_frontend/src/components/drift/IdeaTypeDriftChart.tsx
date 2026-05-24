import { Gauge, RefreshCw, SlidersHorizontal } from "lucide-react"
import {
  IdeaTypeDriftMetric,
  RecalibrationTrigger,
  WeightAlert,
} from "@/types/drift"

interface IdeaTypeDriftChartProps {
  drift: IdeaTypeDriftMetric[]
  weightAlerts: WeightAlert[]
  triggers: RecalibrationTrigger[]
  recalibratingIdeaType: string | null
  recalibrationProgress: number
  recalibrationErrors: Record<string, string>
  onRecalibrate: (ideaType: string) => void
}

const toLabel = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())

const formatScore = (value?: number | null) =>
  typeof value === "number" ? value.toFixed(1) : "--"

const formatPercent = (value: number) => `${Math.round(value * 100)}%`

export function IdeaTypeDriftChart({
  drift,
  weightAlerts,
  triggers,
  recalibratingIdeaType,
  recalibrationProgress,
  recalibrationErrors,
  onRecalibrate,
}: IdeaTypeDriftChartProps) {
  const alertsByType = Object.fromEntries(
    weightAlerts.map((alert) => [alert.idea_type, alert])
  )
  const triggersByType = Object.fromEntries(
    triggers.map((trigger) => [trigger.idea_type, trigger])
  )

  return (
    <section className="rounded-3xl border border-white/10 bg-[#12141D] p-5 sm:p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-violet-300">
            Idea Type Drift
          </p>
          <h2 className="mt-2 text-2xl font-bold text-white">
            Recalibration Triggers
          </h2>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-3 text-violet-300">
          <SlidersHorizontal size={22} />
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {drift.length ? (
          drift.map((item) => {
            const weightAlert = alertsByType[item.idea_type]
            const trigger = triggersByType[item.idea_type]
            const maxDrift = Math.max(item.threshold, Math.abs(item.drift), 1)
            const driftWidth = Math.min((Math.abs(item.drift) / maxDrift) * 100, 100)
            const isRecalibrating = recalibratingIdeaType === item.idea_type
            const isBlockedByAnotherRun =
              !!recalibratingIdeaType && !isRecalibrating
            const requiresRecalibration = Boolean(trigger?.should_recalibrate)
            const recalibrationError = recalibrationErrors[item.idea_type]

            return (
              <article
                key={item.idea_type}
                className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-xl font-bold text-white">
                        {toLabel(item.idea_type)}
                      </h3>
                      <StatusPill status={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {item.sample_size} completed runs monitored
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      !requiresRecalibration ||
                      isRecalibrating ||
                      isBlockedByAnotherRun
                    }
                    onClick={() => onRecalibrate(item.idea_type)}
                    title={
                      requiresRecalibration
                        ? `Run recalibration for ${toLabel(item.idea_type)}`
                        : "Recalibration is not required for this idea type right now."
                    }
                    className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-bold transition ${
                      requiresRecalibration
                        ? "border-cyan-400/40 bg-gradient-to-r from-cyan-500 to-emerald-400 text-neutral-950 shadow-[0_0_24px_rgba(34,211,238,0.18)] hover:brightness-110"
                        : "border-white/10 bg-white/[0.03] text-gray-500"
                    } disabled:cursor-not-allowed disabled:opacity-55`}
                  >
                    <RefreshCw
                      size={15}
                      className={isRecalibrating ? "animate-spin" : ""}
                    />
                    {isRecalibrating
                      ? "Running"
                      : requiresRecalibration
                        ? "Recalibrate"
                        : "Not required"}
                  </button>
                </div>

                {isRecalibrating && (
                  <div className="mt-5 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-bold text-cyan-100">
                        Recalibration in progress
                      </p>
                      <span className="text-sm font-bold text-cyan-100">
                        {Math.round(recalibrationProgress)}%
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-cyan-950/70">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-300 transition-all duration-300"
                        style={{ width: `${Math.min(recalibrationProgress, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {recalibrationError && (
                  <div className="mt-5 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                    {recalibrationError}
                  </div>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <SmallMetric label="Recent" value={formatScore(item.recent_avg)} />
                  <SmallMetric label="Baseline" value={formatScore(item.baseline_avg)} />
                  <SmallMetric label="Drift" value={formatScore(item.drift)} />
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between gap-3 text-xs font-bold uppercase tracking-widest text-gray-500">
                    <span>Drift magnitude</span>
                    <span>Threshold {formatScore(item.threshold)}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className={`h-full rounded-full ${
                        item.status === "drift_detected"
                          ? "bg-rose-400"
                          : "bg-gradient-to-r from-violet-500 to-cyan-400"
                      }`}
                      style={{ width: `${driftWidth}%` }}
                    />
                  </div>
                </div>

                {weightAlert && (
                  <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-sm font-bold text-white">
                        <Gauge size={16} className="text-cyan-300" />
                        Weight adjustment
                      </div>
                      <StatusPill status={weightAlert.status} />
                    </div>
                    <p className="text-sm leading-6 text-gray-400">
                      {weightAlert.reason}
                    </p>
                    <div className="mt-4 grid gap-2">
                      {weightAlert.changes.slice(0, 4).map((change) => (
                        <div
                          key={change.section}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate font-semibold text-gray-400">
                            {toLabel(change.section)}
                          </span>
                          <span className="font-bold text-white">
                            {formatPercent(change.current_weight)} to{" "}
                            {formatPercent(change.suggested_weight)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {trigger?.reasons?.length ? (
                  <div className="mt-4 space-y-2">
                    {trigger.reasons.map((reason) => (
                      <p
                        key={reason}
                        className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-3 py-2 text-xs font-semibold text-amber-100"
                      >
                        {reason}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-gray-400">
                    No active trigger right now. Recalibration becomes clickable when drift or weight cleanup is required.
                  </p>
                )}
              </article>
            )
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-[#0B0C10] p-10 text-center xl:col-span-2">
            <p className="text-sm font-semibold text-gray-400">
              No idea type drift signals available.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-bold text-white">{value}</p>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "drift_detected" || status === "adjustment_recommended"
      ? "border-rose-400/30 bg-rose-500/10 text-rose-200"
      : status === "insufficient_data" || status === "no_data"
        ? "border-amber-400/30 bg-amber-500/10 text-amber-200"
        : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200"

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-bold ${tone}`}>
      {toLabel(status)}
    </span>
  )
}
