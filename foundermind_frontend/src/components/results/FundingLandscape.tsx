import { Target, RotateCcw, Radar, Search, ShieldAlert } from "lucide-react"
import { FundingInfoItem } from "@/types/analysis"
import styles from "./FundingLandscape.module.css"

interface Props {
  data: string | FundingInfoItem[]
  onRetry?: () => void
}

const STAGE_COLORS: Record<string, { bg: string; color: string }> = {
  "Pre-Seed": { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" },
  Seed: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" },
  "Series A": { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" },
  "Series B": { bg: "rgba(139, 92, 246, 0.15)", color: "#8b5cf6" },
  "Series C": { bg: "rgba(236, 72, 153, 0.15)", color: "#ec4899" },
  "Series D+": { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
  Unknown: { bg: "rgba(148, 163, 184, 0.15)", color: "#94a3b8" },
}

export function FundingLandscape({ data, onRetry }: Props) {
  if (typeof data === "string") {
    // Legacy fallback state
    return (
      <div className={styles.legacyContainer}>
        <div className={styles.emptyState}>
          <Target size={32} className={styles.emptyIcon} />
          <h4 className={styles.emptyTitle}>Funding information unavailable</h4>
          <p className={styles.emptyDesc}>
            This information is currently presented in an unstructured format. Please run a new analysis to see the structured funding landscape.
          </p>
          {onRetry && (
            <button className={styles.retryButton} onClick={onRetry}>
              <RotateCcw size={16} />
              Retry this section
            </button>
          )}
        </div>
        <div className={styles.legacyText}>{data}</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.radarWrapper}>
          <Radar size={48} className={styles.radarSvg} />
          <div className={styles.radarRing} />
        </div>
        <h4 className={styles.emptyTitle}>Scanning for Funding Signals</h4>
        <p className={styles.emptyDesc}>We couldn't find structured funding information for this space. The agent is continuously scanning recent deal flow.</p>

        <div className={styles.emptyPills}>
          <span className={styles.emptyPill}>
            <Search size={14} />
            Crunchbase Deep Scan
          </span>
          <span className={styles.emptyPill}>
            <ShieldAlert size={14} />
            Insufficient Signal
          </span>
        </div>

        {onRetry && (
          <button className={styles.retryButton} onClick={onRetry}>
            <RotateCcw size={16} />
            Retry this section
          </button>
        )}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h2 className={styles.headerH2}>Funding Landscape</h2>
          <p className={styles.headerSubtitle}>Recent capital patterns and investor appetite around the space.</p>
        </div>
        <div className={styles.headerPill}>
          <Radar size={14} />
          {data.length} Signals Found
        </div>
      </div>

      <ul className={styles.list}>
        {data.map((item, index) => {
          const colors = STAGE_COLORS[item.funding_stage] || STAGE_COLORS["Unknown"]

          return (
            <li key={index} className={styles.card}>
              <div className={styles.cardLeft}>
                <h3 className={styles.companyName}>{item.company_name}</h3>
                <div className={styles.amount}>{item.funding_amount}</div>
                <span
                  className={styles.pill}
                  style={{ backgroundColor: colors.bg, color: colors.color }}
                >
                  {item.funding_stage}
                </span>
              </div>

              <div className={styles.cardCenter}>
                <p className={styles.description}>{item.description}</p>

                {item.investors && item.investors.length > 0 && (
                  <div className={styles.investors}>
                    <strong className={styles.investorLabel}>Investors:</strong>
                    <span className={styles.investorList}>
                      {item.investors.join(", ")}
                    </span>
                  </div>
                )}
              </div>

              {item.relevance_score !== undefined && (
                <div className={styles.cardRight} title={`Relevance: ${item.relevance_score}/100`}>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ height: `${Math.max(0, Math.min(100, item.relevance_score))}%` }}
                    />
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      {onRetry && (
        <div className={styles.retryContainer}>
          <button className={styles.retryButton} onClick={onRetry}>
            <RotateCcw size={16} />
            Retry this section
          </button>
        </div>
      )}
    </div>
  )
}
