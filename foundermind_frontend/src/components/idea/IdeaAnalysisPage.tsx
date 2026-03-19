"use client"

import { Fragment, ReactNode, useEffect } from "react"
import Link from "next/link"
import {
  Activity,
  ArrowRight,
  BrainCircuit,
  ChevronDown,
  CircleAlert,
  ExternalLink,
  Layers3,
  RefreshCw,
  Sparkles,
} from "lucide-react"
import { useRunStore } from "@/store/useRunStore"
import { useIdeaStore } from "@/store/useIdeaStore"
import { AgentAnalysisResponse, AgentExecutionLogEntry } from "@/types/analysis"
import styles from "./IdeaAnalysisPage.module.css"

interface Props {
  ideaId: string
}

type ResearchSectionKey = "similar_startups" | "funding_info"

interface ResearchFeedItem {
  id: string
  label: string
  title: string
  summary: string
  sourceLabel?: string
  domain?: string
  url?: string
}

const SECTION_CONFIG: Array<{
  key: keyof AgentAnalysisResponse["results"]
  title: string
  subtitle: string
  pill: string
}> = [
  {
    key: "similar_startups",
    title: "Comparable Startups",
    subtitle: "What adjacent companies suggest about positioning and competition.",
    pill: "Research",
  },
  {
    key: "market_data",
    title: "Market Data",
    subtitle: "Evidence on TAM, growth, demand signals, and category size.",
    pill: "Market",
  },
  {
    key: "funding_info",
    title: "Funding Landscape",
    subtitle: "Recent capital patterns and investor appetite around the space.",
    pill: "Funding",
  },
  {
    key: "monetization",
    title: "Monetization Strategy",
    subtitle: "Likely revenue paths the agent considers strongest for this idea.",
    pill: "Revenue",
  },
  {
    key: "customer_profile",
    title: "Customer Profile",
    subtitle: "Who the product should target first and why they will care.",
    pill: "Customer",
  },
  {
    key: "tech_stack",
    title: "Suggested Tech Stack",
    subtitle: "Technical direction if the product has meaningful software depth.",
    pill: "Tech",
  },
  {
    key: "swot",
    title: "Strategic SWOT",
    subtitle: "A concise strategic read across strengths, risks, openings, and threats.",
    pill: "Swot",
  },
]

const LOADING_STAGES = [
  "Planner selecting tools",
  "Executor gathering signals",
  "Critic scoring quality",
  "Final synthesis",
]

const MARKET_MODEL_CONFIG: Record<
  string,
  { title: string; description: string; kind?: "currency" | "percent" | "score" }
> = {
  tam_billion_usd: {
    title: "TAM",
    description: "Total Addressable Market. The full revenue opportunity if the category is fully captured.",
    kind: "currency",
  },
  sam_billion_usd: {
    title: "SAM",
    description: "Serviceable Available Market. The share of TAM that fits this product and go-to-market scope.",
    kind: "currency",
  },
  som_billion_usd: {
    title: "SOM",
    description: "Serviceable Obtainable Market. The near-term market share this startup could realistically win.",
    kind: "currency",
  },
  calculated_cagr: {
    title: "Calculated CAGR",
    description: "Compound Annual Growth Rate. How fast the market is expected to grow year over year.",
    kind: "percent",
  },
  tam_score: {
    title: "TAM Score",
    description: "A 10-point attractiveness score based on how large the total market opportunity is.",
    kind: "score",
  },
  cagr_score: {
    title: "CAGR Score",
    description: "A 10-point score showing how favorable the market growth rate looks.",
    kind: "score",
  },
  opportunity_score: {
    title: "Opportunity Score",
    description: "A blended 10-point signal combining market size and growth into one opportunity view.",
    kind: "score",
  },
}

