"use client";

import { ReactNode, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Banknote,
  BrainCircuit,
  Building2,
  ChevronDown,
  Circle,
  CircleAlert,
  Code2,
  ExternalLink,
  Globe,
  Layers3,
  Newspaper,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";
import { useRunStore } from "@/store/useRunStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import {
  AgentAnalysisResponse,
  AgentExecutionLogEntry,
  MonetizationStrategyItem,
  SimilarStartup,
  SimilarStartupIconType,
} from "@/types/analysis";
import { MarketData, MarketDataHeader } from "@/components/results/MarketData";
import { MarketDataEmpty } from "@/components/results/MarketData/MarketDataEmpty";
import { MonetizationStrategy } from "@/components/results/MonetizationStrategy";
import { MonetizationEmpty } from "@/components/results/MonetizationStrategy/MonetizationEmpty";
import { StrategicSWOT } from "@/components/results/StrategicSWOT";
import { SWOTEmpty } from "@/components/results/StrategicSWOT/SWOTEmpty";
import { ComparableStartups } from "@/components/results/ComparableStartups";
import { ComparableStartupsEmpty } from "@/components/results/ComparableStartups/ComparableStartupsEmpty";
import type { SWOTAnalysis } from "@/types/analysis";
import styles from "./IdeaAnalysisPage.module.css";

interface Props {
  ideaId: string;
}

type ResearchSectionKey = "similar_startups" | "funding_info";

interface ResearchFeedItem {
  id: string;
  label: string;
  title: string;
  summary: string;
  sourceLabel?: string;
  domain?: string;
  url?: string;
}

const SECTION_CONFIG: Array<{
  key: keyof AgentAnalysisResponse["results"];
  title: string;
  subtitle: string;
  pill: string;
}> = [
  {
    key: "similar_startups",
    title: "Comparable Startups",
    subtitle:
      "What adjacent companies suggest about positioning and competition.",
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
    subtitle:
      "Likely revenue paths the agent considers strongest for this idea.",
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
    subtitle:
      "Technical direction if the product has meaningful software depth.",
    pill: "Tech",
  },
  {
    key: "swot",
    title: "Strategic SWOT",
    subtitle:
      "A concise strategic read across strengths, risks, openings, and threats.",
    pill: "Swot",
  },
];

const LOADING_STAGES = [
  "Planner selecting tools",
  "Executor gathering signals",
  "Critic scoring quality",
  "Final synthesis",
];

const SIMILAR_STARTUP_ICON_MAP: Record<SimilarStartupIconType, typeof Shield> = {
  shield: Shield,
  newspaper: Newspaper,
  building: Building2,
  circle: Circle,
  globe: Globe,
  code: Code2,
  chart: BarChart3,
  bolt: Zap,
};

export default function IdeaAnalysisPage({ ideaId }: Props) {
  const startAnalysis = useRunStore((state) => state.startAnalysis);
  const activeIdeaId = useRunStore((state) => state.activeIdeaId);
  const result = useRunStore((state) => state.result);
  const executionLog = useRunStore((state) => state.executionLog);
  const status = useRunStore((state) => state.status);
  const error = useRunStore((state) => state.error);
  const ideaInput = useIdeaStore((state) => state.ideaInput);

  useEffect(() => {
    if (activeIdeaId !== ideaId || status === "idle") {
      void startAnalysis(ideaId);
    }
  }, [activeIdeaId, ideaId, startAnalysis, status]);

  const runTitle = ideaInput?.trim() || `Idea ${ideaId.slice(0, 8)}`;
  const ideaType = result ? capitalize(result.idea_type) : "Pending";
  const runStatusLabel = formatRunStatus(status);

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
                {status === "running"
                  ? "Running analysis"
                  : "Run fresh analysis"}
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
              value={runStatusLabel}
              hint="Live status updates while analysis is being generated."
            />
            <MetricTile
              label="Idea Type"
              value={ideaType}
              hint="Classified before the tool pipeline starts."
            />
          </div>
        </section>

        {(status === "idle" || status === "running") && (
          <LoadingState executionLog={executionLog} />
        )}
        {status === "failed" && (
          <ErrorState
            message={error}
            onRetry={() => void startAnalysis(ideaId, { force: true })}
          />
        )}
        {status === "quota_exhausted" && !result && (
          <ErrorState
            message={
              error ??
              "Analysis paused — quota reached. Retry after rate limit resets."
            }
            onRetry={() => void startAnalysis(ideaId, { force: true })}
          />
        )}
        {(status === "completed" ||
          status === "partial" ||
          status === "quota_exhausted") &&
          result && (
            <AnalysisContent
              result={result}
              status={status}
              bannerMessage={error}
            />
          )}
      </div>
    </main>
  );
}

