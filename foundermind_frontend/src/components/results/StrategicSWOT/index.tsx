"use client"

import React, { useState } from "react"
import {
  AlertTriangle, ArrowLeft, ArrowRight, Star, Zap,
  ShieldAlert, Rocket, Target, Info, Download, FileText,
  X, CheckCircle,
} from "lucide-react"
import type {
  SWOTAnalysis,
  SWOTStrengthItem,
  SWOTWeaknessItem,
  SWOTOpportunityItem,
  SWOTThreatItem,
} from "@/types/analysis"
import SWOTPDFTemplate, {
  SWOT_PDF_ELEMENT_ID,
  downloadSWOTPDF,
} from "./SWOTPDFTemplate"

// ─── Types ───────────────────────────────────────────────────────────────────

type QuadrantKey = "strengths" | "weaknesses" | "opportunities" | "threats"
type MetricType = "none" | "severity" | "potential"
type ColorName = "emerald" | "amber" | "sky" | "rose"

interface SwotItemView {
  id: string
  title: string
  description: string
  deepDive: string
  imperatives: string[]
  metricValue?: number
}

interface QuadrantView {
  key: QuadrantKey
  title: string
  colorName: ColorName
  metricType: MetricType
  items: SwotItemView[]
  imageUrl: string
  icon: React.ComponentType<{ className?: string }>
}

// ─── Static config ───────────────────────────────────────────────────────────

const QUADRANT_META: Record<
  QuadrantKey,
  { title: string; colorName: ColorName; metricType: MetricType; icon: React.ComponentType<{ className?: string }>; imageUrl: string }
> = {
  strengths: {
    title: "Strengths",
    colorName: "emerald",
    metricType: "none",
    icon: Zap,
    imageUrl: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=600",
  },
  weaknesses: {
    title: "Weaknesses",
    colorName: "amber",
    metricType: "severity",
    icon: ShieldAlert,
    imageUrl: "https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&q=80&w=600",
  },
  opportunities: {
    title: "Opportunities",
    colorName: "sky",
    metricType: "potential",
    icon: Rocket,
    imageUrl: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?auto=format&fit=crop&q=80&w=600",
  },
  threats: {
    title: "Threats",
    colorName: "rose",
    metricType: "severity",
    icon: Target,
    imageUrl: "https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&q=80&w=600",
  },
}

// ─── Build quadrant views from API data ──────────────────────────────────────

function buildQuadrants(swot: SWOTAnalysis): QuadrantView[] {
  const keys: QuadrantKey[] = ["strengths", "weaknesses", "opportunities", "threats"]
  return keys.map((key) => {
    const meta = QUADRANT_META[key]
    const rawItems = swot[key] as (SWOTStrengthItem | SWOTWeaknessItem | SWOTOpportunityItem | SWOTThreatItem)[]
    const items: SwotItemView[] = (rawItems || []).map((item, idx) => ({
      id: `${key}-${idx}`,
      title: item.term,
      description: item.detail,
      deepDive: item.explore?.deep_dive || "",
      imperatives: item.explore?.strategic_imperatives || [],
      metricValue: "severity" in item ? item.severity : "potential" in item ? item.potential : undefined,
    }))
    return { key, ...meta, items }
  })
}

// ─── Color maps ──────────────────────────────────────────────────────────────

const COLOR_MAP = {
  emerald: {
    border: "border-emerald-500/50", dash: "border-emerald-500",
    text: "text-emerald-400", iconBg: "bg-emerald-500/20",
    gradient: "from-emerald-950/80", bg: "bg-emerald-500",
    fill: "fill-emerald-500 text-emerald-500", glow: "shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]",
  },
  amber: {
    border: "border-amber-500/50", dash: "border-amber-500",
    text: "text-amber-400", iconBg: "bg-amber-500/20",
    gradient: "from-amber-950/80", bg: "bg-amber-500",
    fill: "fill-amber-500 text-amber-500", glow: "shadow-[0_0_30px_-10px_rgba(245,158,11,0.3)]",
  },
  sky: {
    border: "border-sky-500/50", dash: "border-sky-500",
    text: "text-sky-400", iconBg: "bg-sky-500/20",
    gradient: "from-sky-950/80", bg: "bg-sky-500",
    fill: "fill-sky-500 text-sky-500", glow: "shadow-[0_0_30px_-10px_rgba(14,165,233,0.3)]",
  },
  rose: {
    border: "border-rose-500/50", dash: "border-rose-500",
    text: "text-rose-400", iconBg: "bg-rose-500/20",
    gradient: "from-rose-950/80", bg: "bg-rose-500",
    fill: "fill-rose-500 text-rose-500", glow: "shadow-[0_0_30px_-10px_rgba(244,63,94,0.3)]",
  },
} as const