export default function IdeaAnalysisPage({ ideaId }: Props) {
  const startAnalysis = useRunStore((state) => state.startAnalysis)
  const activeIdeaId = useRunStore((state) => state.activeIdeaId)
  const result = useRunStore((state) => state.result)
  const executionLog = useRunStore((state) => state.executionLog)
  const status = useRunStore((state) => state.status)
  const error = useRunStore((state) => state.error)
  const ideaInput = useIdeaStore((state) => state.ideaInput)

  useEffect(() => {
    if (activeIdeaId !== ideaId || status === "idle") {
      void startAnalysis(ideaId)
    }
  }, [activeIdeaId, ideaId, startAnalysis, status])

  const runTitle = ideaInput?.trim() || `Idea ${ideaId.slice(0, 8)}`
  const ideaType = result ? capitalize(result.idea_type) : "Pending"

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
              hint="Live status updates while analysis is being generated."
            />
            <MetricTile
              label="Idea Type"
              value={ideaType}
              hint="Classified before the tool pipeline starts."
            />
          </div>
        </section>

        {(status === "idle" || status === "running") && <LoadingState executionLog={executionLog} />}
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
    <div className={styles.sectionStack}>
      {sectionEntries.map(({ key, title, subtitle, pill }) => {
        if (key === "market_data") {
          return (
            <DrawerSection
              key={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              defaultOpen
            >
              <MarketDataContent
                text={String(result.results.market_data ?? "")}
                marketModelEntries={marketModelEntries}
              />
            </DrawerSection>
          )
        }

        return (
          <DrawerSection
            key={key}
            title={title}
            subtitle={subtitle}
            pill={pill}
            defaultOpen
          >
            {key === "similar_startups" || key === "funding_info" ? (
              <ResearchFeedSection
                sectionKey={key}
                text={String(result.results[key] ?? "")}
              />
            ) : (
              <SectionRenderer sectionKey={key} text={String(result.results[key] ?? "")} />
            )}
          </DrawerSection>
        )
      })}

    </div>
  )
}

function DrawerSection({
  title,
  subtitle,
  pill,
  defaultOpen,
  children,
}: {
  title: string
  subtitle: string
  pill: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className={styles.drawer} open={defaultOpen}>
      <summary className={styles.drawerSummary}>
        <div className={styles.drawerHeading}>
          <div>
            <h2 className={styles.cardTitle}>{title}</h2>
            <span className={styles.cardSubtitle}>{subtitle}</span>
          </div>
          <span className={styles.statusPill}>
            <Layers3 size={14} />
            {pill}
          </span>
        </div>
        <span className={styles.drawerToggle}>
          <ChevronDown size={18} />
        </span>
      </summary>
      <div className={styles.drawerBody}>{children}</div>
    </details>
  )
}

function MarketDataContent({
  text,
  marketModelEntries,
}: {
  text: string
  marketModelEntries: Array<[string, string | number]>
}) {
  const groups = parseStructuredGroups(text)

  return (
    <div className={styles.marketLayout}>
      {marketModelEntries.length > 0 && (
        <section className={styles.marketGrid}>
          {marketModelEntries.map(([key, value]) => {
            const config = MARKET_MODEL_CONFIG[key] ?? {
              title: humanizeKey(key),
              description: "Quantitative market signal extracted from the market analysis.",
            }

            return (
              <div key={key} className={styles.marketMetricCard}>
                <span className={styles.marketMetricLabel}>{config.title}</span>
                <strong className={styles.marketMetricValue}>
                  {formatMetricValue(key, value, config.kind)}
                </strong>
                <p className={styles.marketMetricDescription}>{config.description}</p>
              </div>
            )
          })}
        </section>
      )}

      {groups.length > 0 ? (
        <div className={styles.rowStack}>
          {groups.map((group, index) => (
            <SectionRow
              key={`${group.title}-${index}`}
              label={group.title}
              content={<StructuredText text={group.content.join("\n")} />}
            />
          ))}
        </div>
      ) : (
        <div className={styles.narrativePanel}>
          <StructuredText text={text} />
        </div>
      )}
    </div>
  )
}

function SectionRenderer({
  sectionKey,
  text,
}: {
  sectionKey: keyof AgentAnalysisResponse["results"]
  text: string
}) {
  if (sectionKey === "swot") {
    return <SwotGrid text={text} />
  }

  const groups = parseStructuredGroups(text)

  if (groups.length > 0) {
    return (
      <div className={styles.rowStack}>
        {groups.map((group, index) => (
          <SectionRow
            key={`${group.title}-${index}`}
            label={group.title}
            content={<StructuredText text={group.content.join("\n")} />}
          />
        ))}
      </div>
    )
  }

  const blocks = splitBlocks(text)
  if (blocks.length > 1) {
    return (
      <div className={styles.rowStack}>
        {blocks.map((block, index) => (
          <SectionRow
            key={`${sectionKey}-${index}`}
            label={getBlockLabel(sectionKey, block, index)}
            content={<StructuredText text={block} />}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={styles.narrativePanel}>
      <StructuredText text={text} />
    </div>
  )
}

function ResearchFeedSection({
  sectionKey,
  text,
}: {
  sectionKey: ResearchSectionKey
  text: string
}) {
  const items = parseResearchFeed(sectionKey, text)

  if (items.length === 0) {
    return (
      <div className={styles.narrativePanel}>
        <StructuredText text={text} />
      </div>
    )
  }

  return (
    <div className={styles.researchFeed}>
      {items.map((item, index) => (
        <article key={item.id} className={styles.researchRow}>
          <div className={styles.researchIndex}>
            <span className={styles.researchIndexNumber}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.researchBadge}>{item.label}</span>
          </div>

          <div className={styles.researchMain}>
            <div className={styles.researchHeader}>
              <div className={styles.researchTitleWrap}>
                <h3 className={styles.researchTitle}>{item.title}</h3>
                {item.sourceLabel && <span className={styles.researchSource}>{item.sourceLabel}</span>}
              </div>

              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.researchLink}
                >
                  Open source
                  <ExternalLink size={14} />
                </a>
              )}
            </div>

            {item.summary && <p className={styles.researchSummary}>{item.summary}</p>}
          </div>
        </article>
      ))}
    </div>
  )
}

