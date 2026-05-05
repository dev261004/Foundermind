"use client";

import type { FounderActionPlan as FounderActionPlanType, ActionTimeframe, ActionCategory } from "@/types/analysis";
import styles from "./FounderActionPlan.module.css";

const TIMEFRAME_COLORS: Record<ActionTimeframe, string> = {
  "This Week": "#EF4444",
  "This Month": "#F59E0B",
  "Next 90 Days": "#00D4FF",
  "Next 6 Months": "#6B6880",
};

const CATEGORY_COLORS: Record<ActionCategory, { bg: string; text: string; border: string }> = {
  Revenue: { bg: "rgba(34,197,94,0.12)", text: "#4ade80", border: "rgba(34,197,94,0.25)" },
  Defense: { bg: "rgba(239,68,68,0.12)", text: "#f87171", border: "rgba(239,68,68,0.25)" },
  Growth: { bg: "rgba(139,92,246,0.12)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  Product: { bg: "rgba(59,130,246,0.12)", text: "#60a5fa", border: "rgba(59,130,246,0.25)" },
  Validation: { bg: "rgba(245,158,11,0.12)", text: "#fbbf24", border: "rgba(245,158,11,0.25)" },
  Hiring: { bg: "rgba(20,184,166,0.12)", text: "#2dd4bf", border: "rgba(20,184,166,0.25)" },
};

export default function FounderActionPlanComponent({ plan }: { plan: FounderActionPlanType }) {
  return (
    <div className={styles.wrap}>
      {plan.horizon && (
        <div className={styles.horizonStrip}>
          <span className={styles.horizonLabel}>STRATEGIC MOMENT</span>
          <p className={styles.horizonText}>{plan.horizon}</p>
        </div>
      )}

      <div className={styles.actionsList}>
        {plan.actions.map((action, idx) => {
          const tfColor = TIMEFRAME_COLORS[action.timeframe] ?? "#6B6880";
          const catStyle = CATEGORY_COLORS[action.category] ?? CATEGORY_COLORS.Growth;

          return (
            <div
              key={`action-${action.priority}-${idx}`}
              className={styles.actionRow}
            >
              <div className={styles.actionLeft}>
                <span className={styles.priorityNumber}>
                  {String(action.priority).padStart(2, "0")}
                </span>
                <span
                  className={styles.timeframePill}
                  style={{
                    background: `${tfColor}18`,
                    color: tfColor,
                    borderColor: `${tfColor}40`,
                  }}
                >
                  {action.timeframe}
                </span>
              </div>

              <div className={styles.actionCenter}>
                <h4 className={styles.actionTitle}>{action.title}</h4>
                <p className={styles.actionWhat}>{action.what}</p>
                {action.why && (
                  <p className={styles.actionWhy}>→ {action.why}</p>
                )}
              </div>

              <div className={styles.actionRight}>
                <span
                  className={styles.categoryBadge}
                  style={{
                    background: catStyle.bg,
                    color: catStyle.text,
                    borderColor: catStyle.border,
                  }}
                >
                  {action.category}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
