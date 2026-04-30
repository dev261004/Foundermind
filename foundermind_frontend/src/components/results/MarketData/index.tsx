"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  TrendingUp, 
  Target, 
  Zap, 
  ChevronDown, 
  Globe2,
  ShieldCheck, 
  Layers, 
  SignalHigh
} from "lucide-react"
import { MarketDataStructured, MarketQuantitativeModel, MarketResearchPoint } from "@/types/analysis"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketDataProps {
  text: string
  quantitativeModel: MarketQuantitativeModel | null
  structured?: MarketDataStructured | null
}

type TabKey = "market_drivers" | "target_segments" | "competitive_landscape" | "key_signals"

const TABS: { key: TabKey; label: string }[] = [
  { key: "market_drivers", label: "Market Drivers" },
  { key: "target_segments", label: "Target Segments" },
  { key: "competitive_landscape", label: "Competitive Landscape" },
  { key: "key_signals", label: "Key Signals" },
]

const SECTION_MARKERS: Record<TabKey, string[]> = {
  market_drivers: ["#### 2.", "market driver", "deepfake", "electoral", "corporate risk", "llm hallucination"],
  target_segments: ["#### 3.", "target audience", "customer segment", "b2c", "b2b", "b2g"],
  competitive_landscape: ["#### 4.", "competitive", "fact-check", "snopes", "newsguard"],
  key_signals: ["#### 5.", "swot", "strength", "weakness", "opportunity", "threat"],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBillions(value: number | undefined): string {
  if (value === undefined || value === null) return "--"
  return `$${value.toFixed(2).replace(/\.?0+$/, "")}B`
}

function formatCagr(value: number | undefined): string {
  if (value === undefined || value === null || !isFinite(value)) return "N/A"
  const pct = Math.abs(value) < 1 ? value * 100 : value
  return `${pct.toFixed(1)}%`
}

function formatCagrRaw(value: number | undefined): string {
  if (value === undefined || value === null || !isFinite(value)) return "N/A"
  const pct = Math.abs(value) < 1 ? value * 100 : value
  return pct.toFixed(1)
}

function parseMarkdownPoints(lines: string[]): MarketResearchPoint[] {
  const points: MarketResearchPoint[] = []
  for (const line of lines) {
    const cleaned = line.replace(/^[-*]\s+/, "").trim()
    const match = cleaned.match(/^\*{1,2}([^*:]+)\*{1,2}[:\s]+(.+)$/)
    if (match) {
      points.push({
        term: match[1].trim().replace(/\*\*/g, ""),
        detail: match[2].trim().replace(/\*\*/g, ""),
      })
    } else if (cleaned.length > 0 && !cleaned.startsWith("#")) {
      points.push({ term: "", detail: cleaned.replace(/\*\*/g, "") })
    }
  }
  return points
}

function extractSectionLines(text: string, tab: TabKey): string[] {
  const allLines = text.split("\n")
  const markers = SECTION_MARKERS[tab].map((m) => m.toLowerCase())

  let capturing = false
  const collected: string[] = []

  for (const line of allLines) {
    const lower = line.toLowerCase()

    if (!capturing) {
      if (markers.some((m) => lower.includes(m))) {
        capturing = true
        continue
      }
      continue
    }

    if (/^#{2,4}\s/.test(line.trim())) {
      break
    }

    collected.push(line)
  }

  return collected
}

function getTabPoints(text: string, structured: MarketDataStructured | null | undefined, tab: TabKey): MarketResearchPoint[] {
  if (structured?.[tab] && structured[tab].length > 0) {
    return structured[tab]
  }

  const lines = extractSectionLines(text, tab)
  return parseMarkdownPoints(lines)
}

// ─── Components ───────────────────────────────────────────────────────────────

const MarketSizingBar = ({ percent, label, value, description, colorClass }: { 
  percent: number; 
  label: string; 
  value: string; 
  description: string;
  colorClass: string;
}) => (
  <div className="flex items-start gap-8 mb-6">
    <div className="w-1/2">
      <div className="relative h-10 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          whileInView={{ width: `${percent}%` }}
          viewport={{ once: false }}
          transition={{ duration: 1, ease: "easeOut" }}
          className={`h-full flex items-center justify-center font-bold text-sm ${colorClass}`}
        >
          {percent}%
        </motion.div>
      </div>
    </div>
    <div className="w-1/2">
      <div className="flex items-baseline gap-2 mb-1">
        <span className="font-display font-bold text-lg uppercase tracking-wider">{label}</span>
        <span className="font-display font-medium text-lg text-[var(--color-accent-purple)]">{value}</span>
      </div>
      <p className="text-xs text-slate-400 mt-0.5 leading-tight">
        {description}
      </p>
    </div>
  </div>
);

const ScoreCard = ({ title, score, total = 10, innerSubtext, subtext, colorClass }: {
  title: string;
  score: number;
  total?: number;
  innerSubtext?: string;
  subtext: string;
  colorClass: string;
}) => (
  <div className="flex flex-col items-center justify-start text-center p-2 flex-1">
    <h3 className="text-sm font-semibold text-white mb-6 h-5">{title}</h3>
    <div className="relative w-32 h-16 mb-6">
      <svg className="w-full h-full overflow-visible" viewBox="0 0 100 50">
        <path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke="rgba(255,255,255,0.05)" 
          strokeWidth="12" 
          strokeLinecap="round"
        />
        <motion.path 
          d="M 10 50 A 40 40 0 0 1 90 50" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="12" 
          strokeLinecap="round"
          strokeDasharray="126"
          strokeDashoffset={126 - (126 * (score / total))}
          initial={{ strokeDashoffset: 126 }}
          whileInView={{ strokeDashoffset: 126 - (126 * (score / total)) }}
          viewport={{ once: false }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={colorClass}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-[-8px] flex flex-col items-center justify-end">
        <span className="text-3xl font-display font-bold text-white leading-none">{score % 1 === 0 ? score.toFixed(0) : score.toFixed(1)}</span>
        {innerSubtext && <span className="text-[10px] text-zinc-300 mt-1 leading-none">{innerSubtext}</span>}
      </div>
    </div>
    <p className="text-[10px] text-zinc-400 max-w-[140px] leading-relaxed">
      {subtext}
    </p>
  </div>
);

// ─── Main Export ──────────────────────────────────────────────────────────────

export function MarketDataHeader() {
  return (
    <summary className="flex justify-between items-center p-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
      <div className="flex flex-col gap-1.5">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-[20px] font-semibold tracking-tight text-white m-0 leading-tight"
        >
          Market Data
        </motion.h2>
        <motion.p 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="text-[#8f9cb4] text-[13px] leading-[1.5] m-0"
        >
          Evidence on TAM, growth, demand signals, and category size.
        </motion.p>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/25 min-w-[140px] justify-center">
          <TrendingUp size={14} />
          <span>Market</span>
        </div>
        <span className="inline-flex items-center justify-center w-[38px] h-[38px] rounded-xl bg-white/5 text-[#cbd5e5] transition-transform duration-[240ms] group-open:rotate-180 flex-shrink-0">
          <ChevronDown size={18} />
        </span>
      </div>
    </summary>
  )
}

export function MarketData({ text, quantitativeModel, structured }: MarketDataProps) {
  const [activeTabKey, setActiveTabKey] = useState<TabKey>("market_drivers");

  const tam = quantitativeModel?.tam_billion_usd ?? 0;
  const sam = quantitativeModel?.sam_billion_usd ?? 0;
  const som = quantitativeModel?.som_billion_usd ?? 0;
  
  const tamScore = quantitativeModel?.tam_score ?? 0;
  const cagrScore = quantitativeModel?.cagr_score ?? 0;
  const oppScore = quantitativeModel?.opportunity_score ?? 0;
  const cagr = quantitativeModel?.calculated_cagr;

  const samPercent = tam > 0 ? Math.round((sam / tam) * 100) : 65;
  const somPercent = tam > 0 ? Math.round((som / tam) * 100) : 35;

  const activePoints = getTabPoints(text, structured, activeTabKey);
  const activeTabLabel = TABS.find(t => t.key === activeTabKey)?.label;

  return (
    <>
      {/* Main Grid: Zone 1 */}
      <div className="flex flex-col xl:flex-row gap-6 items-start bg-white/[0.02] border border-white/[0.07] rounded-xl p-5 mb-8">
        
        {/* Market Sizing Section (.funnelCol) */}
        <div className="w-full xl:w-[55%] xl:flex-none">
         <h3 className="text-sm font-bold text-white mb-8">Market Sizing</h3>
          
          <MarketSizingBar 
            percent={100} 
            label="TAM" 
            value={quantitativeModel?.tam_billion_usd !== undefined ? formatBillions(quantitativeModel?.tam_billion_usd) : "--"} 
            description="Total Addressable Market. The full revenue opportunity if the category is fully captured."
            colorClass="gradient-purple-teal"
          />
          
          <MarketSizingBar 
            percent={samPercent} 
            label="SAM" 
            value={quantitativeModel?.sam_billion_usd !== undefined ? formatBillions(quantitativeModel?.sam_billion_usd) : "--"} 
            description="Serviceable Available Market. The share of TAM that fits this product and go-to-market scope."
            colorClass="bg-cyan-400 text-zinc-900"
          />
          
          <MarketSizingBar 
            percent={somPercent} 
            label="SOM" 
            value={quantitativeModel?.som_billion_usd !== undefined ? formatBillions(quantitativeModel?.som_billion_usd) : "--"} 
            description="Serviceable Obtainable Market. The near-term market share this startup could realistically win."
            colorClass="bg-emerald-400 text-zinc-900"
          />
        </div>

        {/* Scores Section (.gaugeCol) */}
        <div className="flex-1 flex flex-row gap-4 items-start justify-around flex-wrap lg:flex-nowrap w-full">
          <motion.div className="flex-1 flex" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false }} transition={{ delay: 0.3 }}>
            <ScoreCard 
              title="TAM Score" 
              score={tamScore} 
              innerSubtext="out of 10"
              subtext="A 10-point attractiveness score based on how large the total market opportunity is."
              colorClass="text-indigo-500"
            />
          </motion.div>
          
          <motion.div className="flex-1 flex" initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: false }} transition={{ delay: 0.4 }}>
            <ScoreCard 
              title="CAGR Score" 
              score={cagrScore} 
              innerSubtext="out of 10"
              subtext="A 10-point attractiveness score showing how favorable the market growth rate looks."
              colorClass="text-cyan-400"
            />
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }} 
            whileInView={{ opacity: 1, scale: 1 }} 
            viewport={{ once: false }}
            transition={{ delay: 0.5 }}
            className="flex flex-col items-center justify-start text-center p-2 flex-1"
          >
            <h3 className="text-sm font-semibold text-white mb-6 h-5">CAGR in %</h3>
          <div className="relative w-32 h-16 mb-6 flex items-center justify-center">
  <div className="flex flex-col items-center justify-center">
    <div className="text-4xl font-display font-bold text-emerald-400 leading-none">
      {cagr !== undefined ? formatCagr(cagr) : "N/A"}
    </div>
    <div className="text-xs text-white font-bold mt-1">
      CAGR
    </div>
  </div>
