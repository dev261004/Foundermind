"use client";

import type { CSSProperties, ReactNode } from "react";
import type {
  AgentAnalysisResponse,
  CustomerProfile,
  FounderActionPlan,
  FundingSignal,
  MarketQuantitativeModel,
  MonetizationStrategyItem,
  SimilarStartup,
  SWOTAnalysis,
  TechStack,
} from "@/types/analysis";
import { ANALYSIS_PDF_ELEMENT_ID } from "./analysisPdf";

type ResultStatus = "completed" | "partial" | "quota_exhausted";

type TocEntry = {
  id: string;
  title: string;
};

const rootStyle: CSSProperties = {
  position: "fixed",
  left: "-9999px",
  top: 0,
  zIndex: -1,
  width: "210mm",
  overflow: "hidden",
  pointerEvents: "none",
  backgroundColor: "#ffffff",
};

const pageBaseStyle: CSSProperties = {
  width: "210mm",
  padding: "16mm 16mm 24mm",
  boxSizing: "border-box",
  backgroundColor: "#ffffff",
  color: "#182235",
  fontFamily: "Arial, Helvetica, sans-serif",
};

const coverPageStyle: CSSProperties = {
  ...pageBaseStyle,
  height: "278mm",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

const tocPageStyle: CSSProperties = {
  ...pageBaseStyle,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 36,
  lineHeight: 1.08,
  fontWeight: 700,
  letterSpacing: "-0.04em",
  color: "#182235",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 24,
  lineHeight: 1.2,
  fontWeight: 700,
  letterSpacing: "-0.03em",
  color: "#182235",
};

const sectionSubtitleStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#5a6273",
  fontSize: 13,
  lineHeight: 1.7,
};

const sectionDividerStyle: CSSProperties = {
  border: "none",
  borderTop: "1px solid #d9c6a7",
  margin: "14px 0 22px",
};

const bodyTextStyle: CSSProperties = {
  margin: "0 0 12px",
  fontSize: 12.5,
  lineHeight: 1.8,
  color: "#334155",
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const smallLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: 10,
  letterSpacing: "0.14em",
  textTransform: "uppercase",
  fontWeight: 700,
  color: "#8a6735",
};

const noteStyle: CSSProperties = {
  padding: "15px 18px",
  border: "1px solid #d7c4a2",
  backgroundColor: "#faf6ee",
  color: "#4b5563",
  fontSize: 12,
  lineHeight: 1.7,
};

const metaGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 14,
  marginBottom: 24,
};

const metaCardStyle: CSSProperties = {
  border: "1px solid #d7c4a2",
  padding: "14px 16px",
  backgroundColor: "#fbf7ef",
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  tableLayout: "fixed",
  marginBottom: 18,
  border: "1px solid #d7c8b4",
};

const tableWrapperStyle: CSSProperties = {
  paddingTop: 4,
};

const tableHeaderCellStyle: CSSProperties = {
  border: "1px solid #24344f",
  padding: "12px 14px",
  backgroundColor: "#24344f",
  color: "#f8f4ec",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textAlign: "left",
  verticalAlign: "top",
};

const tableCellStyle: CSSProperties = {
  border: "1px solid #d7c8b4",
  padding: "12px 14px",
  color: "#2f3b4f",
  fontSize: 11.5,
  lineHeight: 1.7,
  verticalAlign: "top",
  wordBreak: "normal",
  overflowWrap: "break-word",
  backgroundColor: "#fffdf8",
};

const listStyle: CSSProperties = {
  margin: "0 0 16px 18px",
  padding: 0,
  color: "#334155",
  fontSize: 11.5,
  lineHeight: 1.7,
  fontFamily: "Georgia, 'Times New Roman', serif",
};

const twoColumnStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  alignItems: "start",
};

const sectionBlockStyle: CSSProperties = {
  marginBottom: 24,
  breakInside: "avoid",
  pageBreakInside: "avoid",
};

const tocRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto auto",
  gap: 12,
  alignItems: "center",
  padding: "12px 14px",
  marginBottom: 8,
  border: "1px solid #d8cab5",
  backgroundColor: "#fbf7ef",
  color: "#182235",
  fontSize: 12.5,
};

