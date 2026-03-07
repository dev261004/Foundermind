"use client"

import { useEffect } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  CircleAlert,
  Compass,
  Gauge,
  Layers3,
  RefreshCw,
  Sparkles,
  Target,
} from "lucide-react"
import { useRunStore } from "@/store/useRunStore"
import { useIdeaStore } from "@/store/useIdeaStore"
import { AgentAnalysisResponse, AgentExecutionLogEntry } from "@/types/analysis"
import styles from "./IdeaAnalysisPage.module.css"

interface Props {
  ideaId: string
}

const SECTION_CONFIG: Array<{
  key: keyof AgentAnalysisResponse["results"]
  title: string
  subtitle: string
}> = [
  {
    key: "similar_startups",
    title: "Comparable Startups",
    subtitle: "What adjacent companies suggest about positioning and competition.",
  },
  {
    key: "market_data",
    title: "Market Data",
    subtitle: "Evidence on TAM, growth, demand signals, and category size.",
  },
  {
    key: "funding_info",
    title: "Funding Landscape",
    subtitle: "Recent capital patterns and investor appetite around the space.",
  },
  {
    key: "monetization",
    title: "Monetization Strategy",
    subtitle: "Likely revenue paths the agent considers strongest for this idea.",
  },
  {
    key: "customer_profile",
    title: "Customer Profile",
    subtitle: "Who the product should target first and why they will care.",
  },
  {
    key: "tech_stack",
    title: "Suggested Tech Stack",
    subtitle: "Technical direction if the product has meaningful software depth.",
  },
  {
    key: "swot",
    title: "Strategic SWOT",
    subtitle: "A concise strategic read across strengths, risks, openings, and threats.",
  },
]

const LOADING_STAGES = [
  "Planner selecting tools",
  "Executor gathering signals",
  "Critic scoring quality",
  "Final synthesis",
]

export default function IdeaAnalysisPage({ ideaId }: Props) {
  const startAnalysis = useRunStore((state) => state.startAnalysis)
  const activeIdeaId = useRunStore((state) => state.activeIdeaId)
  const result = useRunStore((state) => state.result)
  const status = useRunStore((state) => state.status)
  const error = useRunStore((state) => state.error)
  const ideaInput = useIdeaStore((state) => state.ideaInput)

  useEffect(() => {
    if (activeIdeaId !== ideaId || status === "idle") {
      void startAnalysis(ideaId)
    }
  }, [activeIdeaId, ideaId, startAnalysis, status])

  const runTitle = ideaInput?.trim() || `Idea ${ideaId.slice(0, 8)}`

  return (
    <main className={styles.page}>
      <div className={styles.background} />

      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroPanel}>
            <span className={styles.eyebrow}>
              <Sparkles size={14} />
              FounderMind Agent Report
            </span>

            <h1 className={styles.title}>
              <span className={styles.gradientText}>{runTitle}</span>
            </h1>

            <p className={styles.description}>
              This page runs the planner, executor, and critic pipeline on the submitted idea
              and turns the backend response into a readable operator view. The analysis below is
              generated directly from the `run_analysis` output for idea id `{ideaId}`.
            </p>

            <div className={styles.heroActions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => void startAnalysis(ideaId, { force: true })}
                disabled={status === "running"}
              >
                <RefreshCw size={16} />
                {status === "running" ? "Running analysis" : "Run fresh analysis"}
              </button>

              <Link href="/submit" className={styles.secondaryAction}>
                Submit another idea
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className={styles.heroMetrics}>
            <MetricTile
              label="Run Status"
              value={capitalize(status)}
              hint="The route uses the current synchronous backend run endpoint."
            />
            <MetricTile
              label="Idea Type"
              value={result ? capitalize(result.idea_type) : "Pending"}
              hint="Classified by the orchestrator before tool execution starts."
            />
            <MetricTile
              label="Confidence"
              value={result ? formatScore(result.analysis_confidence, true) : "--"}
              hint="Blended from classification confidence and critic section scores."
            />
            <MetricTile
              label="Overall Score"
              value={result ? `${result.critique.overall_score}/10` : "--"}
              hint="The critic's aggregate quality score over the returned sections."
            />
          </div>
        </section>

        {(status === "idle" || status === "running") && <LoadingState />}
        {status === "failed" && <ErrorState message={error} onRetry={() => void startAnalysis(ideaId, { force: true })} />}
        {status === "completed" && result && <AnalysisContent result={result} />}
      </div>
    </main>
  )
}