// ─── MetricIndicator ─────────────────────────────────────────────────────────

function MetricIndicator({ type, value, color }: { type: MetricType; value?: number; color: ColorName }) {
  if (type === "none" || value === undefined) return null
  const c = COLOR_MAP[color]
  if (type === "potential") {
    return (
      <div className="flex gap-1 bg-black/40 rounded-full px-2 py-1 backdrop-blur-sm border border-white/5">
        {[0, 1, 2].map((i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < value ? c.fill : "text-slate-600"}`} />
        ))}
      </div>
    )
  }
  return (
    <div className="flex gap-1 bg-black/40 rounded-full px-2 py-1.5 backdrop-blur-sm border border-white/5">
      {[0, 1, 2].map((i) => (
        <div key={i} className={`w-2 h-2 rounded-full ${i < value ? c.bg : "bg-slate-600"}`} />
      ))}
    </div>
  )
}

// ─── Quadrant Card ───────────────────────────────────────────────────────────

function Quadrant({ data, onExplore }: { data: QuadrantView; onExplore: () => void }) {
  const c = COLOR_MAP[data.colorName]
  const Icon = data.icon
  return (
    <div className={`group relative rounded-2xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-500 hover:${c.border} ${c.glow} bg-slate-900 min-h-[380px]`}>
      <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay grayscale group-hover:grayscale-0 group-hover:opacity-30 transition-all duration-700" style={{ backgroundImage: `url(${data.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
      <div className={`absolute inset-0 z-0 bg-gradient-to-t ${c.gradient} via-slate-900/95 to-slate-900/90`} />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-900/40 to-slate-950/80" />
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${c.iconBg} border border-white/10 flex items-center justify-center backdrop-blur-md`}>
              <Icon className={`w-5 h-5 ${c.text}`} />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{data.title}</h3>
          </div>
          {data.metricType !== "none" && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{data.metricType}</span>
          )}
        </div>
        <div className="flex-grow space-y-6">
          {data.items.slice(0, 3).map((item) => (
            <div key={item.id} className="flex gap-4">
              <div className={`w-1.5 border-t-2 mt-2.5 shrink-0 ${c.dash} opacity-70`} />
              <div className="flex-grow">
                <p className="text-[15px] leading-relaxed text-slate-300">
                  <strong className="text-white font-semibold block sm:inline">{item.title}</strong>{" "}
                  <span className="opacity-90">{item.description}</span>
                </p>
              </div>
              {data.metricType !== "none" && (
                <div className="pt-1 pl-2 shrink-0">
                  <MetricIndicator type={data.metricType} value={item.metricValue} color={data.colorName} />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="pt-8 mt-auto">
          <button onClick={onExplore} className={`flex items-center text-sm font-medium ${c.text} opacity-80 hover:opacity-100 transition-all w-fit group/btn`}>
            Explore details
            <ArrowRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Quadrant Detail View ────────────────────────────────────────────────────

function QuadrantDetailView({ data, onBack, onDownload }: { data: QuadrantView; onBack: () => void; onDownload: () => void }) {
  const Icon = data.icon
  const c = COLOR_MAP[data.colorName]
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center flex-wrap gap-4 mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors group">
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
        </button>
        <button onClick={onDownload} className="flex items-center gap-2 bg-indigo-500/10 text-indigo-400 px-4 py-2 rounded-lg font-medium text-sm transition-colors border border-indigo-500/20 hover:bg-indigo-500/20">
          <Download className="w-4 h-4" /> Download Report
        </button>
      </div>
      <div className="relative rounded-3xl border border-slate-800 flex flex-col overflow-hidden bg-slate-900/40 backdrop-blur-xl mb-12 shadow-2xl">
        <div className="absolute inset-0 z-0 opacity-10 mix-blend-overlay grayscale" style={{ backgroundImage: `url(${data.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }} />
        <div className={`absolute inset-0 z-0 bg-gradient-to-t via-slate-900/95 to-slate-900/90 from-${data.colorName}-500/20`} />
        <div className="relative z-10 p-8 sm:p-12">
          <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-12">
            <div className={`w-16 h-16 shrink-0 rounded-2xl ${c.iconBg} border border-white/10 flex items-center justify-center backdrop-blur-md shadow-lg`}>
              <Icon className={`w-8 h-8 ${c.text}`} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className={`h-1 w-8 ${c.bg} rounded-full`} />
                <span className={`${c.text} font-semibold tracking-wider uppercase text-xs`}>Deep Dive Analysis</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">{data.title}</h1>
            </div>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {data.items.map((item) => (
              <div key={item.id} className="bg-black/40 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden group hover:border-slate-700 transition-colors shadow-lg">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${c.bg} opacity-50`} />
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-white leading-tight">{item.title}</h3>
                  {data.metricType !== "none" && (
                    <div className="shrink-0 bg-slate-900/80 rounded-xl p-2.5 border border-slate-800 flex gap-3 items-center text-xs text-slate-400 uppercase tracking-widest font-bold backdrop-blur-sm">
                      {data.metricType}
                      <MetricIndicator type={data.metricType} value={item.metricValue} color={data.colorName} />
                    </div>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed text-base sm:text-lg mb-4">{item.description}</p>
                {item.deepDive && (
                  <p className="text-slate-400 leading-relaxed text-sm mb-8 border-l-2 border-slate-700 pl-4">{item.deepDive}</p>
                )}
                {item.imperatives.length > 0 && (
                  <div className="border-t border-slate-800/80 pt-6 mt-auto">
                    <h4 className={`text-xs font-bold ${c.text} uppercase tracking-widest mb-4 flex items-center gap-2`}>
                      <Target className="w-4 h-4" /> Strategic Imperatives
                    </h4>
                    <ul className="space-y-4">
                      {item.imperatives.map((imp, idx) => (
                        <li key={idx} className="flex gap-3 text-sm text-slate-400 items-start">
                          <div className={`w-1.5 h-1.5 rounded-full ${c.bg} mt-1.5 shrink-0 opacity-70`} />
                          <span className="leading-relaxed">{imp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

interface StrategicSWOTProps {
  swot: SWOTAnalysis
  ideaName: string
}

export function StrategicSWOT({ swot, ideaName }: StrategicSWOTProps) {
  const [activeQuadrant, setActiveQuadrant] = useState<QuadrantKey | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const quadrants = buildQuadrants(swot)
  const activeData = activeQuadrant ? quadrants.find((q) => q.key === activeQuadrant) : null

  const stanceColor =
    swot.competitive_position.score >= 51 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_-5px_rgba(16,185,129,0.3)]"
      : swot.competitive_position.score >= 26 ? "text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)]"
        : "text-rose-400 bg-rose-500/10 border-rose-500/20 shadow-[0_0_20px_-5px_rgba(244,63,94,0.3)]"

  const handleDownload = async () => {
    await downloadSWOTPDF(SWOT_PDF_ELEMENT_ID, ideaName, () => {
      setToastMessage("Report downloaded successfully.")
      setTimeout(() => setToastMessage(null), 4000)
    })
  }

  return (
    <div className="relative">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md text-emerald-100 px-5 py-3 rounded-xl shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="font-medium text-sm">{toastMessage}</span>
            <button onClick={() => setToastMessage(null)} className="ml-2 text-emerald-400/70 hover:text-emerald-400 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Hidden PDF template */}
      <SWOTPDFTemplate data={swot} ideaName={ideaName} />

      {activeData ? (
        <QuadrantDetailView data={activeData} onBack={() => setActiveQuadrant(null)} onDownload={handleDownload} />
      ) : (
        <div>
          {/* Critical Insight Banner */}
          {swot.critical_insight.label && (
            <div className="bg-rose-950/30 border border-rose-900/50 rounded-2xl p-5 flex gap-5 items-start shadow-[0_0_40px_-15px_rgba(244,63,94,0.15)] flex-col sm:flex-row relative overflow-hidden backdrop-blur-xl">
              <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-rose-500 to-rose-700" />
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-rose-600/10 flex items-center justify-center shrink-0 border border-rose-500/20 z-10 ml-1">
                <AlertTriangle className="w-6 h-6 text-rose-500" />
              </div>
              <div className="z-10 flex-grow">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="text-[11px] font-bold tracking-widest text-rose-400 uppercase">Critical Threat Detected</div>
                  <div className="h-px flex-grow bg-gradient-to-r from-rose-900/50 to-transparent" />
                </div>
                <p className="text-rose-100/90 text-base leading-relaxed">
                  <strong className="text-white font-semibold">{swot.critical_insight.label}</strong> &mdash; {swot.critical_insight.detail}
                </p>
              </div>
            </div>
          )}

          {/* SWOT Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative mt-6">
            {quadrants.map((q) => (
              <Quadrant key={q.key} data={q} onExplore={() => setActiveQuadrant(q.key)} />
            ))}
          </div>

          {/* Competitive Position */}
          <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-8 shadow-2xl backdrop-blur-lg mt-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.05)_0%,_transparent_70%)] pointer-events-none" />
            <div className="flex flex-col lg:flex-row lg:justify-between items-start lg:items-center mb-10 gap-6 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <Target className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">Market Stance</h3>
                </div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Competitive Position</h2>
              </div>
              <div className="text-left lg:text-center mt-2 lg:mt-0 lg:absolute lg:left-1/2 lg:-translate-x-1/2">
                <div className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full font-semibold text-sm mb-2 border ${stanceColor}`}>
                  {swot.competitive_position.stance}
                </div>
                <div className="text-[13px] text-slate-400 leading-relaxed max-w-sm">{swot.competitive_position.description}</div>
              </div>
              <div className="hidden lg:block w-[150px]" />
            </div>
            <div className="relative pt-4 pb-4 px-2 z-10">
              <div className="h-3.5 w-full rounded-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 relative shadow-inner flex items-center">
                <div className="absolute inset-0 rounded-full border border-white/10 mix-blend-overlay" />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -ml-4 w-8 h-8 bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] border-2 border-slate-600 flex items-center justify-center"
                  style={{ left: `${Math.max(0, Math.min(100, swot.competitive_position.score))}%` }}
                >
                  <div className="w-2 h-2 rounded-full bg-slate-600" />
                </div>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase tracking-widest text-slate-500 mt-6 px-1 relative">
                <div className="group flex flex-col items-start cursor-help">
                  <div className="flex items-center gap-1.5 text-rose-500/70 hover:text-rose-400 transition-colors">
                    Vulnerable <Info className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="group flex flex-col items-center cursor-help">
                  <div className="flex items-center gap-1.5 text-amber-500/70 hover:text-amber-400 transition-colors translate-x-[-15px]">
                    At Risk <Info className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="group flex flex-col items-end cursor-help">
                  <div className="flex items-center gap-1.5 text-emerald-500/70 hover:text-emerald-400 transition-colors">
                    <Info className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 transition-opacity" /> Strong
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Download CTA */}
          <div className="mt-8 bg-gradient-to-r from-indigo-900/40 to-slate-900 border border-indigo-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden backdrop-blur-sm shadow-xl hover:border-indigo-500/40 transition-colors">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent pointer-events-none" />
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 z-10">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 flex-shrink-0 shadow-[0_0_30px_-10px_rgba(99,102,241,0.4)]">
                <FileText className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight mb-1">In-Depth Strategic Report</h3>
                <p className="text-[15px] text-indigo-100/70">Get The Full Comprehensive Analysis Of Your SWOT In A Detailed PDF</p>
              </div>
            </div>
            <button
              onClick={handleDownload}
              className="z-10 shrink-0 w-full md:w-auto px-6 py-3.5 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium rounded-xl transition-all shadow-[0_0_20px_-5px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_-5px_rgba(99,102,241,0.6)] flex items-center justify-center gap-2.5 group"
            >
              <Download className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
              Download Report (.pdf)
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
