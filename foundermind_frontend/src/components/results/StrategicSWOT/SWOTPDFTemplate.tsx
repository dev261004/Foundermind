import React from "react";
import type {
  SWOTAnalysis,
  SWOTStrengthItem,
  SWOTWeaknessItem,
  SWOTOpportunityItem,
  SWOTThreatItem,
} from "@/types/analysis";

// ─── Constants ───────────────────────────────────────────────────────────────

export const SWOT_PDF_ELEMENT_ID = "swot-pdf-template";

const QUADRANT_COLORS = {
  strengths: { accent: "#10b981", light: "#ecfdf5", label: "Strengths" },
  weaknesses: { accent: "#f59e0b", light: "#fffbeb", label: "Weaknesses" },
  opportunities: { accent: "#0ea5e9", light: "#f0f9ff", label: "Opportunities" },
  threats: { accent: "#f43f5e", light: "#fff1f2", label: "Threats" },
} as const;

// ─── Inline styles (html2pdf captures inline styles, not CSS modules) ────────

const pageStyle: React.CSSProperties = {
  width: "210mm",
  minHeight: "297mm",
  padding: "48px 44px",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
  fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
  color: "#1e293b",
  pageBreakAfter: "always",
};

const lastPageStyle: React.CSSProperties = {
  ...pageStyle,
  pageBreakAfter: "auto",
};

const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #e2e8f0",
  margin: "24px 0",
};

// ─── Helper Components ───────────────────────────────────────────────────────

function SeverityDots({ value, color }: { value: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            backgroundColor: i <= value ? color : "#e2e8f0",
            display: "inline-block",
          }}
        />
      ))}
    </span>
  );
}

function PotentialStars({ value, color }: { value: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            fontSize: 14,
            color: i <= value ? color : "#cbd5e1",
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function SummaryChip({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "14px 22px",
        borderRadius: 12,
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        minWidth: 100,
      }}
    >
      <span style={{ fontSize: 28, fontWeight: 800, color, lineHeight: 1.1 }}>
        {count}
      </span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#64748b",
          marginTop: 4,
        }}
      >
        {label}
      </span>
    </div>
  );
}

function CompetitiveBar({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  return (
    <div style={{ position: "relative", marginTop: 20 }}>
      {/* Gradient bar */}
      <div
        style={{
          height: 14,
          width: "100%",
          borderRadius: 999,
          background: "linear-gradient(to right, #f43f5e, #f59e0b, #10b981)",
          position: "relative",
        }}
      >
        {/* Dot indicator */}
        <div
          style={{
            position: "absolute",
            left: `${clampedScore}%`,
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 24,
            height: 24,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: "3px solid #334155",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        />
      </div>
      {/* Labels */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          color: "#94a3b8",
        }}
      >
        <span style={{ color: "#f43f5e" }}>Vulnerable</span>
        <span style={{ color: "#f59e0b" }}>At Risk</span>
        <span style={{ color: "#10b981" }}>Strong</span>
      </div>
    </div>
  );
}

function ItemCard({
  term,
  detail,
  deepDive,
  imperatives,
  accentColor,
  metricLabel,
  metricElement,
}: {
  term: string;
  detail: string;
  deepDive: string;
  imperatives: string[];
  accentColor: string;
  metricLabel?: string;
  metricElement?: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: "24px 28px",
        marginBottom: 20,
        borderLeft: `4px solid ${accentColor}`,
        backgroundColor: "#ffffff",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 10,
        }}
      >
        <h4
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: "#0f172a",
            margin: 0,
            lineHeight: 1.3,
          }}
        >
          {term}
        </h4>
        {metricElement && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              flexShrink: 0,
              marginLeft: 12,
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
              }}
            >
              {metricLabel}
            </span>
            {metricElement}
          </div>
        )}
      </div>

      {/* Detail */}
      <p
        style={{
          fontSize: 13,
          lineHeight: 1.65,
          color: "#475569",
          margin: "0 0 16px 0",
        }}
      >
        {detail}
      </p>

      {/* Deep Dive */}
      {deepDive && (
        <div
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: 8,
            padding: "14px 18px",
            marginBottom: 16,
            borderLeft: `3px solid ${accentColor}40`,
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: accentColor,
              marginBottom: 6,
              marginTop: 0,
            }}
          >
            Deep Dive
          </p>
          <p
            style={{
              fontSize: 12,
              lineHeight: 1.7,
              color: "#475569",
              margin: 0,
            }}
          >
            {deepDive}
          </p>
        </div>
      )}

      {/* Strategic Imperatives */}
      {imperatives.length > 0 && (
        <div>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: accentColor,
              marginBottom: 8,
              marginTop: 0,
            }}
          >
            Strategic Imperatives
          </p>
          <ul
            style={{
              margin: 0,
              paddingLeft: 0,
              listStyle: "none",
            }}
          >
            {imperatives.map((imp, idx) => (
              <li
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  fontSize: 12,
                  lineHeight: 1.65,
                  color: "#475569",
                  marginBottom: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    backgroundColor: accentColor,
                    flexShrink: 0,
                    marginTop: 5,
                    opacity: 0.7,
                  }}
                />
                <span>{imp}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Quadrant Page ───────────────────────────────────────────────────────────

function QuadrantPage({
  title,
  accentColor,
  isLast,
  children,
}: {
  title: string;
  accentColor: string;
  isLast: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={isLast ? lastPageStyle : pageStyle}>
      {/* Quadrant heading */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 32,
        }}
      >
        <div
          style={{
            width: 6,
            height: 36,
            borderRadius: 3,
            backgroundColor: accentColor,
          }}
        />
        <h2
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#0f172a",
            margin: 0,
            letterSpacing: "-0.02em",
          }}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