function AnalysisContent({ result }: { result: AgentAnalysisResponse }) {
  const sectionEntries = SECTION_CONFIG.filter(({ key }) => {
    const value = result.results[key]
    return typeof value === "string" && value.trim().length > 0
  })

  const marketModelEntries = Object.entries(result.results.market_quantitative_model ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== "")

  return (
    <>
      <section className={styles.scoreGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Confidence Profile</h2>
              <span className={styles.cardSubtitle}>Top-level health of this generated report.</span>
            </div>
            <span className={styles.pill}>
              <Gauge size={14} />
              {formatScore(result.analysis_confidence, true)}
            </span>
          </div>

          <div className={styles.sectionList}>
            <ScoreBarRow label="Analysis confidence" value={result.analysis_confidence * 10} />
            <ScoreBarRow label="Classification confidence" value={result.classification_confidence * 10} />
            <ScoreBarRow label="Overall critic score" value={result.critique.overall_score} />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Section Scores</h2>
              <span className={styles.cardSubtitle}>How the critic rated each core workstream.</span>
            </div>
            <span className={styles.statusPill}>
              <Target size={14} />
              {result.critique.needs_rerun ? "Rerun suggested" : "Accepted"}
            </span>
          </div>

          <div className={styles.sectionList}>
            {Object.entries(result.critique.section_scores).map(([section, score]) => (
              <div key={section} className={styles.sectionScoreRow}>
                <span className={styles.sectionName}>{humanizeKey(section)}</span>
                <span className={styles.scoreBadge}>{score}/10</span>
                <div className={styles.scoreBar} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.scoreFill} style={{ width: `${Math.min(score * 10, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Critic Notes</h2>
              <span className={styles.cardSubtitle}>What the critic would improve or rerun.</span>
            </div>
            <span className={styles.pill}>
              <BrainCircuit size={14} />
              {capitalize(result.idea_type)}
            </span>
          </div>

          <div className={styles.issueList}>
            {(result.critique.issues_found.length > 0
              ? result.critique.issues_found
              : ["No material issues were flagged by the critic."]).map((issue) => (
              <div key={issue} className={styles.issue}>
                {issue}
              </div>
            ))}
          </div>

          {result.critique.rerun_tools.length > 0 && (
            <>
              <div className={styles.cardHeader} style={{ marginTop: 20, marginBottom: 12 }}>
                <div>
                  <h3 className={styles.cardTitle}>Suggested rerun tools</h3>
                </div>
              </div>
              <div className={styles.toolList}>
                {result.critique.rerun_tools.map((tool) => (
                  <span key={tool} className={styles.toolTag}>
                    {humanizeKey(tool)}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {marketModelEntries.length > 0 && (
        <section className={styles.marketGrid}>
          {marketModelEntries.map(([key, value]) => (
            <div key={key} className={styles.card}>
              <div className={styles.cardHeader}>
                <div>
                  <h2 className={styles.cardTitle}>{humanizeKey(key)}</h2>
                  <span className={styles.cardSubtitle}>Quantitative market model extracted from the market research step.</span>
                </div>
                <span className={styles.pill}>
                  <Compass size={14} />
                  Model
                </span>
              </div>
              <span className={styles.metricValue}>{formatMetricValue(key, value)}</span>
            </div>
          ))}
        </section>
      )}

      <section className={styles.resultGrid}>
        {sectionEntries.map(({ key, title, subtitle }) => (
          <article key={key} className={styles.card}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>{title}</h2>
                <span className={styles.cardSubtitle}>{subtitle}</span>
              </div>
              <span className={styles.statusPill}>
                <Layers3 size={14} />
                {humanizeKey(key)}
              </span>
            </div>

            <div className={styles.richContent}>
              <FormattedText text={String(result.results[key] ?? "")} />
            </div>
          </article>
        ))}
      </section>

      <section className={styles.timeline}>
        <div className={styles.cardHeader}>
          <div>
            <h2 className={styles.cardTitle}>Execution Timeline</h2>
            <span className={styles.cardSubtitle}>Backend planner, executor, and critic events in order.</span>
          </div>
          <span className={styles.pill}>
            <Activity size={14} />
            {result.execution_log.length} events
          </span>
        </div>

        <div className={styles.timelineList}>
          {result.execution_log.map((entry, index) => (
            <TimelineEntry key={`${entry.type ?? entry.tool ?? "event"}-${index}`} entry={entry} />
          ))}
        </div>
      </section>
    </>
  )
}

function LoadingState() {
  return (
    <section className={styles.loadingWrap}>
      <div className={styles.emptyState}>
        <div className={styles.loader} />
        <h2 className={styles.loadingTitle}>Running your startup analysis</h2>
        <p className={styles.loadingText}>
          The backend is executing the planner, research tools, and critic loop. This route is
          waiting for the live `run_analysis` response before rendering the final report.
        </p>
        <div className={styles.loadingStages}>
          {LOADING_STAGES.map((stage) => (
            <span key={stage} className={styles.stageChip}>
              {stage}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

function ErrorState({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <section className={styles.errorWrap}>
      <div className={styles.emptyState}>
        <CircleAlert size={42} />
        <h2 className={styles.errorTitle}>Analysis could not complete</h2>
        <p className={styles.errorText}>
          {message ?? "The backend returned an unexpected failure while processing this idea."}
        </p>
        <div className={styles.heroActions}>
          <button type="button" className={styles.primaryAction} onClick={onRetry}>
            <RefreshCw size={16} />
            Try again
          </button>
          <Link href="/submit" className={styles.secondaryAction}>
            Back to submit
          </Link>
        </div>
      </div>
    </section>
  )
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: string
}) {
  return (
    <div className={styles.metricTile}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricHint}>{hint}</span>
    </div>
  )
}

function ScoreBarRow({ label, value }: { label: string; value: number }) {
  const width = Math.max(0, Math.min(value * 10, 100))

  return (
    <div>
      <div className={styles.cardHeader} style={{ marginBottom: 10 }}>
        <span className={styles.sectionName}>{label}</span>
        <span className={styles.scoreBadge}>{value.toFixed(1)}</span>
      </div>
      <div className={styles.scoreBar}>
        <div className={styles.scoreFill} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function TimelineEntry({ entry }: { entry: AgentExecutionLogEntry }) {
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineDot}>
        <BrainCircuit size={18} />
      </div>
      <div className={styles.timelineBody}>
        <div className={styles.timelineHeading}>
          <span className={styles.timelineTitle}>{getTimelineTitle(entry)}</span>
          {entry.status && <span className={styles.statusPill}>{capitalize(entry.status)}</span>}
        </div>
        <p className={styles.timelineMeta}>{getTimelineDescription(entry)}</p>
      </div>
    </div>
  )
}

function FormattedText({ text }: { text: string }) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)
        const isList = lines.every((line) => /^([-*]|\d+\.)\s+/.test(line))

        if (isList) {
          return (
            <ul key={`${index}-${block.slice(0, 16)}`}>
              {lines.map((line) => (
                <li key={line}>{line.replace(/^([-*]|\d+\.)\s+/, "")}</li>
              ))}
            </ul>
          )
        }

        return <p key={`${index}-${block.slice(0, 16)}`}>{block}</p>
      })}
    </>
  )
}

function getTimelineTitle(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") return "Idea classification"
  if (entry.type === "self_healing_cycle") return `Self-healing cycle ${entry.iteration ?? ""}`.trim()
  if (entry.type === "convergence") return "Convergence decision"
  if (entry.tool) return humanizeKey(entry.tool)
  return "Agent event"
}

function getTimelineDescription(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") {
    return `Classified as ${entry.idea_type ?? "unknown"} using ${entry.classification_source ?? "unknown"} with confidence ${formatScore(entry.classification_confidence ?? 0, true)}.`
  }

  if (entry.type === "self_healing_cycle") {
    const reruns = entry.rerun_tools?.map(humanizeKey).join(", ") || "no tools"
    return `Critic requested another pass using: ${reruns}.`
  }

  if (entry.type === "convergence") {
    return entry.reason ?? "The orchestrator decided no further iterations were needed."
  }

  if (entry.tool) {
    if (entry.error) {
      return `${capitalize(entry.status ?? "failed")} while executing ${humanizeKey(entry.tool)}: ${entry.error}`
    }

    return `${capitalize(entry.status ?? "completed")} ${humanizeKey(entry.tool)}.`
  }

  return "Agent event recorded."
}

function formatScore(value: number, asPercent = false) {
  if (asPercent) {
    return `${Math.round(value * 100)}%`
  }

  return value.toFixed(1)
}

function humanizeKey(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase())
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatMetricValue(key: string, value: string | number | null | undefined) {
  if (typeof value !== "number") {
    return String(value ?? "--")
  }

  if (key.includes("score")) {
    return `${value}/10`
  }

  if (key.includes("cagr")) {
    return `${value}%`
  }

  if (key.includes("_usd")) {
    return `$${value}B`
  }

  return String(value)
}