</div>
            <p className="text-[10px] text-zinc-400 leading-relaxed max-w-[140px]">Compound Annual Growth Rate. How fast the market is expected to grow year over year.</p>
          </motion.div>
        </div>
      </div>

      {/* Opportunity Score Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: false }}
        transition={{ delay: 0.6 }}
        className="bg-[var(--color-card-bg)] border border-white/5 rounded-2xl p-8 mb-8 overflow-hidden relative"
      >
        <div className="grid grid-cols-12 gap-8 items-center relative z-10">
          <div className="col-span-12 lg:col-span-3">
            <h3 className="text-xs uppercase tracking-widest text-white mb-2 font-bold">Opportunity Score</h3>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-6xl font-display font-bold text-white">{oppScore % 1 === 0 ? oppScore.toFixed(0) : oppScore.toFixed(1)}</span>
              <span className="text-xl text-zinc-500">/ 10</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 leading-tight">
              A blended 10-point signal combining market size and growth into one opportunity view.
            </p>
          </div>
          
          <div className="col-span-12 lg:col-span-9">
            <div className="relative h-3 w-full bg-white/5 rounded-full mb-8 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                whileInView={{ width: `${Math.min(100, oppScore * 10)}%` }}
                viewport={{ once: false }}
                transition={{ duration: 1.2, ease: "circOut" }}
                className="h-full gradient-purple-teal rounded-full shadow-[0_0_20px_rgba(139,92,246,0.5)]"
              />
            </div>
            
            <div className="flex flex-wrap gap-3">
              {cagr !== undefined && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-zinc-300">
                  <TrendingUp size={14} className="text-zinc-500" />
                  {formatCagrRaw(cagr)}% CAGR
                </div>
              )}
              {quantitativeModel?.tam_billion_usd !== undefined && (
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-zinc-300">
                  <Globe2 size={14} className="text-zinc-500" />
                  ${quantitativeModel.tam_billion_usd.toFixed(1)}B TAM
                </div>
              )}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-zinc-300">
                <Zap size={14} className="text-zinc-500" />
                High tailwind
              </div>
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full text-sm font-medium text-zinc-300">
                <Target size={14} className="text-zinc-500" />
                Multi-segment
              </div>
            </div>
          </div>
        </div>
        {/* Subtle background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-full bg-indigo-600/5 blur-[120px] pointer-events-none" />
      </motion.div>

      {/* Tabs & Content */}
      <section>
        <div className="flex border-b border-white/5 mb-8 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTabKey(tab.key)}
              className={`px-8 py-4 text-sm font-semibold tracking-wide whitespace-nowrap transition-all relative ${
                activeTabKey === tab.key ? 'text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.label}
              {activeTabKey === tab.key && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500"
                />
              )}
            </button>
          ))}
        </div>

        <div className="px-2">
          <AnimatePresence mode="wait">
            <motion.ul 
              key={activeTabKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {activePoints.length > 0 ? (
                activePoints.map((point, idx) => (
                  <li key={idx} className="flex gap-4 group">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-2 shrink-0 group-hover:scale-150 transition-transform" />
                    <div>
                      {point.term && (
                        <span className="font-bold text-zinc-200 group-hover:text-white transition-colors">{point.term}: </span>
                      )}
                      <span className="text-zinc-400 font-medium leading-relaxed">{point.detail}</span>
                    </div>
                  </li>
                ))
              ) : (
                <div className="text-zinc-600 italic py-10">Detailed analysis for {activeTabLabel} is not available.</div>
              )}
            </motion.ul>
          </AnimatePresence>
        </div>
      </section>

      {/* Footer / Decorative element */}
      <footer className="mt-20 pt-10 border-t border-white/5 flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-zinc-600 font-bold mb-6">
        <span>Strategic Market Overview</span>
        <div className="flex gap-4">
          <span className="flex items-center gap-1"><ShieldCheck size={10} /> Verified Data</span>
          <span className="flex items-center gap-1"><SignalHigh size={10} /> Live Category Signals</span>
        </div>
      </footer>
    </>
  )
}