// ─── Main Template Component ─────────────────────────────────────────────────

interface SWOTPDFTemplateProps {
  data: SWOTAnalysis;
  ideaName: string;
}

export default function SWOTPDFTemplate({ data, ideaName }: SWOTPDFTemplateProps) {
  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const { competitive_position, critical_insight, strengths, weaknesses, opportunities, threats } =
    data;

  const stanceColor =
    competitive_position.score >= 51
      ? "#10b981"
      : competitive_position.score >= 26
        ? "#f59e0b"
        : "#f43f5e";

  return (
    <div
      id={SWOT_PDF_ELEMENT_ID}
      style={{
        position: "fixed",
        left: "-9999px",
        top: 0,
        zIndex: -1,
        backgroundColor: "#ffffff",
        width: "210mm",
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {/* ── Page 1: Cover ──────────────────────────────────────────────── */}
      <div style={pageStyle}>
        {/* Brand */}
        <div style={{ marginBottom: 64, marginTop: 16 }}>
          <p
            style={{
              fontSize: 14,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              color: "#6366f1",
              margin: 0,
            }}
          >
            FounderMind
          </p>
          <p
            style={{
              fontSize: 12,
              color: "#94a3b8",
              margin: "4px 0 0 0",
            }}
          >
            AI-Powered Startup Intelligence
          </p>
        </div>

        {/* Title block */}
        <div style={{ marginBottom: 48 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94a3b8",
              margin: "0 0 12px 0",
            }}
          >
            Strategic SWOT Analysis
          </p>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 800,
              color: "#0f172a",
              margin: 0,
              lineHeight: 1.15,
              letterSpacing: "-0.02em",
              maxWidth: "90%",
            }}
          >
            {ideaName}
          </h1>
          <p
            style={{
              fontSize: 13,
              color: "#94a3b8",
              margin: "12px 0 0 0",
            }}
          >
            Generated {generatedDate}
          </p>
        </div>

        <hr style={hrStyle} />

        {/* Summary strip */}
        <div
          style={{
            display: "flex",
            gap: 16,
            flexWrap: "wrap",
            marginBottom: 40,
          }}
        >
          <SummaryChip
            label="Strengths"
            count={strengths.length}
            color={QUADRANT_COLORS.strengths.accent}
          />
          <SummaryChip
            label="Weaknesses"
            count={weaknesses.length}
            color={QUADRANT_COLORS.weaknesses.accent}
          />
          <SummaryChip
            label="Opportunities"
            count={opportunities.length}
            color={QUADRANT_COLORS.opportunities.accent}
          />
          <SummaryChip
            label="Threats"
            count={threats.length}
            color={QUADRANT_COLORS.threats.accent}
          />
        </div>

        {/* Competitive position summary */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: 14,
            padding: "24px 28px",
            border: "1px solid #e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <p
              style={{
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#94a3b8",
                margin: 0,
              }}
            >
              Competitive Position
            </p>
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: stanceColor,
              }}
            >
              {competitive_position.score}
              <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>
                /100
              </span>
            </span>
          </div>
          <p
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: stanceColor,
              margin: "0 0 4px 0",
            }}
          >
            {competitive_position.stance}
          </p>
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {competitive_position.description}
          </p>
        </div>
      </div>

      {/* ── Page 2: Critical Insight + Competitive Bar ─────────────────── */}
      <div style={pageStyle}>
        {/* Critical Insight banner */}
        <div
          style={{
            backgroundColor: "#fff1f2",
            border: "1px solid #fecdd3",
            borderLeft: `5px solid #f43f5e`,
            borderRadius: 12,
            padding: "24px 28px",
            marginBottom: 40,
          }}
        >
          <p
            style={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#f43f5e",
              margin: "0 0 8px 0",
            }}
          >
            ⚠ Critical Threat Detected
          </p>
          <h3
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "#0f172a",
              margin: "0 0 8px 0",
            }}
          >
            {critical_insight.label}
          </h3>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.65,
              color: "#475569",
              margin: 0,
            }}
          >
            {critical_insight.detail}
          </p>
        </div>

        {/* Competitive Position detailed section */}
        <div
          style={{
            backgroundColor: "#f8fafc",
            borderRadius: 14,
            padding: "32px 28px",
            border: "1px solid #e2e8f0",
          }}
        >
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "#94a3b8",
              margin: "0 0 6px 0",
            }}
          >
            Market Stance
          </p>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: "#0f172a",
              margin: "0 0 24px 0",
              letterSpacing: "-0.02em",
            }}
          >
            Competitive Position
          </h2>

          <CompetitiveBar score={competitive_position.score} />

          <div style={{ marginTop: 28 }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 16px",
                borderRadius: 999,
                backgroundColor: `${stanceColor}18`,
                border: `1px solid ${stanceColor}30`,
                color: stanceColor,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              {competitive_position.stance}
            </span>
            <p
              style={{
                fontSize: 14,
                lineHeight: 1.65,
                color: "#475569",
                margin: "14px 0 0 0",
              }}
            >
              {competitive_position.description}
            </p>
          </div>
        </div>
      </div>

      {/* ── Page 3: Strengths ──────────────────────────────────────────── */}
      <QuadrantPage
        title={QUADRANT_COLORS.strengths.label}
        accentColor={QUADRANT_COLORS.strengths.accent}
        isLast={false}
      >
        {strengths.map((item: SWOTStrengthItem, idx: number) => (
          <ItemCard
            key={idx}
            term={item.term}
            detail={item.detail}
            deepDive={item.explore?.deep_dive || ""}
            imperatives={item.explore?.strategic_imperatives || []}
            accentColor={QUADRANT_COLORS.strengths.accent}
          />
        ))}
      </QuadrantPage>

      {/* ── Page 4: Weaknesses ─────────────────────────────────────────── */}
      <QuadrantPage
        title={QUADRANT_COLORS.weaknesses.label}
        accentColor={QUADRANT_COLORS.weaknesses.accent}
        isLast={false}
      >
        {weaknesses.map((item: SWOTWeaknessItem, idx: number) => (
          <ItemCard
            key={idx}
            term={item.term}
            detail={item.detail}
            deepDive={item.explore?.deep_dive || ""}
            imperatives={item.explore?.strategic_imperatives || []}
            accentColor={QUADRANT_COLORS.weaknesses.accent}
            metricLabel="Severity"
            metricElement={
              <SeverityDots
                value={item.severity}
                color={QUADRANT_COLORS.weaknesses.accent}
              />
            }
          />
        ))}
      </QuadrantPage>

      {/* ── Page 5: Opportunities ──────────────────────────────────────── */}
      <QuadrantPage
        title={QUADRANT_COLORS.opportunities.label}
        accentColor={QUADRANT_COLORS.opportunities.accent}
        isLast={false}
      >
        {opportunities.map((item: SWOTOpportunityItem, idx: number) => (
          <ItemCard
            key={idx}
            term={item.term}
            detail={item.detail}
            deepDive={item.explore?.deep_dive || ""}
            imperatives={item.explore?.strategic_imperatives || []}
            accentColor={QUADRANT_COLORS.opportunities.accent}
            metricLabel="Potential"
            metricElement={
              <PotentialStars
                value={item.potential}
                color={QUADRANT_COLORS.opportunities.accent}
              />
            }
          />
        ))}
      </QuadrantPage>

      {/* ── Page 6: Threats ────────────────────────────────────────────── */}
      <QuadrantPage
        title={QUADRANT_COLORS.threats.label}
        accentColor={QUADRANT_COLORS.threats.accent}
        isLast={true}
      >
        {threats.map((item: SWOTThreatItem, idx: number) => (
          <ItemCard
            key={idx}
            term={item.term}
            detail={item.detail}
            deepDive={item.explore?.deep_dive || ""}
            imperatives={item.explore?.strategic_imperatives || []}
            accentColor={QUADRANT_COLORS.threats.accent}
            metricLabel="Severity"
            metricElement={
              <SeverityDots
                value={item.severity}
                color={QUADRANT_COLORS.threats.accent}
              />
            }
          />
        ))}
      </QuadrantPage>
    </div>
  );
}