function SectionRow({
  label,
  content,
}: {
  label: string
  content: ReactNode
}) {
  return (
    <div className={styles.sectionRow}>
      <div className={styles.sectionRail}>
        <span className={styles.sectionRailLabel}>{label}</span>
      </div>
      <div className={styles.sectionContent}>{content}</div>
    </div>
  )
}

function SwotGrid({ text }: { text: string }) {
  const groups = parseStructuredGroups(text)
  const normalizedGroups = ["Strengths", "Weaknesses", "Opportunities", "Threats"]
    .map((label) => {
      const match = groups.find((group) => {
        const normalized = group.title.toLowerCase()
        return normalized.includes(label.toLowerCase()) || normalized.includes(label.toLowerCase().slice(0, -1))
      })
      return match ? { ...match, title: label } : null
    })
    .filter(Boolean) as Array<{ title: string; content: string[] }>

  if (normalizedGroups.length === 0) {
    return (
      <div className={styles.narrativePanel}>
        <StructuredText text={text} />
      </div>
    )
  }

  return (
    <div className={styles.swotGrid}>
      {normalizedGroups.map((group) => (
        <div key={group.title} className={styles.swotCard}>
          <span className={styles.swotLabel}>{group.title}</span>
          <StructuredText text={group.content.join("\n")} />
        </div>
      ))}
    </div>
  )
}

