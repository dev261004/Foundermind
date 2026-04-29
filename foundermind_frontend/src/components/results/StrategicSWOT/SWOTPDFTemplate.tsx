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

// ─── Inline styles (html2pdf captures inline styles) ─────────────────────────

const pageStyle: React.CSSProperties = {
  width: "210mm",
  padding: "40px 44px",
  backgroundColor: "#ffffff",
  boxSizing: "border-box",
  fontFamily: "Arial, Helvetica, sans-serif",
  color: "#1e293b",
};

const coverPageStyle: React.CSSProperties = {
  ...pageStyle,
  display: "flex",
  flexDirection: "column",
};

const quadrantPageStyle: React.CSSProperties = {
  ...pageStyle,
  display: "flex",
  flexDirection: "column",
  position: "relative"
};

const hrStyle: React.CSSProperties = {
  border: "none",
  borderTop: "1px solid #cbd5e1",
  margin: "24px 0",
};

const PageBreak = () => <div className="html2pdf__page-break" style={{ height: 0, margin: 0, padding: 0 }} />;

// ─── Helper Components ───────────────────────────────────────────────────────

function SeverityDots({ value, color }: { value: number; color: string }) {
  return (
    <span style={{ display: "inline-flex", gap: "2px", alignItems: "center" }}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          style={{
            fontSize: 12,
            color: i <= value ? color : "#e2e8f0",
            lineHeight: 1,
            marginRight: 2
          }}
        >
          ■
        </span>
      ))}
    </span>
  );
}