const tocPageNumberStyle: CSSProperties = {
  minWidth: 24,
  textAlign: "right",
  fontWeight: 700,
  color: "#24344f",
};

const tableMetaLabelStyle: CSSProperties = {
  display: "block",
  marginBottom: 4,
  fontSize: 9.5,
  lineHeight: 1.35,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#8a6735",
};

const tableMetaValueStyle: CSSProperties = {
  fontSize: 11.25,
  lineHeight: 1.55,
  color: "#24344f",
};

const tableScoreStyle: CSSProperties = {
  display: "inline-block",
  minWidth: 56,
  padding: "6px 10px",
  borderRadius: 999,
  backgroundColor: "#efe5d2",
  color: "#24344f",
  fontSize: 14,
  fontWeight: 700,
  textAlign: "center",
};

const priorityBadgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  borderRadius: 999,
  backgroundColor: "#24344f",
  color: "#f8f4ec",
  fontSize: 12,
  fontWeight: 700,
};

const strategicHorizonStyle: CSSProperties = {
  marginBottom: 18,
  padding: "16px 18px",
  borderLeft: "4px solid #8a6735",
  backgroundColor: "#fbf7ef",
};

const highlightedQuoteStyle: CSSProperties = {
  marginBottom: 20,
  padding: "16px 18px",
  borderLeft: "4px solid #8a6735",
  backgroundColor: "#f6efe2",
};

const reportLabelTextStyle: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "#8a6735",
};

function formatDisplayDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatDisplayTimestamp(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatConfidence(value: number) {
  const safeValue = Number.isFinite(value) ? value : 0;
  const percent = safeValue <= 1 ? safeValue * 100 : safeValue;
  return `${Math.round(percent)}%`;
}

function formatIdeaType(value?: string | null) {
  if (!value) {
    return "General";
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatBillions(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }

  return `$${value.toFixed(2).replace(/\.?0+$/, "")}B`;
}

function formatPercent(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }

  const percent = Math.abs(value) <= 1 ? value * 100 : value;
  return `${percent.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatScore(value?: number | null) {
  if (value === undefined || value === null || !Number.isFinite(value)) {
    return "—";
  }

  return value.toFixed(1).replace(/\.0$/, "");
}

function formatReportEyebrow(ideaName: string) {
  const label = `${ideaName} Report`.trim();
  if (!label || label === "Report") {
    return "FounderMind Report";
  }

  return label.length > 72 ? `${label.slice(0, 69)}...` : label;
}

function cleanInlineText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\*\*/g, "")
    .replace(/`/g, "")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractNarrativeParagraphs(text: string | null | undefined) {
  if (!text) {
    return [];
  }

  const withoutJsonBlocks = text
    .replace(/```json[\s\S]*?```/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\{[\s\S]*?"market_size_current_billion_usd"[\s\S]*?\}/gi, " ");

  return withoutJsonBlocks
    .split(/\n\s*\n/)
    .map((chunk) => cleanInlineText(chunk))
    .filter(Boolean);
}

function isSimilarStartupArray(value: unknown): value is SimilarStartup[] {
  return Array.isArray(value);
}

function isFundingArray(value: unknown): value is FundingSignal[] {
  return Array.isArray(value);
}

function isMonetizationArray(value: unknown): value is MonetizationStrategyItem[] {
  return Array.isArray(value);
}

function isCustomerProfileData(value: unknown): value is CustomerProfile {
  const candidate = value as Partial<CustomerProfile> | null;
  return (
    candidate != null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    typeof candidate.persona_name === "string" &&
    candidate.persona_name.trim().length > 0
  );
}

function isTechStackData(value: unknown): value is TechStack {
  const candidate = value as Partial<TechStack> | null;
  return (
    candidate != null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    Array.isArray(candidate.categories) &&
    candidate.categories.some((category) => {
      if (!category || typeof category !== "object" || Array.isArray(category)) {
        return false;
      }

      return Array.isArray(category.items) && category.items.length > 0;
    })
  );
}

function isSwotData(value: unknown): value is SWOTAnalysis {
  const candidate = value as Partial<SWOTAnalysis> | null;
  return (
    candidate != null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    Array.isArray(candidate.strengths) &&
    Array.isArray(candidate.weaknesses) &&
    Array.isArray(candidate.opportunities) &&
    Array.isArray(candidate.threats)
  );
}

function isActionPlanData(value: unknown): value is FounderActionPlan {
  const candidate = value as Partial<FounderActionPlan> | null;
  return (
    candidate != null &&
    typeof candidate === "object" &&
    !Array.isArray(candidate) &&
    typeof candidate.horizon === "string" &&
    Array.isArray(candidate.actions)
  );
}

function UnavailableNote({ text }: { text: string }) {
  return <div style={noteStyle}>{text}</div>;
}

function NarrativeParagraphs({ text }: { text: string | null | undefined }) {
  const paragraphs = extractNarrativeParagraphs(text);

  if (!paragraphs.length) {
    return null;
  }

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={`${paragraph.slice(0, 24)}-${index}`} style={bodyTextStyle}>
          {paragraph}
        </p>
      ))}
    </>
  );
}

