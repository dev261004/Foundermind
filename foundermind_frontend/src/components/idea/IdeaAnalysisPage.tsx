"use client";

import { ReactNode, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  Banknote,
  BrainCircuit,
  ChevronDown,
  CircleAlert,
  Layers3,
  Loader2,
  Sparkles,
  Search,
  TrendingUp,
  Wallet,
  Users,
  Cpu,
  Zap,
  ArrowRight as ArrowRightIcon,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import { useRunStore } from "@/store/useRunStore";
import { useIdeaStore } from "@/store/useIdeaStore";
import {
  AgentAnalysisResponse,
  AgentExecutionLogEntry,
  FundingSignal,
  MonetizationStrategyItem,
  SimilarStartup,
} from "@/types/analysis";
import { MarketData, MarketDataHeader } from "@/components/results/MarketData";
import { MarketDataEmpty } from "@/components/results/MarketData/MarketDataEmpty";
import { MonetizationStrategy } from "@/components/results/MonetizationStrategy";
import { MonetizationEmpty } from "@/components/results/MonetizationStrategy/MonetizationEmpty";
import { StrategicSWOT } from "@/components/results/StrategicSWOT";
import { SWOTEmpty } from "@/components/results/StrategicSWOT/SWOTEmpty";
import { ComparableStartups } from "@/components/results/ComparableStartups";
import { ComparableStartupsEmpty } from "@/components/results/ComparableStartups/ComparableStartupsEmpty";
import { FundingLandscape } from "@/components/results/FundingLandscape";
import { FundingLandscapeEmpty } from "@/components/results/FundingLandscape/FundingLandscapeEmpty";
import { CustomerProfile as CustomerProfileSection } from "@/components/results/CustomerProfile";
import { CustomerProfileEmpty } from "@/components/results/CustomerProfile/CustomerProfileEmpty";
import { TechStack as TechStackSection } from "@/components/results/TechStack";
import { TechStackEmpty } from "@/components/results/TechStack/TechStackEmpty";
import FounderActionPlanComponent from "@/components/results/FounderActionPlan";
import { ExecutionLogUI } from "./ExecutionLogUI";
import type { SWOTAnalysis, FounderActionPlan as FounderActionPlanType } from "@/types/analysis";
import type { CustomerProfile as CustomerProfileData } from "@/types/analysis";
import type { TechStack as TechStackData } from "@/types/analysis";
import styles from "./IdeaAnalysisPage.module.css";
import { SectionRetryWrapper } from "./SectionRetryWrapper";

interface Props {
  ideaId: string;
}

const SECTION_CONFIG: Array<{
  key: keyof AgentAnalysisResponse["results"];
  title: string;
  subtitle: string;
  pill: string;
  icon: LucideIcon;
}> = [
  {
    key: "similar_startups",
    title: "Comparable Startups",
    subtitle:
      "What adjacent companies suggest about positioning and competition.",
    pill: "Research",
    icon: Search,
  },
  {
    key: "market_data",
    title: "Market Data",
    subtitle: "Evidence on TAM, growth, demand signals, and category size.",
    pill: "Market",
    icon: TrendingUp,
  },
  {
    key: "funding_info",
    title: "Funding Landscape",
    subtitle: "Recent capital patterns and investor appetite around the space.",
    pill: "Funding",
    icon: Wallet,
  },
  {
    key: "monetization",
    title: "Monetization Strategy",
    subtitle:
      "Likely revenue paths the agent considers strongest for this idea.",
    pill: "Revenue",
    icon: Banknote,
  },
  {
    key: "customer_profile",
    title: "Customer Profile",
    subtitle: "Who the product should target first and why they will care.",
    pill: "Customer",
    icon: Users,
  },
  {
    key: "tech_stack",
    title: "Suggested Tech Stack",
    subtitle:
      "Technical direction if the product has meaningful software depth.",
    pill: "Tech",
    icon: Cpu,
  },
  {
    key: "swot",
    title: "Strategic SWOT",
    subtitle:
      "A concise strategic read across strengths, risks, openings, and threats.",
    pill: "Swot",
    icon: Zap,
  },
];

export default function IdeaAnalysisPage({ ideaId }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startAnalysis = useRunStore((state) => state.startAnalysis);
  const stopAnalysis = useRunStore((state) => state.stopAnalysis);
  const resetRunState = useRunStore((state) => state.reset);
  const activeIdeaId = useRunStore((state) => state.activeIdeaId);
  const result = useRunStore((state) => state.result);
  const executionLog = useRunStore((state) => state.executionLog);
  const status = useRunStore((state) => state.status);
  const error = useRunStore((state) => state.error);
  const ideaInput = useIdeaStore((state) => state.ideaInput);
  const setEditDraft = useIdeaStore((state) => state.setEditDraft);
  const clearEditDraft = useIdeaStore((state) => state.clearEditDraft);
  const resetIdeaState = useIdeaStore((state) => state.reset);
  const hasStartedResumeRef = useRef(false);
  const requestedTitle = (searchParams.get("title") || "").trim();
  const resumeRequested = searchParams.get("resume") === "1";

  useEffect(() => {
    if (resumeRequested && !hasStartedResumeRef.current) {
      hasStartedResumeRef.current = true;
      void startAnalysis(ideaId, { force: true });
      const nextUrl = requestedTitle
        ? `/idea/${ideaId}?title=${encodeURIComponent(requestedTitle)}`
        : `/idea/${ideaId}`;
      router.replace(nextUrl);
      return;
    }

    if (activeIdeaId !== ideaId || status === "idle") {
      void startAnalysis(ideaId);
    }
  }, [activeIdeaId, ideaId, requestedTitle, resumeRequested, router, startAnalysis, status]);

  const runTitle =
    result?.idea_title ||
    requestedTitle ||
    ideaInput?.trim() ||
    `Idea ${ideaId.slice(0, 8)}`;
  const ideaType = result ? capitalize(result.idea_type) : "Pending";

  const handleStopAnalysis = async (action: "edit" | "new_idea" | "terminate") => {
    const response = await stopAnalysis(action);
    if (!response) {
      return;
    }

    if (action === "edit" && response.status === "cancelled") {
      setEditDraft({
        ideaId: response.idea_id,
        title: response.title ?? "",
        description: response.description ?? "",
      });
      router.push(`/submit?mode=edit&ideaId=${response.idea_id}`);
      return;
    }

    clearEditDraft();
    resetRunState();
    resetIdeaState();
    router.push("/submit");
  };

  return (
    <main className={styles.page}>
      <div className={styles.background} />
      <ExecutionLogUI 
        executionLog={executionLog}
        runStatus={status}
        errorMessage={error}
        onRetry={() => void startAnalysis(ideaId, { force: true })}
        onStopAnalysis={handleStopAnalysis}
        ideaTitle={runTitle}
        ideaType={ideaType}
      />

      <div className={styles.shell}>
        {status === "awaiting_clarification" && (
          <ClarificationPanel />
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
  const runTitle =
    result.idea_title ||
    ideaInput?.trim() ||
    `Idea ${(result.idea_id ?? "").slice(0, 8)}`;
  const showIncompleteSections =
    status === "partial" || status === "quota_exhausted";
  const sectionEntries = showIncompleteSections
    ? SECTION_CONFIG
    : SECTION_CONFIG.filter(({ key }) => {
        const value = result.results[key];
        if (
          key === "similar_startups" ||
          key === "market_data" ||
          key === "funding_info" ||
          key === "monetization" ||
          key === "swot" ||
          key === "customer_profile"
        ) {
          return true; // Always render these sections as they have dedicated empty states
        }
        if (key === "tech_stack") {
          return isTechStackData(value);
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

      {(() => {
        const actionPlan = result.action_plan;
        const hasActions = actionPlan && Array.isArray(actionPlan.actions) && actionPlan.actions.length > 0;

        return (
          <details className={styles.drawer} open>
            <summary className={styles.drawerSummary}>
              <div className={styles.drawerHeading}>
                <div>
                  <h2 className={styles.cardTitle}>
                    Founder Action Plan
                  </h2>
                  <span className={styles.cardSubtitle}>
                    Prioritized next steps synthesized across all analysis
                    sections.
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span className={styles.statusPill}>
                    <Sparkles size={14} />
                    Actions
                  </span>
                  <span className={styles.drawerToggle}>
                    <ChevronDown size={18} />
                  </span>
                </div>
              </div>
            </summary>
            <div className={styles.drawerBody}>
              {hasActions ? (
                <FounderActionPlanComponent plan={actionPlan as FounderActionPlanType} />
              ) : (
                <div className={styles.unavailablePanel}>
                  <h3 className={styles.unavailableTitle}>Not Available</h3>
                  <p className={styles.unavailableText}>
                    Action plan could not be generated. Run a fresh analysis to
                    generate recommendations.
                  </p>
                </div>
              )}
            </div>
          </details>
        );
      })()}

      {sectionEntries.map(({ key, title, subtitle, pill, icon }) => {
        const rawValue = result.results[key];
        const rawString = typeof rawValue === "string" ? rawValue.trim() : "";
        const hasContent = rawString.length > 0;

        if (key === "similar_startups") {
          const startups: SimilarStartup[] = Array.isArray(rawValue) ? rawValue as SimilarStartup[] : [];
          
          if (!Array.isArray(rawValue)) {
             return (
              <DrawerSection
                key={key}
                sectionKey={key}
                title={title}
                subtitle={subtitle}
                pill={pill}
              pillIcon={icon}
                defaultOpen
              >
                <ComparableStartupsEmpty />
              </DrawerSection>
             );
          }

          return (
            <DrawerSection
              key={key}
              sectionKey={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              pillIcon={icon}
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
                <SectionRetryWrapper sectionKey="market_data">
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
                </SectionRetryWrapper>
              </div>
            </details>
          );
        }

        if (key === "funding_info") {
          const signals = isFundingSignalList(rawValue) ? rawValue : [];

          if (signals.length > 0) {
            return (
              <DrawerSection
                key={key}
                sectionKey={key}
                title={title}
                subtitle={subtitle}
                pill={pill}
              pillIcon={icon}
                defaultOpen
              >
                <FundingLandscape signals={signals} />
              </DrawerSection>
            );
          }

          if (Array.isArray(rawValue) || showIncompleteSections) {
            return (
              <DrawerSection
                key={key}
                sectionKey={key}
                title={title}
                subtitle={subtitle}
                pill={pill}
              pillIcon={icon}
                defaultOpen
              >
                <FundingLandscapeEmpty />
              </DrawerSection>
            );
          }

          return null;
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
              sectionKey={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              pillIcon={icon}
              pillElement={
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold px-4 py-2 bg-indigo-500/15 text-indigo-400 rounded-xl border border-indigo-500/25 min-w-[140px]">
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
                sectionKey={key}
                title={title}
                subtitle={subtitle}
                pill={pill}
              pillIcon={icon}
                defaultOpen
              >
                <SWOTEmpty />
              </DrawerSection>
            );
          }

          return (
            <div key={key} className={`${styles.drawer} mb-6`}>
              <SectionRetryWrapper sectionKey="swot">
                <StrategicSWOT
                  swot={rawSwot as SWOTAnalysis}
                  ideaName={runTitle}
                />
              </SectionRetryWrapper>
            </div>
          );
        }

        if (key === "customer_profile") {
          const profile = isCustomerProfileData(rawValue) ? rawValue : null;

          if (!profile && !showIncompleteSections) {
            return null;
          }

          return (
            <DrawerSection
              key={key}
              sectionKey={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              pillIcon={icon}
              defaultOpen
            >
              {profile ? (
                <CustomerProfileSection profile={profile} />
              ) : (
                <CustomerProfileEmpty />
              )}
            </DrawerSection>
          );
        }

        if (key === "tech_stack") {
          const stack = isTechStackData(rawValue) ? rawValue : null;

          if (!stack && !showIncompleteSections) {
            return null;
          }

          return (
            <DrawerSection
              key={key}
              sectionKey={key}
              title={title}
              subtitle={subtitle}
              pill={pill}
              pillIcon={icon}
              defaultOpen
            >
              {stack ? (
                <TechStackSection stack={stack} />
              ) : (
                <TechStackEmpty />
              )}
            </DrawerSection>
          );
        }

        const isContentUnavailable = !hasContent;

        if (isContentUnavailable && !showIncompleteSections) {
          return null;
        }

        return (
          <DrawerSection
            key={key}
            sectionKey={key}
            title={title}
            subtitle={subtitle}
            pill={pill}
            pillIcon={icon}
            defaultOpen
          >
            {isContentUnavailable ? (
              <UnavailableSection sectionTitle={title} />
            ) : (
              <SectionRenderer text={String(result.results[key] ?? "")} />
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
  pillIcon: PillIcon = Layers3,
  pillElement,
  defaultOpen,
  countLabel,
  sectionKey,
  children,
}: {
  title: string;
  subtitle: string;
  pill: string;
  pillIcon?: LucideIcon;
  pillElement?: ReactNode;
  defaultOpen?: boolean;
  countLabel?: string;
  sectionKey?: string;
  children: ReactNode;
}) {
  const body = sectionKey ? (
    <SectionRetryWrapper sectionKey={sectionKey}>
      {children}
    </SectionRetryWrapper>
  ) : (
    children
  );

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
                <PillIcon size={14} />
                {pill}
              </span>
            )}
            <span className={styles.drawerToggle}>
              <ChevronDown size={18} />
            </span>
          </div>
        </div>
      </summary>
      <div className={styles.drawerBody}>{body}</div>
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

function ClarificationPanel() {
  const questions = useRunStore((state) => state.clarificationQuestions);
  const activeRunId = useRunStore((state) => state.activeRunId);
  const submitClarification = useRunStore((state) => state.submitClarification);
  const executionLog = useRunStore((state) => state.executionLog);

  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasAnyAnswer = Object.values(answers).some((v) => v.trim().length > 0);

  const handleSubmit = async () => {
    if (!activeRunId || !hasAnyAnswer) return;

    setIsSubmitting(true);
    try {
      // Filter to only non-empty answers
      const filledAnswers: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        if (value.trim()) {
          filledAnswers[key] = value.trim();
        }
      }
      await submitClarification(activeRunId, filledAnswers);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.clarificationWrap}>
      <div className={styles.clarificationPanel}>
        <div className={styles.clarificationIcon}>
          <MessageSquare size={32} />
        </div>

        <h2 className={styles.clarificationTitle}>
          Help us understand your idea better
        </h2>
        <p className={styles.clarificationSubtitle}>
          Our AI needs a bit more context to generate a high-quality analysis.
          Answer one or more of these questions:
        </p>

        <div className={styles.clarificationQuestions}>
          {questions.map((question, index) => (
            <div key={index} className={styles.clarificationQuestion}>
              <label className={styles.clarificationLabel}>
                <span className={styles.clarificationIndex}>{index + 1}</span>
                {question}
              </label>
              <textarea
                className={styles.clarificationTextarea}
                placeholder="Type your answer here..."
                disabled={isSubmitting}
                value={answers[String(index)] ?? ""}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [String(index)]: e.target.value,
                  }))
                }
              />
            </div>
          ))}

          <button
            type="button"
            className={styles.clarificationSubmitBtn}
            disabled={!hasAnyAnswer || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className={styles.clarificationSpinner} />
                Submitting...
              </>
            ) : (
              <>
                Continue analysis
                <ArrowRightIcon size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {executionLog.length > 0 && (
        <ExecutionTimelineCard
          executionLog={executionLog}
          subtitle="Steps completed before clarification was requested."
          className={styles.clarificationTimeline}
        />
      )}
    </section>
  );
}



function ExecutionTimelineCard({
  executionLog,
  subtitle,
  emptyMessage,
  className,
}: {
  executionLog: AgentExecutionLogEntry[];
  subtitle: string;
  emptyMessage?: string;
  className?: string;
}) {
  return (
    <section className={[styles.loadingTimeline, className].filter(Boolean).join(" ")}>
      <div className={styles.cardHeader}>
        <div>
          <h2 className={styles.cardTitle}>Execution Timeline</h2>
          <span className={styles.cardSubtitle}>{subtitle}</span>
        </div>
        <span className={styles.pill}>
          <Activity size={14} />
          {executionLog.length} events
        </span>
      </div>

      {executionLog.length > 0 ? (
        <div className={styles.timelineList}>
          {executionLog.map((entry, index) => (
            <TimelineEntry
              key={`${entry.timestamp ?? entry.type ?? entry.tool ?? "event"}-${index}`}
              entry={entry}
            />
          ))}
        </div>
      ) : (
        <div className={styles.timelineEmpty}>
          {emptyMessage ?? "No execution events have been recorded yet."}
        </div>
      )}
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

function getTimelineTitle(entry: AgentExecutionLogEntry) {
  if (entry.type === "quality_check") return "Quality check";
  if (entry.type === "idea_refinement") return "Idea refinement";
  if (entry.type === "idea_classification") return "Idea classification";
  if (entry.type === "inter_tool_delay") return "Inter-tool pacing";
  if (entry.type === "self_healing_cycle")
    return `Self-healing cycle ${entry.iteration ?? ""}`.trim();
  if (entry.type === "convergence") return "Convergence decision";
  if (entry.agent === "quality_check") return "Quality check";
  if (entry.agent === "idea_refinement") return "Idea refinement";
  if (entry.agent) return humanizeKey(entry.agent);
  if (entry.tool) return humanizeKey(entry.tool);
  return "Agent event";
}

function getTimelineDescription(entry: AgentExecutionLogEntry) {
  if (entry.type === "idea_classification") {
    return `Classified as ${entry.idea_type ?? "general"} using ${entry.classification_source ?? "unknown"} with confidence ${formatScore(entry.classification_confidence ?? 0, true)}.`;
  }

  if (entry.type === "quality_check") {
    const score = entry.quality_score ?? 0;
    const missing = entry.missing_signals ?? [];
    if (entry.status === "awaiting_clarification") {
      return `Quality score ${score}/4 — below threshold. Missing: ${missing.join(", ") || "none"}. Requesting user clarification.`;
    }
    return `Quality score ${score}/4 — sufficient for analysis.`;
  }

  if (entry.type === "idea_refinement") {
    const origLen = entry.original_length ?? 0;
    const refLen = entry.refined_length ?? 0;
    return `Description refined from ${origLen} to ${refLen} characters.`;
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

function isFundingSignalList(value: unknown): value is FundingSignal[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const candidate = item as Partial<FundingSignal>;
    return (
      typeof candidate.company_name === "string" &&
      typeof candidate.funding_amount === "string" &&
      typeof candidate.funding_stage === "string" &&
      typeof candidate.description === "string" &&
      Array.isArray(candidate.investors) &&
      typeof candidate.relevance_score === "number" &&
      typeof candidate.url === "string"
    );
  });
}

function isCustomerProfileData(value: unknown): value is CustomerProfileData {
  const candidate = value as Partial<CustomerProfileData> | null;
  return (
    candidate != null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    typeof candidate.persona_name === "string" &&
    candidate.persona_name.trim().length > 0
  );
}

function isTechStackData(value: unknown): value is TechStackData {
  const candidate = value as Partial<TechStackData> | null;
  return (
    candidate != null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    Array.isArray(candidate.categories) &&
    candidate.categories.some((category) => {
      if (!category || typeof category !== "object" || Array.isArray(category)) {
        return false;
      }

      const typedCategory = category as Partial<TechStackData["categories"][number]>;
      return Array.isArray(typedCategory.items) && typedCategory.items.length > 0;
    })
  );
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