function SummaryTable({
  strengths, weaknesses, opportunities, threats
}: {
  strengths: number; weaknesses: number; opportunities: number; threats: number;
}) {
  return (
    <div style={{ display: "flex", border: "1px solid #cbd5e1", marginTop: 32, marginBottom: 48 }}>
      {[
        { label: "STRENGTHS", count: strengths, color: QUADRANT_COLORS.strengths.accent },
        { label: "WEAKNESSES", count: weaknesses, color: QUADRANT_COLORS.weaknesses.accent },
        { label: "OPPORTUNITIES", count: opportunities, color: QUADRANT_COLORS.opportunities.accent },
        { label: "THREATS", count: threats, color: QUADRANT_COLORS.threats.accent },
      ].map((item, idx) => (
        <div key={item.label} style={{ 
          flex: 1, 
          padding: "16px 20px", 
          borderRight: idx < 3 ? "1px solid #cbd5e1" : "none",
          textAlign: "center"
        }}>
          <div style={{ fontSize: 24, fontWeight: "bold", color: item.color }}>{item.count}</div>
          <div style={{ fontSize: 10, fontWeight: "bold", color: "#64748b", marginTop: 4 }}>{item.label}</div>
        </div>
      ))}
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
    <div style={{ marginBottom: 32 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: `2px solid ${accentColor}`, paddingBottom: 6, marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a", margin: 0 }}>
          {term}
        </h4>
        {metricElement && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, fontWeight: "bold", color: "#64748b" }}>{metricLabel}:</span>
            {metricElement}
          </div>
        )}
      </div>

      {/* Detail */}
      <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: "0 0 16px 0", textAlign: "justify", fontFamily: "Georgia, 'Times New Roman', serif" }}>
        {detail}
      </p>

      {/* Deep Dive */}
      {deepDive && (
        <div style={{ marginBottom: 16, paddingLeft: 12, borderLeft: `3px solid #e2e8f0` }}>
          <p style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", margin: "0 0 4px 0", fontFamily: "Arial, sans-serif" }}>DEEP DIVE</p>
          <p style={{ fontSize: 12, lineHeight: 1.6, color: "#475569", margin: 0, fontStyle: "italic", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {deepDive}
          </p>
        </div>
      )}

      {/* Strategic Imperatives */}
      {imperatives.length > 0 && (
        <div>
          <p style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", margin: "0 0 8px 0", fontFamily: "Arial, sans-serif" }}>STRATEGIC IMPERATIVES</p>
          <ul style={{ margin: 0, paddingLeft: 16, listStyleType: "disc", color: "#475569", fontFamily: "Georgia, 'Times New Roman', serif" }}>
            {imperatives.map((imp, idx) => (
              <li key={idx} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 4 }}>
                {imp}
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
  children,
}: {
  title: string;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div style={quadrantPageStyle}>
      <div style={{ position: "relative", zIndex: 1, flex: 1 }}>
        {/* Header Ribbon */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, borderBottom: `4px solid ${accentColor}`, paddingBottom: 12 }}>
          <h2 style={{ fontSize: 24, fontWeight: "bold", color: "#0f172a", margin: 0, textTransform: "uppercase" }}>
            {title}
          </h2>
          <span style={{ fontSize: 10, fontWeight: "bold", color: "#94a3b8", letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Strategic SWOT Analysis
          </span>
        </div>
        
        {children}
      </div>
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

  const { competitive_position, critical_insight, strengths, weaknesses, opportunities, threats } = data;

  const stanceColor =
    competitive_position.score >= 51 ? "#10b981"
      : competitive_position.score >= 26 ? "#f59e0b" : "#f43f5e";

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
      {/* ── Page 1: Cover & Summary ────────────────────────────────────────── */}
      <div style={coverPageStyle}>
        
        <div style={{ textAlign: "center", marginTop: "30mm", marginBottom: "30mm" }}>
          <p style={{ fontSize: 14, fontWeight: "bold", color: "#64748b", letterSpacing: "0.15em", margin: "0 0 32px 0" }}>
            CONFIDENTIAL STRATEGIC REPORT
          </p>
          <h1 style={{ fontSize: 42, fontWeight: "900", color: "#0f172a", margin: "0 0 24px 0", lineHeight: 1.15, textTransform: "uppercase" }}>
            {ideaName}
          </h1>
          <hr style={{ width: "80px", border: "none", borderTop: "3px solid #0f172a", margin: "0 auto 32px auto" }} />
          
          <div style={{ fontSize: 14, color: "#475569", lineHeight: 1.8 }}>
            <p style={{ margin: 0, fontWeight: "bold" }}>PREPARED BY</p>
            <p style={{ margin: 0 }}>FounderMind Intelligence</p>
            <p style={{ margin: 0, marginTop: 16, fontWeight: "bold" }}>DATE GENERATED</p>
            <p style={{ margin: 0 }}>{generatedDate}</p>
          </div>
        </div>

        <div style={{ marginTop: "auto" }}>
          <h3 style={{ fontSize: 14, fontWeight: "bold", color: "#0f172a", borderBottom: "2px solid #cbd5e1", paddingBottom: 8, margin: "0 0 16px 0" }}>
            EXECUTIVE SUMMARY
          </h3>
        
        <SummaryTable 
          strengths={strengths.length} 
          weaknesses={weaknesses.length} 
          opportunities={opportunities.length} 
          threats={threats.length} 
        />

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: "bold", color: "#64748b", margin: "0 0 4px 0" }}>OVERALL COMPETITIVE STANCE</p>
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
            <span style={{ fontSize: 24, fontWeight: "bold", color: stanceColor }}>{competitive_position.stance}</span>
            <span style={{ fontSize: 14, fontWeight: "bold", color: "#94a3b8" }}>Score: {competitive_position.score}/100</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, color: "#334155", margin: 0, textAlign: "justify" }}>
            {competitive_position.description}
          </p>
        </div>

        {critical_insight.label && (
          <div style={{ padding: "16px 20px", border: "1px solid #fecdd3", borderLeft: "4px solid #f43f5e", backgroundColor: "#fff1f2", marginBottom: 32 }}>
            <p style={{ fontSize: 11, fontWeight: "bold", color: "#f43f5e", margin: "0 0 8px 0" }}>CRITICAL INSIGHT</p>
            <h4 style={{ fontSize: 16, fontWeight: "bold", color: "#0f172a", margin: "0 0 8px 0" }}>{critical_insight.label}</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: 0 }}>{critical_insight.detail}</p>
          </div>
        )}
        </div>
      </div>

      <PageBreak />

      {/* ── Quadrant Pages ─────────────────────────────────────────────── */}
      <QuadrantPage title="Strengths" accentColor={QUADRANT_COLORS.strengths.accent}>
        {strengths.map((item, idx) => (
          <ItemCard key={idx} term={item.term} detail={item.detail} deepDive={item.explore?.deep_dive || ""} imperatives={item.explore?.strategic_imperatives || []} accentColor={QUADRANT_COLORS.strengths.accent} />
        ))}
      </QuadrantPage>

      <PageBreak />

      <QuadrantPage title="Weaknesses" accentColor={QUADRANT_COLORS.weaknesses.accent}>
        {weaknesses.map((item, idx) => (
          <ItemCard key={idx} term={item.term} detail={item.detail} deepDive={item.explore?.deep_dive || ""} imperatives={item.explore?.strategic_imperatives || []} accentColor={QUADRANT_COLORS.weaknesses.accent} metricLabel="SEVERITY" metricElement={<SeverityDots value={item.severity} color={QUADRANT_COLORS.weaknesses.accent} />} />
        ))}
      </QuadrantPage>

      <PageBreak />

      <QuadrantPage title="Opportunities" accentColor={QUADRANT_COLORS.opportunities.accent}>
        {opportunities.map((item, idx) => (
          <ItemCard key={idx} term={item.term} detail={item.detail} deepDive={item.explore?.deep_dive || ""} imperatives={item.explore?.strategic_imperatives || []} accentColor={QUADRANT_COLORS.opportunities.accent} metricLabel="POTENTIAL" metricElement={<SeverityDots value={item.potential} color={QUADRANT_COLORS.opportunities.accent} />} />
        ))}
      </QuadrantPage>

      <PageBreak />

      <QuadrantPage title="Threats" accentColor={QUADRANT_COLORS.threats.accent}>
        {threats.map((item, idx) => (
          <ItemCard key={idx} term={item.term} detail={item.detail} deepDive={item.explore?.deep_dive || ""} imperatives={item.explore?.strategic_imperatives || []} accentColor={QUADRANT_COLORS.threats.accent} metricLabel="SEVERITY" metricElement={<SeverityDots value={item.severity} color={QUADRANT_COLORS.threats.accent} />} />
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
  const originalElement = document.getElementById(elementId);
  if (!originalElement) {
    console.error(`[SWOTPDFTemplate] Element with id "${elementId}" not found.`);
    return;
  }

  // Extract the inner HTML string and wrap it in a clean container.
  const htmlString = `<div style="background-color: #ffffff; width: 210mm; margin: 0 auto; overflow: hidden;">
    ${originalElement.innerHTML}
  </div>`;

  const dateSlug = new Date().toISOString().slice(0, 10);
  const slugName = ideaName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const filename = `foundermind-swot-${slugName}-${dateSlug}.pdf`;

  try {
    const html2pdf = (await import("html2pdf.js")).default;

    await html2pdf()
      .set({
        margin: [0, 0, 15, 0], // Leave 15mm at bottom for the native footer
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          scrollY: 0,
          windowY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["css", "legacy"] },
      } as Record<string, unknown>)
      .from(htmlString)
      .toPdf()
      .get('pdf')
      .then((pdf: any) => {
        const totalPages = pdf.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);
          
          // Draw horizontal line
          pdf.setDrawColor(203, 213, 225); // #cbd5e1
          pdf.setLineWidth(0.5);
          pdf.line(12, 285, 198, 285);
          
          // Left side: FOUNDERMIND
          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(9);
          pdf.setTextColor(148, 163, 184); // #94a3b8
          pdf.text("FOUNDERMIND", 12, 291);
          
          // Right side: Legend
          pdf.setFont("times", "italic");
          pdf.setFontSize(9);
          pdf.setTextColor(100, 116, 139); // #64748b
          pdf.text("AI-Powered Startup Intelligence", 198, 291, { align: "right" });
        }
      })
      .save();

    onSuccess?.();
  } catch (err) {
    console.error("[SWOTPDFTemplate] PDF generation failed:", err);
  }
}