// ─── Download Function ───────────────────────────────────────────────────────

export async function downloadSWOTPDF(
  elementId: string,
  ideaName: string,
  onSuccess?: () => void,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`[SWOTPDFTemplate] Element with id "${elementId}" not found.`);
    return;
  }

  // Temporarily make the element visible for capture
  const prevPosition = element.style.position;
  const prevLeft = element.style.left;
  const prevZIndex = element.style.zIndex;
  const prevPointerEvents = element.style.pointerEvents;

  element.style.position = "absolute";
  element.style.left = "0";
  element.style.zIndex = "-1";
  element.style.pointerEvents = "none";

  const dateSlug = new Date().toISOString().slice(0, 10);
  const slugName = ideaName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `foundermind-swot-${slugName}-${dateSlug}.pdf`;

  try {
    // Dynamic import to avoid SSR issues with Next.js
    const html2pdf = (await import("html2pdf.js")).default;

    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"], avoid: ["div"] },
      } as Record<string, unknown>)
      .from(element)
      .save();

    onSuccess?.();
  } catch (err) {
    console.error("[SWOTPDFTemplate] PDF generation failed:", err);
  } finally {
    // Restore hidden state
    element.style.position = prevPosition;
    element.style.left = prevLeft;
    element.style.zIndex = prevZIndex;
    element.style.pointerEvents = prevPointerEvents;
  }
}