function AnalysisContent({
  result,
  status,
  bannerMessage,
}: {
  result: AgentAnalysisResponse;
  status: "completed" | "partial" | "quota_exhausted";
  bannerMessage?: string | null;
}) {
  const ideaInput = useIdeaStore((state) => state.ideaInput);
  const runTitle = ideaInput?.trim() || `Idea ${(result.idea_id ?? "").slice(0, 8)}`;
  const showIncompleteSections =
    status === "partial" || status === "quota_exhausted";
  const sectionEntries = showIncompleteSections
    ? SECTION_CONFIG
    : SECTION_CONFIG.filter(({ key }) => {
        const value = result.results[key];
        if (key === "similar_startups" || key === "market_data" || key === "monetization" || key === "swot") {
          return true; // Always render these sections as they have dedicated empty states
        }
        return typeof value === "string" && value.trim().length > 0;
      });

  return (
    <div className={styles.sectionStack}>
      {status !== "completed" && (
        <StatusBanner
          status={status}
          message={
            bannerMessage ??
            (status === "partial"
              ? "Some sections are incomplete due to API errors. Available sections are shown below."
              : "Analysis paused — quota reached. Saved sections are shown below, and missing sections can be retried later.")
          }
        />
      )}

      {result.report_summary && (
        <section className={styles.summaryPanel}>
          <div className={styles.cardHeader}>
            <div>
              <h2 className={styles.cardTitle}>Executive Summary</h2>
              <span className={styles.cardSubtitle}>
                Reporter synthesis built from the sections the agent could
                recover.
              </span>
            </div>
            <span className={styles.pill}>
              <Sparkles size={14} />
              Reporter
            </span>
          </div>
          <div className={styles.narrativePanel}>
            <ReactMarkdown>{result.report_summary}</ReactMarkdown>
          </div>
        </section>
      )}

      {sectionEntries.map(({ key, title, subtitle, pill }) => {
        const rawValue = result.results[key];
        const rawString = typeof rawValue === "string" ? rawValue.trim() : "";
        const hasContent = rawString.length > 0;

        if (key === "similar_startups") {
          const startups: SimilarStartup[] = Array.isArray(rawValue) ? rawValue as SimilarStartup[] : [];
          
          if (!Array.isArray(rawValue)) {
             return (
              <DrawerSection
                key={key}
                title={title}
                subtitle={subtitle}
                pill={pill}
                defaultOpen
              >
                <ComparableStartupsEmpty />
              </DrawerSection>
             );
          }

          return (
            <DrawerSection
              key={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              defaultOpen
            >
              {startups.length > 0 ? (
                <ComparableStartups startups={startups} />
              ) : (
                <ComparableStartupsEmpty />
              )}
            </DrawerSection>
          );
        }

        if (key === "market_data") {
          const hasQuantModel = !!(
            result.results.market_quantitative_model &&
            Object.keys(result.results.market_quantitative_model).length > 0
          );
          const hasText = rawString.length > 0;
          const hasAnyData = hasQuantModel || hasText;

          return (
            <details key={key} className={`${styles.drawer} group`} open={true}>
              <MarketDataHeader />
              <div className="w-full selection:bg-cyan-500/30 px-6 pb-6">
                {hasAnyData ? (
                  <MarketData
                    text={rawString}
                    quantitativeModel={
                      result.results.market_quantitative_model ?? null
                    }
                    structured={result.results.market_data_structured ?? null}
                  />
                ) : (
                  <MarketDataEmpty />
                )}
              </div>
            </details>
          );
        }

        if (key === "monetization") {
          const rawMonetization = result.results.monetization;
          const strategies: MonetizationStrategyItem[] = Array.isArray(
            rawMonetization,
          )
            ? (rawMonetization as MonetizationStrategyItem[])
            : [];

          return (
            <DrawerSection
              key={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              pillElement={
                <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 bg-purple-900/30 text-purple-400 rounded border border-purple-800/50">
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Revenue</span>
                </div>
              }
              defaultOpen
              countLabel={
                strategies.length > 0
                  ? `${strategies.length} strategies`
                  : undefined
              }
            >
              {strategies.length > 0 ? (
                <MonetizationStrategy strategies={strategies} />
              ) : (
                <MonetizationEmpty />
              )}
            </DrawerSection>
          );
        }

        if (key === "swot") {
          const rawSwot = result.results.swot;
          const isStructured =
            rawSwot != null &&
            typeof rawSwot === "object" &&
            !Array.isArray(rawSwot) &&
            "strengths" in rawSwot;

          if (!isStructured) {
            return (
              <DrawerSection
                key={key}
                title={title}
                subtitle={subtitle}
                pill={pill}
                defaultOpen
              >
                <SWOTEmpty />
              </DrawerSection>
            );
          }

          return (
            <div key={key} className={`${styles.drawer} mb-6`}>
              <StrategicSWOT
                swot={rawSwot as SWOTAnalysis}
                ideaName={runTitle}
              />
            </div>
          );
        }

        let isContentUnavailable = !hasContent;
        if (key === "funding_info") {
          if (!rawString || rawString === "No funding info found.") {
            isContentUnavailable = true;
          }
        }

        if (isContentUnavailable && !showIncompleteSections) {
          return null;
        }

        return (
          <DrawerSection
            key={key}
            title={title}
            subtitle={subtitle}
            pill={pill}
            defaultOpen
          >
            {isContentUnavailable ? (
              <UnavailableSection sectionTitle={title} />
            ) : key === "funding_info" ? (
              <ResearchFeedSection
                sectionKey={key}
                text={String(result.results[key] ?? "")}
              />
            ) : (
              <SectionRenderer
                text={String(result.results[key] ?? "")}
              />
            )}
          </DrawerSection>
        );
      })}
    </div>
  );
}

function StatusBanner({
  status,
  message,
}: {
  status: "partial" | "quota_exhausted";
  message: string;
}) {
  const bannerClass =
    status === "partial"
      ? styles.statusBannerPartial
      : styles.statusBannerQuota;

  return (
    <section className={`${styles.statusBanner} ${bannerClass}`}>
      <div className={styles.statusBannerIcon}>
        <CircleAlert size={18} />
      </div>
      <div>
        <h2 className={styles.statusBannerTitle}>{formatRunStatus(status)}</h2>
        <p className={styles.statusBannerText}>{message}</p>
      </div>
    </section>
  );
}

function UnavailableSection({ sectionTitle }: { sectionTitle: string }) {
  return (
    <div className={styles.unavailablePanel}>
      <p className={styles.unavailableTitle}>{sectionTitle}</p>
      <p className={styles.unavailableText}>
        [Section unavailable — data could not be retrieved]
      </p>
    </div>
  );
}

function DrawerSection({
  title,
  subtitle,
  pill,
  pillElement,
  defaultOpen,
  countLabel,
  children,
}: {
  title: string;
  subtitle: string;
  pill: string;
  pillElement?: ReactNode;
  defaultOpen?: boolean;
  countLabel?: string;
  children: ReactNode;
}) {
  return (
    <details className={styles.drawer} open={defaultOpen}>
      <summary className={styles.drawerSummary}>
        <div className={styles.drawerHeading}>
          <div>
            <h2 className={styles.cardTitle}>
              {title}
              {countLabel && (
                <span className={styles.countPill}>{countLabel}</span>
              )}
            </h2>
            <span className={styles.cardSubtitle}>{subtitle}</span>
          </div>
          <div className="flex items-center gap-3">
            {pillElement ?? (
              <span className={styles.statusPill}>
                <Layers3 size={14} />
                {pill}
              </span>
            )}
            <span className={styles.drawerToggle}>
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </summary>
      <div className={styles.drawerBody}>{children}</div>
    </details>
  );
}


function SectionRenderer({
  text,
}: {
  text: string;
}) {
  return (
    <div className={styles.narrativePanel}>
      <ReactMarkdown>{text}</ReactMarkdown>
    </div>
  );
}

function ResearchFeedSection({
  sectionKey,
  text,
}: {
  sectionKey: ResearchSectionKey;
  text: string;
}) {
  const items = parseResearchFeed(sectionKey, text);

  if (items.length === 0) {
    return (
      <div className={styles.narrativePanel}>
        <ReactMarkdown>{text}</ReactMarkdown>
      </div>
    );
  }

  return (
    <div className={styles.researchFeed}>
      {items.map((item, index) => (
        <article key={item.id} className={styles.researchRow}>
          <div className={styles.researchIndex}>
            <span className={styles.researchIndexNumber}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span className={styles.researchBadge}>{item.label}</span>
          </div>

          <div className={styles.researchMain}>
            <div className={styles.researchHeader}>
              <div className={styles.researchTitleWrap}>
                <h3 className={styles.researchTitle}>{item.title}</h3>
                {item.sourceLabel && (
                  <span className={styles.researchSource}>
                    {item.sourceLabel}
                  </span>
                )}
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

            {item.summary && (
              <p className={styles.researchSummary}>{item.summary}</p>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

function LoadingState({
  executionLog,
}: {
  executionLog: AgentExecutionLogEntry[];
}) {
  return (
    <section className={styles.loadingWrap}>
      <div className={styles.emptyState}>
        <div className={styles.loader} />
        <h2 className={styles.loadingTitle}>Running your startup analysis</h2>
        <p className={styles.loadingText}>
          The backend is executing the planner, research tools, and critic loop.
          Progress appears below as each step completes, and the final report
          replaces this view automatically.
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
                <TimelineEntry
                  key={`${entry.type ?? entry.tool ?? "event"}-${index}`}
                  entry={entry}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: () => void;
}) {
  return (
    <section className={styles.errorWrap}>
      <div className={styles.emptyState}>
        <CircleAlert size={42} />
        <h2 className={styles.errorTitle}>Analysis could not complete</h2>
        <p className={styles.errorText}>
          {message ??
            "The backend returned an unexpected failure while processing this idea."}
        </p>
        <div className={styles.heroActions}>
          <button
            type="button"
            className={styles.primaryAction}
            onClick={onRetry}
          >
            <RefreshCw size={16} />
            Try again
          </button>
          <Link href="/submit" className={styles.secondaryAction}>
            Back to submit
          </Link>
        </div>
      </div>
    </section>
  );
}

function TimelineEntry({ entry }: { entry: AgentExecutionLogEntry }) {
  return (
    <div className={styles.timelineItem}>
      <div className={styles.timelineDot}>
        <BrainCircuit size={18} />
      </div>
      <div className={styles.timelineBody}>
        <div className={styles.timelineHeading}>
          <span className={styles.timelineTitle}>
            {getTimelineTitle(entry)}
          </span>
          {entry.status && (
            <span className={styles.statusPill}>
              {formatRunStatus(entry.status)}
            </span>
          )}
        </div>
        <p className={styles.timelineMeta}>{getTimelineDescription(entry)}</p>
      </div>
    </div>
  );
}

function MetricTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className={styles.metricTile}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={styles.metricValue}>{value}</span>
      <span className={styles.metricHint}>{hint}</span>
    </div>
  );
}

function getTimelineTitle(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") return "Idea classification";
  if (entry.type === "inter_tool_delay") return "Inter-tool pacing";
  if (entry.type === "self_healing_cycle")
    return `Self-healing cycle ${entry.iteration ?? ""}`.trim();
  if (entry.type === "convergence") return "Convergence decision";
  if (entry.agent) return humanizeKey(entry.agent);
  if (entry.tool) return humanizeKey(entry.tool);
  return "Agent event";
}

function getTimelineDescription(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") {
    return `Classified as ${entry.idea_type ?? "general"} using ${entry.classification_source ?? "unknown"} with confidence ${formatScore(entry.classification_confidence ?? 0, true)}.`;
  }

  if (entry.type === "self_healing_cycle") {
    const reruns = entry.rerun_tools?.map(humanizeKey).join(", ") || "no tools";
    return `Critic requested another pass using: ${reruns}.`;
  }

  if (entry.type === "inter_tool_delay") {
    return `Waiting ${entry.delay_seconds ?? 0}s before continuing after ${humanizeKey(entry.after_tool ?? "the previous tool")}.`;
  }

  if (entry.type === "convergence") {
    return (
      entry.reason ??
      "The orchestrator decided no further iterations were needed."
    );
  }

  if (entry.agent && entry.error) {
    return `${humanizeKey(entry.agent)} failed: ${entry.error}`;
  }

  if (entry.agent) {
    return (
      entry.message ?? `${humanizeKey(entry.agent)} completed successfully.`
    );
  }

  if (entry.tool) {
    if (entry.status === "skipped") {
      return (
        entry.message ??
        `Skipping ${humanizeKey(entry.tool)} because a checkpoint already exists.`
      );
    }

    if (entry.error) {
      return `${formatRunStatus(entry.status ?? "failed")} while executing ${humanizeKey(entry.tool)}: ${entry.error}`;
    }

    return (
      entry.message ??
      `${formatRunStatus(entry.status ?? "success")} ${humanizeKey(entry.tool)}.`
    );
  }

  return "Agent event recorded.";
}

function splitBlocks(text: string) {
  return text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}


function cleanListPrefix(line: string) {
  return line.replace(/^([-*]|\d+\.)\s+/, "").trim();
}

function formatScore(value: number, asPercent = false) {
  const safeValue = Number.isFinite(value) ? value : 0;

  if (asPercent) {
    return `${Math.round(safeValue * 100)}%`;
  }

  return safeValue.toFixed(1);
}

function humanizeKey(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function capitalize(value?: string | null) {
  if (!value) {
    return "General";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatRunStatus(value?: string | null) {
  if (!value) {
    return "Pending";
  }

  return humanizeKey(value);
}

function parseResearchFeed(sectionKey: ResearchSectionKey, text: string) {
  const blocks = splitBlocks(text);
  const items = blocks
    .map((block, index) => parseResearchBlock(sectionKey, block, index))
    .filter((item): item is ResearchFeedItem => item !== null);

  const deduped = new Map<string, ResearchFeedItem>();

  for (const item of items) {
    const key = item.url || item.domain || `${item.title}::${item.summary}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values()).slice(0, 5);
}

function parseResearchBlock(
  sectionKey: ResearchSectionKey,
  block: string,
  index: number,
): ResearchFeedItem | null {
  const normalizedBlock = block.replace(/\r/g, "").trim();
  if (!normalizedBlock) {
    return null;
  }

  const lines = normalizedBlock
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map(cleanListPrefix);

  const url = extractFirstUrl(normalizedBlock);
  const nonUrlLines = lines.filter((line) => !looksLikeRawUrl(line));

  const headingMatch = normalizedBlock.match(
    /^\*{0,2}([^:\n]{3,100})\*{0,2}:\s*(.+)$/m,
  );
  let title = headingMatch?.[1]?.trim() || "";
  let summary = headingMatch?.[2]?.trim() || "";

  if (isLowSignalResearchText(title)) {
    title = "";
  }

  if (isLowSignalResearchText(summary)) {
    summary = "";
  }

  if (!title) {
    title = chooseResearchTitle(sectionKey, nonUrlLines);
  }

  if (!summary) {
    summary = chooseResearchSummary(nonUrlLines, title);
  }

  if (isLowSignalResearchText(title)) {
    title = "";
  }

  const sourceLabel = inferSourceLabel(nonUrlLines, title, summary);
  const domain = extractDomain(url);
  const label = domain || `source ${String(index + 1).padStart(2, "0")}`;

  if (!title && !summary && !url) {
    return null;
  }

  return {
    id: `${sectionKey}-${index}-${title || domain || "item"}`,
    label,
    title:
      title ||
      sourceLabel ||
      domain ||
      `${sectionKey === "similar_startups" ? "Comparable startup" : "Funding signal"} ${index + 1}`,
    summary,
    sourceLabel,
    domain,
    url,
  };
}

function chooseResearchTitle(sectionKey: ResearchSectionKey, lines: string[]) {
  if (lines.length === 0) {
    return "";
  }

  const firstDescriptiveLine =
    lines.find((line) => {
      const cleaned = line.replace(/\*\*/g, "").trim();
      return cleaned.length > 6 && !isLowSignalResearchText(cleaned);
    }) || "";

  const pipeSplit = firstDescriptiveLine
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  if (pipeSplit.length >= 2) {
    return isLowSignalResearchText(pipeSplit[0])
      ? (pipeSplit[1] ?? "")
      : pipeSplit[0];
  }

  const sentence =
    firstDescriptiveLine.replace(/\*\*/g, "").split(/[.!?]/)[0]?.trim() || "";
  if (
    sentence.length > 0 &&
    sentence.length <= 90 &&
    !isLowSignalResearchText(sentence)
  ) {
    return sentence;
  }

  return sectionKey === "similar_startups"
    ? "Comparable company signal"
    : "Funding activity signal";
}

function chooseResearchSummary(lines: string[], title: string) {
  const cleanedLines = lines
    .map((line) => line.replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .filter((line) => line !== title)
    .filter((line) => !isLowSignalResearchText(line));

  if (cleanedLines.length === 0) {
    return "";
  }

  const joined = cleanedLines.join(" ");
  const singleLine = joined.replace(/\s+/g, " ").trim();
  return singleLine.length > 110
    ? `${singleLine.slice(0, 107).trim()}...`
    : singleLine;
}

function inferSourceLabel(lines: string[], title: string, summary: string) {
  const candidates = [title, ...lines, summary]
    .map((value) => value.replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .filter((value) => !isLowSignalResearchText(value));

  const sourceCandidate = candidates.find((value) => value.includes("|"));
  if (sourceCandidate) {
    return sourceCandidate;
  }

  return candidates.find((value) => value.length <= 80 && /[A-Z]/.test(value));
}

function extractFirstUrl(text: string) {
  const match = text.match(/(?:https?:\/\/|\/\/|www\.)[^\s)]+/i);
  if (!match) {
    return undefined;
  }

  const raw = match[0].replace(/[),.;]+$/, "");
  if (raw.startsWith("//")) {
    return `https:${raw}`;
  }

  if (raw.startsWith("www.")) {
    return `https://${raw}`;
  }

  return raw;
}

function extractDomain(url?: string) {
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function looksLikeRawUrl(line: string) {
  return /^(?:https?:\/\/|\/\/|www\.)/i.test(line.trim());
}

function isLowSignalResearchText(value?: string) {
  if (!value) {
    return true;
  }

  const normalized = value
    .replace(/\*\*/g, "")
    .replace(/^[\-:|]+|[\-:|]+$/g, "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return true;
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
  ].includes(normalized);
}