function StructuredText({ text }: { text: string }) {
  const blocks = splitBlocks(text)

  return (
    <>
      {blocks.map((block, index) => {
        const lines = block.split("\n").map((line) => line.trim()).filter(Boolean)
        const listLines = lines.filter((line) => /^([-*]|\d+\.)\s+/.test(line))

        if (lines.length > 0 && listLines.length >= Math.max(1, Math.ceil(lines.length / 2))) {
          return (
            <ul key={`${index}-${block.slice(0, 16)}`} className={styles.structuredList}>
              {lines.map((line) => (
                <li key={line}>{renderInlineText(cleanListPrefix(line))}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={`${index}-${block.slice(0, 16)}`} className={styles.structuredParagraph}>
            {renderInlineText(block)}
          </p>
        )
      })}
    </>
  )
}

function LoadingState({ executionLog }: { executionLog: AgentExecutionLogEntry[] }) {
  return (
    <section className={styles.loadingWrap}>
      <div className={styles.emptyState}>
        <div className={styles.loader} />
        <h2 className={styles.loadingTitle}>Running your startup analysis</h2>
        <p className={styles.loadingText}>
          The backend is executing the planner, research tools, and critic loop. Progress appears
          below as each step completes, and the final report replaces this view automatically.
        </p>
        <div className={styles.loadingStages}>
          {LOADING_STAGES.map((stage) => (
            <span key={stage} className={styles.stageChip}>
              {stage}
            </span>
          ))}
        </div>

        {executionLog.length > 0 && (
          <section className={styles.loadingTimeline}>
            <div className={styles.cardHeader}>
              <div>
                <h2 className={styles.cardTitle}>Execution Timeline</h2>
                <span className={styles.cardSubtitle}>
                  Live tool progress while your analysis is being generated.
                </span>
              </div>
              <span className={styles.pill}>
                <Activity size={14} />
                {executionLog.length} events
              </span>
            </div>

            <div className={styles.timelineList}>
              {executionLog.map((entry, index) => (
                <TimelineEntry key={`${entry.type ?? entry.tool ?? "event"}-${index}`} entry={entry} />
              ))}
            </div>
          </section>
        )}
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

function getTimelineTitle(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") return "Idea classification"
  if (entry.type === "self_healing_cycle") return `Self-healing cycle ${entry.iteration ?? ""}`.trim()
  if (entry.type === "convergence") return "Convergence decision"
  if (entry.tool) return humanizeKey(entry.tool)
  return "Agent event"
}

function getTimelineDescription(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") {
    return `Classified as ${entry.idea_type ?? "general"} using ${entry.classification_source ?? "unknown"} with confidence ${formatScore(entry.classification_confidence ?? 0, true)}.`
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

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean)
}

function parseStructuredGroups(text: string) {
  const lines = text.split("\n").map((line) => line.trim())
  const groups: Array<{ title: string; content: string[] }> = []
  let currentGroup: { title: string; content: string[] } | null = null

  for (const line of lines) {
    if (!line) {
      continue
    }

    const headingMatch = line.match(/^(?:[-*]\s*)?\*{0,2}([^:*]+?)\*{0,2}:\s*(.*)$/)
    if (headingMatch) {
      if (currentGroup) {
        groups.push(currentGroup)
      }

      currentGroup = {
        title: headingMatch[1].trim(),
        content: headingMatch[2] ? [headingMatch[2].trim()] : [],
      }
      continue
    }

    if (currentGroup) {
      currentGroup.content.push(line)
    }
  }

  return groups.filter((group) => group.content.length > 0)
}

function cleanListPrefix(line: string) {
  return line.replace(/^([-*]|\d+\.)\s+/, "").trim()
}

function getBlockLabel(
  sectionKey: keyof AgentAnalysisResponse["results"],
  block: string,
  index: number
) {
  const firstLine = block.split("\n").map((line) => cleanListPrefix(line.trim())).find(Boolean)
  if (!firstLine) {
    return `${humanizeKey(String(sectionKey))} ${index + 1}`
  }

  const explicit = firstLine.match(/^\*{0,2}([^:*]{2,80})\*{0,2}:\s*/)
  if (explicit) {
    return explicit[1].trim()
  }

  const sentence = firstLine.split(/[.!?]/)[0]?.trim()
  if (sentence && sentence.length <= 42) {
    return sentence
  }

  return `${humanizeKey(String(sectionKey))} ${index + 1}`
}

function renderInlineText(text: string) {
  const parts = text
    .split(/(\*\*[^*]+\*\*|https?:\/\/[^\s)]+|www\.[^\s)]+)/g)
    .filter(Boolean)

  return parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }

    if (/^(https?:\/\/|www\.)/i.test(part)) {
      const href = part.startsWith("http") ? part : `https://${part}`

      return (
        <a
          key={`${href}-${index}`}
          href={href}
          target="_blank"
          rel="noreferrer"
          className={styles.inlineLink}
        >
          {part}
          <ExternalLink size={14} />
        </a>
      )
    }

    return <Fragment key={`${part}-${index}`}>{part}</Fragment>
  })
}

function formatScore(value: number, asPercent = false) {
  const safeValue = Number.isFinite(value) ? value : 0

  if (asPercent) {
    return `${Math.round(safeValue * 100)}%`
  }

  return safeValue.toFixed(1)
}

function humanizeKey(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase())
}