function LabeledValue({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div style={{ marginTop: 8 }}>
      <span style={tableMetaLabelStyle}>{label}</span>
      <div style={tableMetaValueStyle}>{value}</div>
    </div>
  );
}

function KeepTogetherBlock({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      data-pdf-keep-together="true"
      style={{
        ...sectionBlockStyle,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function ReportTable({
  headers,
  rows,
  columnWidths,
}: {
  headers: string[];
  rows: ReactNode[][];
  columnWidths?: string[];
}) {
  return (
    <div style={tableWrapperStyle}>
      <table style={tableStyle}>
        {columnWidths && (
          <colgroup>
            {columnWidths.map((width, index) => (
              <col key={`${width}-${index}`} style={{ width }} />
            ))}
          </colgroup>
        )}
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header} style={tableHeaderCellStyle}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`row-${rowIndex}`} style={{ breakInside: "avoid" }}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`cell-${rowIndex}-${cellIndex}`}
                  style={{
                    ...tableCellStyle,
                    backgroundColor: rowIndex % 2 === 0 ? "#fffdf8" : "#f8f2e8",
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionPage({
  sectionId,
  eyebrow,
  title,
  subtitle,
  children,
}: {
  sectionId: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section
      data-pdf-section={sectionId}
      data-pdf-block={sectionId}
      data-pdf-page-start="true"
      style={pageBaseStyle}
    >
      <div style={{ marginBottom: 18 }}>
        <span style={smallLabelStyle}>{eyebrow}</span>
        <h2 style={sectionTitleStyle}>{title}</h2>
        <p style={sectionSubtitleStyle}>{subtitle}</p>
      </div>
      <hr style={sectionDividerStyle} />
      {children}
    </section>
  );
}

export default function AnalysisPDFTemplate({
  result,
  ideaName,
  status,
}: {
  result: AgentAnalysisResponse;
  ideaName: string;
  status: ResultStatus;
}) {
  const generatedAt = new Date();
  const generatedDate = formatDisplayDate(generatedAt);
  const generatedTimestamp = formatDisplayTimestamp(generatedAt);

  const similarStartups = isSimilarStartupArray(result.results.similar_startups)
    ? result.results.similar_startups
    : [];
  const fundingSignals = isFundingArray(result.results.funding_info)
    ? result.results.funding_info
    : [];
  const monetizationStrategies = isMonetizationArray(result.results.monetization)
    ? result.results.monetization
    : [];
  const customerProfile = isCustomerProfileData(result.results.customer_profile)
    ? result.results.customer_profile
    : null;
  const customerNarrative =
    typeof result.results.customer_profile === "string"
      ? result.results.customer_profile
      : "";
  const techStack = isTechStackData(result.results.tech_stack)
    ? result.results.tech_stack
    : null;
  const swot = isSwotData(result.results.swot) ? result.results.swot : null;
  const swotNarrative =
    typeof result.results.swot === "string" ? result.results.swot : "";
  const actionPlan = isActionPlanData(result.action_plan) ? result.action_plan : null;
  const executiveSummary = result.report_summary?.trim() ?? "";
  const marketNarrative = result.results.market_data?.trim() ?? "";
  const marketMetrics: MarketQuantitativeModel | null =
    result.results.market_quantitative_model ?? null;
  const reportEyebrow = formatReportEyebrow(ideaName);

  const tocEntries: TocEntry[] = [
    { id: "snapshot", title: "Report Snapshot" },
    { id: "executive-summary", title: "Executive Summary" },
    { id: "comparable-startups", title: "Comparable Startups" },
    { id: "funding-landscape", title: "Funding Landscape" },
    { id: "market-data", title: "Market Data" },
    { id: "monetization-strategy", title: "Monetization Strategy" },
    { id: "customer-profile", title: "Customer Profile" },
    ...(techStack ? [{ id: "tech-stack", title: "Suggested Tech Stack" }] : []),
    { id: "strategic-swot", title: "Strategic SWOT" },
    { id: "founder-action-plan", title: "Founder Action Plan" },
    { id: "appendix", title: "Appendix / Report Notes" },
  ];

  const statusLabel =
    status === "partial"
      ? "Partial Analysis"
      : status === "quota_exhausted"
        ? "Quota-Limited Analysis"
        : "Completed Analysis";

  return (
    <div id={ANALYSIS_PDF_ELEMENT_ID} style={rootStyle}>
      <div data-pdf-block="cover" style={coverPageStyle}>
        <div>
          <p style={reportLabelTextStyle}>{reportEyebrow}</p>
          <div
            style={{
              width: 88,
              height: 4,
              marginTop: 22,
              background:
                "linear-gradient(90deg, #182235 0%, #8a6735 52%, #d3b27a 100%)",
            }}
          />
        </div>

        <div style={{ maxWidth: "80%" }}>
          <h1 style={titleStyle}>Startup Idea Analysis</h1>
          <p
            style={{
              margin: "18px 0 0",
              fontSize: 22,
              lineHeight: 1.4,
              color: "#24344f",
              fontWeight: 500,
            }}
          >
            {ideaName}
          </p>
          <p
            style={{
              margin: "24px 0 0",
              ...bodyTextStyle,
              fontSize: 13,
            }}
          >
            A professional FounderMind brief generated from the saved startup
            analysis snapshot, formatted for review, sharing, and decision
            making.
          </p>
        </div>

        <div style={twoColumnStyle}>
          <div style={metaCardStyle}>
            <span style={smallLabelStyle}>Generated On</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#182235" }}>
              {generatedDate}
            </div>
          </div>
          <div style={metaCardStyle}>
            <span style={smallLabelStyle}>Report Status</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#182235" }}>
              {statusLabel}
            </div>
          </div>
        </div>
      </div>

      <section data-pdf-block="toc" data-pdf-page-start="true" style={tocPageStyle}>
        <span style={smallLabelStyle}>{reportEyebrow}</span>
        <h2 style={sectionTitleStyle}>Table of Contents</h2>
        <p style={sectionSubtitleStyle}>
          Click any topic in the exported PDF to jump to that section.
        </p>
        <hr style={sectionDividerStyle} />

        <div style={{ marginTop: 8 }}>
          {tocEntries.map((entry) => (
            <div
              key={entry.id}
              data-toc-target={entry.id}
              style={tocRowStyle}
            >
              <span>{entry.title}</span>
              <span
                style={{
                  borderBottom: "1px dotted #b89a67",
                  height: 1,
                  minWidth: 24,
                }}
              />
              <span data-page-for={entry.id} style={tocPageNumberStyle} />
            </div>
          ))}
        </div>
      </section>

      <SectionPage
        sectionId="snapshot"
        eyebrow={reportEyebrow}
        title="Report Snapshot"
        subtitle="High-level metadata and context for this saved FounderMind analysis."
      >
        <div style={metaGridStyle}>
          <div style={metaCardStyle}>
            <span style={smallLabelStyle}>Idea Title</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#182235" }}>
              {ideaName}
            </div>
          </div>
          <div style={metaCardStyle}>
            <span style={smallLabelStyle}>Idea Type</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#182235" }}>
              {formatIdeaType(result.idea_type)}
            </div>
          </div>
          <div style={metaCardStyle}>
            <span style={smallLabelStyle}>Analysis Confidence</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#182235" }}>
              {formatConfidence(result.analysis_confidence)}
            </div>
          </div>
          <div style={metaCardStyle}>
            <span style={smallLabelStyle}>Generated Date</span>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#182235" }}>
              {generatedDate}
            </div>
          </div>
        </div>

        <p style={bodyTextStyle}>
          This document is a structured FounderMind export of the saved startup
          analysis currently shown in the application. It summarizes the
          opportunity, competitive context, market signals, monetization paths,
          customer direction, and strategic next steps for the submitted idea.
        </p>
        <p style={bodyTextStyle}>
          The report is intended to be readable as a standalone decision brief
          rather than a copy of the on-screen interface.
        </p>
      </SectionPage>

      <SectionPage
        sectionId="executive-summary"
        eyebrow={reportEyebrow}
        title="Executive Summary"
        subtitle="A concise founder-facing synthesis of the opportunity, the core risk, and the most important next move."
      >
        {executiveSummary ? (
          <NarrativeParagraphs text={executiveSummary} />
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="comparable-startups"
        eyebrow={reportEyebrow}
        title="Comparable Startups"
        subtitle="Adjacent companies that help frame positioning, competition, and signal quality."
      >
        {similarStartups.length > 0 ? (
          <ReportTable
            headers={["Company", "Category", "Description", "Website"]}
            columnWidths={["20%", "14%", "42%", "24%"]}
            rows={similarStartups.map((startup) => [
              <strong key={`${startup.company_name}-name`}>{startup.company_name}</strong>,
              startup.category_tag || "—",
              startup.description || "—",
              startup.url ? (
                <a
                  key={`${startup.company_name}-url`}
                  href={startup.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: "#8a5a12", textDecoration: "underline" }}
                >
                  {startup.url}
                </a>
              ) : (
                "—"
              ),
            ])}
          />
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="funding-landscape"
        eyebrow={reportEyebrow}
        title="Funding Landscape"
        subtitle="Recent capital signals that indicate investor appetite and adjacent market conviction."
      >
        {fundingSignals.length > 0 ? (
          <KeepTogetherBlock>
            <ReportTable
              headers={[
                "Company",
                "Stage",
                "Amount",
                "Key Investors",
                "Why Relevant",
                "Website",
              ]}
              columnWidths={["15%", "10%", "12%", "20%", "25%", "18%"]}
              rows={fundingSignals.map((signal) => [
                <strong key={`${signal.company_name}-company`}>{signal.company_name}</strong>,
                signal.funding_stage || "—",
                signal.funding_amount || "—",
                signal.investors.length > 0 ? signal.investors.join(", ") : "—",
                signal.description || "—",
                signal.url ? (
                  <a
                    key={`${signal.company_name}-link`}
                    href={signal.url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#8a5a12", textDecoration: "underline" }}
                  >
                    {signal.url}
                  </a>
                ) : (
                  "—"
                ),
              ])}
            />
          </KeepTogetherBlock>
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="market-data"
        eyebrow={reportEyebrow}
        title="Market Data"
        subtitle="Market size, growth, and category commentary based on the saved analysis output."
      >
        <KeepTogetherBlock>
          <ReportTable
            headers={["Metric", "Value", "Interpretation"]}
            columnWidths={["22%", "18%", "60%"]}
            rows={[
              [
                "Total Addressable Market (TAM)",
                formatBillions(marketMetrics?.tam_billion_usd ?? null),
                "The broadest potential market captured by the current category framing.",
              ],
              [
                "Serviceable Available Market (SAM)",
                formatBillions(marketMetrics?.sam_billion_usd ?? null),
                "The portion of TAM that aligns with the idea's likely go-to-market scope.",
              ],
              [
                "Serviceable Obtainable Market (SOM)",
                formatBillions(marketMetrics?.som_billion_usd ?? null),
                "The realistic near-term portion of the market a new entrant may win.",
              ],
              [
                "Growth Rate (CAGR)",
                formatPercent(marketMetrics?.calculated_cagr ?? null),
                "The estimated market growth signal available in the saved analysis.",
              ],
              [
                "Opportunity Score",
                formatScore(marketMetrics?.opportunity_score ?? null),
                "FounderMind's synthesized market opportunity indicator for this idea.",
              ],
            ]}
          />
        </KeepTogetherBlock>

        {marketNarrative ? (
          <NarrativeParagraphs text={marketNarrative} />
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="monetization-strategy"
        eyebrow={reportEyebrow}
        title="Monetization Strategy"
        subtitle="Revenue paths the analysis considers most plausible for this idea."
      >
        {monetizationStrategies.length > 0 ? (
          <ReportTable
            headers={["Strategy", "Commercial Model", "Revenue Potential", "Why It Fits"]}
            columnWidths={["24%", "24%", "14%", "38%"]}
            rows={monetizationStrategies.map((strategy) => [
              <div key={`${strategy.strategy_name}-name`}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#182235" }}>
                  {strategy.strategy_name}
                </div>
                <div style={{ marginTop: 6, fontSize: 10.75, color: "#5a6273" }}>
                  Recommended pricing or monetization path for the current concept.
                </div>
              </div>,
              <div key={`${strategy.strategy_name}-model`}>
                <LabeledValue label="Type" value={strategy.type || "—"} />
                <LabeledValue label="Fit Score" value={strategy.fit_score || "—"} />
              </div>,
              <div key={`${strategy.strategy_name}-potential`}>
                <span style={tableScoreStyle}>
                  {String(strategy.revenue_potential ?? "—")}
                </span>
                <div style={{ marginTop: 6, fontSize: 10.5, color: "#5a6273" }}>
                  Indexed opportunity score
                </div>
              </div>,
              strategy.description || "—",
            ])}
          />
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="customer-profile"
        eyebrow={reportEyebrow}
        title="Customer Profile"
        subtitle="The most promising early customer, their context, and the value proposition that should resonate first."
      >
        {customerProfile ? (
          <>
            <div style={metaGridStyle}>
              <div style={metaCardStyle}>
                <span style={smallLabelStyle}>Persona</span>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {customerProfile.persona_name}
                </div>
              </div>
              <div style={metaCardStyle}>
                <span style={smallLabelStyle}>Role</span>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {customerProfile.profession || "—"}
                </div>
              </div>
              <div style={metaCardStyle}>
                <span style={smallLabelStyle}>Age Range</span>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {customerProfile.age_range || "—"}
                </div>
              </div>
              <div style={metaCardStyle}>
                <span style={smallLabelStyle}>Persona Strength</span>
                <div style={{ fontSize: 17, fontWeight: 700 }}>
                  {customerProfile.persona_strength ?? "—"}
                </div>
              </div>
            </div>

            {customerProfile.quote && (
              <div
                style={highlightedQuoteStyle}
              >
                <span style={smallLabelStyle}>Representative Voice</span>
                <p style={{ ...bodyTextStyle, margin: 0 }}>
                  &ldquo;{customerProfile.quote}&rdquo;
                </p>
              </div>
            )}

            <div style={twoColumnStyle}>
              <div style={sectionBlockStyle}>
                <span style={smallLabelStyle}>Pain Points</span>
                <ul style={listStyle}>
                  {customerProfile.pain_points.map((item, index) => (
                    <li key={`pain-${index}`}>
                      {item.text} (severity {item.severity}/3)
                    </li>
                  ))}
                </ul>

                <span style={smallLabelStyle}>Needs</span>
                <ul style={listStyle}>
                  {customerProfile.needs.map((item, index) => (
                    <li key={`need-${index}`}>{item.text}</li>
                  ))}
                </ul>
              </div>

              <div style={sectionBlockStyle}>
                <span style={smallLabelStyle}>Buying Behavior</span>
                <ul style={listStyle}>
                  {customerProfile.buying_behavior.map((item, index) => (
                    <li key={`behavior-${index}`}>{item.label}</li>
                  ))}
                </ul>

                <span style={smallLabelStyle}>Value Proposition</span>
                <ul style={listStyle}>
                  {customerProfile.value_proposition.map((item, index) => (
                    <li key={`value-${index}`}>{item.text}</li>
                  ))}
                </ul>
              </div>
            </div>

            <KeepTogetherBlock>
              <ReportTable
                headers={["Demographic Signal", "Details"]}
                columnWidths={["30%", "70%"]}
                rows={[
                  [
                    "Income",
                    customerProfile.demographics?.annual_income || "—",
                  ],
                  ["Locations", customerProfile.demographics?.locations || "—"],
                  ["Education", customerProfile.demographics?.education || "—"],
                  [
                    "Brand Affinities",
                    customerProfile.brand_affinities.length > 0
                      ? customerProfile.brand_affinities.join(", ")
                      : "—",
                  ],
                  [
                    "Buying Behavior Tags",
                    customerProfile.buying_behavior_tags.length > 0
                      ? customerProfile.buying_behavior_tags.join(", ")
                      : "—",
                  ],
                ]}
              />
            </KeepTogetherBlock>
          </>
        ) : customerNarrative ? (
          <NarrativeParagraphs text={customerNarrative} />
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      {techStack && (
        <SectionPage
          sectionId="tech-stack"
          eyebrow={reportEyebrow}
          title="Suggested Tech Stack"
          subtitle="A conditional section included only when the idea requires a meaningful technical implementation path."
        >
          <ReportTable
            headers={["Layer", "Recommended Tool", "Priority", "Reasoning"]}
            columnWidths={["18%", "22%", "12%", "48%"]}
            rows={techStack.categories.flatMap((category) =>
              category.items.map((item) => [
                <strong key={`${category.id}-${item.id}-layer`}>
                  {category.name}
                </strong>,
                <div key={`${category.id}-${item.id}-tool`}>
                  <div style={{ fontWeight: 700, color: "#182235" }}>{item.name}</div>
                  {item.alternatives.length > 0 && (
                    <div style={{ marginTop: 4, fontSize: 10.5, color: "#5a6273" }}>
                      Alternatives: {item.alternatives.join(", ")}
                    </div>
                  )}
                </div>,
                item.confidence,
                item.reasoning || item.description || "—",
              ]),
            )}
          />
        </SectionPage>
      )}

      <SectionPage
        sectionId="strategic-swot"
        eyebrow={reportEyebrow}
        title="Strategic SWOT"
        subtitle="A structured strategic read across strengths, weaknesses, opportunities, and threats."
      >
        {swot ? (
          <>
            <KeepTogetherBlock>
              <div style={twoColumnStyle}>
                <div style={metaCardStyle}>
                  <span style={smallLabelStyle}>Critical Insight</span>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    {swot.critical_insight.label || "—"}
                  </div>
                  <p style={{ ...bodyTextStyle, margin: 0 }}>
                    {swot.critical_insight.detail || "No critical insight available."}
                  </p>
                </div>
                <div style={metaCardStyle}>
                  <span style={smallLabelStyle}>Competitive Position</span>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                    {swot.competitive_position.stance || "—"} ({swot.competitive_position.score ?? "—"}/100)
                  </div>
                  <p style={{ ...bodyTextStyle, margin: 0 }}>
                    {swot.competitive_position.description || "No competitive position narrative available."}
                  </p>
                </div>
              </div>
            </KeepTogetherBlock>

            <KeepTogetherBlock>
              <span style={smallLabelStyle}>Strengths</span>
              <ReportTable
                headers={["Theme", "Detail", "Strategic Note"]}
                columnWidths={["24%", "34%", "42%"]}
                rows={swot.strengths.map((item) => [
                  <strong key={`${item.term}-strength`}>{item.term}</strong>,
                  item.detail,
                  item.explore?.deep_dive || "—",
                ])}
              />
            </KeepTogetherBlock>

            <KeepTogetherBlock>
              <span style={smallLabelStyle}>Weaknesses</span>
              <ReportTable
                headers={["Theme", "Detail", "Severity", "Strategic Note"]}
                columnWidths={["20%", "30%", "12%", "38%"]}
                rows={swot.weaknesses.map((item) => [
                  <strong key={`${item.term}-weakness`}>{item.term}</strong>,
                  item.detail,
                  `${item.severity}/3`,
                  item.explore?.deep_dive || "—",
                ])}
              />
            </KeepTogetherBlock>

            <KeepTogetherBlock>
              <span style={smallLabelStyle}>Opportunities</span>
              <ReportTable
                headers={["Theme", "Detail", "Potential", "Strategic Note"]}
                columnWidths={["20%", "30%", "12%", "38%"]}
                rows={swot.opportunities.map((item) => [
                  <strong key={`${item.term}-opportunity`}>{item.term}</strong>,
                  item.detail,
                  `${item.potential}/3`,
                  item.explore?.deep_dive || "—",
                ])}
              />
            </KeepTogetherBlock>

            <KeepTogetherBlock>
              <span style={smallLabelStyle}>Threats</span>
              <ReportTable
                headers={["Theme", "Detail", "Severity", "Strategic Note"]}
                columnWidths={["20%", "30%", "12%", "38%"]}
                rows={swot.threats.map((item) => [
                  <strong key={`${item.term}-threat`}>{item.term}</strong>,
                  item.detail,
                  `${item.severity}/3`,
                  item.explore?.deep_dive || "—",
                ])}
              />
            </KeepTogetherBlock>
          </>
        ) : swotNarrative ? (
          <NarrativeParagraphs text={swotNarrative} />
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="founder-action-plan"
        eyebrow={reportEyebrow}
        title="Founder Action Plan"
        subtitle="Prioritized next steps synthesized from the available analysis."
      >
        {actionPlan && actionPlan.actions.length > 0 ? (
          <>
            {actionPlan.horizon && (
              <KeepTogetherBlock style={{ marginBottom: 18 }}>
                <div style={strategicHorizonStyle}>
                  <span style={smallLabelStyle}>Strategic Horizon</span>
                  <p style={{ ...bodyTextStyle, margin: 0 }}>{actionPlan.horizon}</p>
                </div>
              </KeepTogetherBlock>
            )}

            <KeepTogetherBlock>
              <ReportTable
                headers={[
                  "Priority",
                  "Action Summary",
                  "Execution Detail",
                  "Strategic Rationale",
                  "Timing / Category",
                ]}
                columnWidths={["9%", "21%", "24%", "28%", "18%"]}
                rows={actionPlan.actions.map((action) => [
                  <span key={`${action.priority}-badge`} style={priorityBadgeStyle}>
                    {String(action.priority)}
                  </span>,
                  <div key={`${action.priority}-title`}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#182235" }}>
                      {action.title}
                    </div>
                    <div style={{ marginTop: 6, fontSize: 10.75, color: "#5a6273" }}>
                      Priority action for the founder roadmap.
                    </div>
                  </div>,
                  action.what,
                  action.why,
                  <div key={`${action.priority}-meta`}>
                    <LabeledValue label="Timeframe" value={action.timeframe} />
                    <LabeledValue label="Category" value={action.category} />
                  </div>,
                ])}
              />
            </KeepTogetherBlock>
          </>
        ) : (
          <UnavailableNote text="Reliable public data was not available for this topic at the time of report generation." />
        )}
      </SectionPage>

      <SectionPage
        sectionId="appendix"
        eyebrow={reportEyebrow}
        title="Appendix / Report Notes"
        subtitle="Contextual notes about how this PDF was generated and how to interpret gaps."
      >
        <ReportTable
          headers={["Note", "Details"]}
          columnWidths={["28%", "72%"]}
          rows={[
            ["Generated Timestamp", generatedTimestamp],
            ["Report Source", "This PDF was produced from the saved FounderMind analysis already loaded in the application."],
            [
              "Availability Note",
              "Sections may remain present with a short note when the topic is relevant but reliable public data was not available at the time of report generation.",
            ],
            [
              "External Links",
              "Comparable startup and funding website links point to third-party sources referenced by the analysis output.",
            ],
            [
              "Report Status",
              status === "partial"
                ? "This report includes saved sections from a partial analysis. One or more sections remained incomplete because of temporary external-data or tool errors."
                : status === "quota_exhausted"
                  ? "This report includes the sections saved before model quota was exhausted. Missing sections may be retried later."
                  : "This report reflects a completed saved analysis run.",
            ],
          ]}
        />
      </SectionPage>
    </div>
  );
}