function capitalize(value?: string | null) {
  if (!value) {
    return "General"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatMetricValue(
  key: string,
  value: string | number | null | undefined,
  kind?: "currency" | "percent" | "score"
) {
  if (typeof value !== "number") {
    return String(value ?? "--")
  }

  const safeValue = Number.isFinite(value) ? value : 0

  if (kind === "score" || key.includes("score")) {
    return `${safeValue}/10`
  }

  if (kind === "percent" || key.includes("cagr")) {
    return `${safeValue}%`
  }

  if (kind === "currency" || key.includes("_usd")) {
    return `$${safeValue}B`
  }

  return String(safeValue)
}

function parseResearchFeed(sectionKey: ResearchSectionKey, text: string) {
  const blocks = splitBlocks(text)
  const items = blocks
    .map((block, index) => parseResearchBlock(sectionKey, block, index))
    .filter((item): item is ResearchFeedItem => Boolean(item))

  const deduped = new Map<string, ResearchFeedItem>()

  for (const item of items) {
    const key = item.url || item.domain || `${item.title}::${item.summary}`
    if (!deduped.has(key)) {
      deduped.set(key, item)
    }
  }

  return Array.from(deduped.values()).slice(0, 5)
}

function parseResearchBlock(
  sectionKey: ResearchSectionKey,
  block: string,
  index: number
) {
  const normalizedBlock = block.replace(/\r/g, "").trim()
  if (!normalizedBlock) {
    return null
  }

  const lines = normalizedBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(cleanListPrefix)

  const url = extractFirstUrl(normalizedBlock)
  const nonUrlLines = lines.filter((line) => !looksLikeRawUrl(line))

  const headingMatch = normalizedBlock.match(/^\*{0,2}([^:\n]{3,100})\*{0,2}:\s*(.+)$/m)
  let title = headingMatch?.[1]?.trim() || ""
  let summary = headingMatch?.[2]?.trim() || ""

  if (isLowSignalResearchText(title)) {
    title = ""
  }

  if (isLowSignalResearchText(summary)) {
    summary = ""
  }

  if (!title) {
    title = chooseResearchTitle(sectionKey, nonUrlLines)
  }

  if (!summary) {
    summary = chooseResearchSummary(nonUrlLines, title)
  }

  if (isLowSignalResearchText(title)) {
    title = ""
  }

  const sourceLabel = inferSourceLabel(nonUrlLines, title, summary)
  const domain = extractDomain(url)
  const label = domain || `source ${String(index + 1).padStart(2, "0")}`

  if (!title && !summary && !url) {
    return null
  }

  return {
    id: `${sectionKey}-${index}-${title || domain || "item"}`,
    label,
    title: title || sourceLabel || domain || `${sectionKey === "similar_startups" ? "Comparable startup" : "Funding signal"} ${index + 1}`,
    summary,
    sourceLabel,
    domain,
    url,
  }
}

function chooseResearchTitle(sectionKey: ResearchSectionKey, lines: string[]) {
  if (lines.length === 0) {
    return ""
  }

  const firstDescriptiveLine = lines.find((line) => {
    const cleaned = line.replace(/\*\*/g, "").trim()
    return cleaned.length > 6 && !isLowSignalResearchText(cleaned)
  }) || ""

  const pipeSplit = firstDescriptiveLine.split("|").map((part) => part.trim()).filter(Boolean)
  if (pipeSplit.length >= 2) {
    return isLowSignalResearchText(pipeSplit[0]) ? pipeSplit[1] ?? "" : pipeSplit[0]
  }

  const sentence = firstDescriptiveLine.replace(/\*\*/g, "").split(/[.!?]/)[0]?.trim() || ""
  if (sentence.length > 0 && sentence.length <= 90 && !isLowSignalResearchText(sentence)) {
    return sentence
  }

  return sectionKey === "similar_startups" ? "Comparable company signal" : "Funding activity signal"
}

function chooseResearchSummary(lines: string[], title: string) {
  const cleanedLines = lines
    .map((line) => line.replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .filter((line) => line !== title)
    .filter((line) => !isLowSignalResearchText(line))

  if (cleanedLines.length === 0) {
    return ""
  }

  const joined = cleanedLines.join(" ")
  const singleLine = joined.replace(/\s+/g, " ").trim()
  return singleLine.length > 110 ? `${singleLine.slice(0, 107).trim()}...` : singleLine
}

function inferSourceLabel(lines: string[], title: string, summary: string) {
  const candidates = [title, ...lines, summary]
    .map((value) => value.replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .filter((value) => !isLowSignalResearchText(value))

  const sourceCandidate = candidates.find((value) => value.includes("|"))
  if (sourceCandidate) {
    return sourceCandidate
  }

  return candidates.find((value) => value.length <= 80 && /[A-Z]/.test(value))
}

function extractFirstUrl(text: string) {
  const match = text.match(/(?:https?:\/\/|\/\/|www\.)[^\s)]+/i)
  if (!match) {
    return undefined
  }

  const raw = match[0].replace(/[),.;]+$/, "")
  if (raw.startsWith("//")) {
    return `https:${raw}`
  }

  if (raw.startsWith("www.")) {
    return `https://${raw}`
  }

  return raw
}

function extractDomain(url?: string) {
  if (!url) {
    return undefined
  }

  try {
    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, "")
  } catch {
    return undefined
  }
}

function looksLikeRawUrl(line: string) {
  return /^(?:https?:\/\/|\/\/|www\.)/i.test(line.trim())
}

function isLowSignalResearchText(value?: string) {
  if (!value) {
    return true
  }

  const normalized = value
    .replace(/\*\*/g, "")
    .replace(/^[\-:|]+|[\-:|]+$/g, "")
    .trim()
    .toLowerCase()

  if (!normalized) {
    return true
  }

  return [
    "companies to watch",
    "company to watch",
    "https",
    "http",
    "https:",
    "http:",
    "home",
    "website",
    "source",
  ].includes(normalized)
}
