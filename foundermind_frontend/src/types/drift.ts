export type DriftStatus =
  | "stable"
  | "attention"
  | "critical"
  | "insufficient_data"
  | "drift_detected"
  | "changed"
  | "adjustment_recommended"
  | "no_data"
  | string

export interface DriftSummary {
  overall_status: DriftStatus
  total_completed_runs: number
  idea_types_monitored: number
  active_alerts: number
  recommendation_count: number
}

export interface ModelDrift {
  status: DriftStatus
  drift: number
  recent_avg: number
  baseline_avg: number
  threshold: number
  window_size: number
}

export interface IdeaTypeDriftMetric extends ModelDrift {
  idea_type: string
  sample_size: number
}

export interface ToolDriftMetric {
  tool_name: string
  status: DriftStatus
  drift: number
  recent_success: number | null
  historical_success: number | null
  threshold: number
  window_size: number
}

export interface MarketLandscapeSignal {
  idea_type: string
  status: DriftStatus
  trend: "expanding" | "contracting" | "steady" | "watching" | "insufficient_data" | string
  current_tam_billion_usd: number | null
  previous_tam_billion_usd: number | null
  tam_delta_percent: number | null
  current_cagr: number | null
  previous_cagr: number | null
  cagr_delta: number | null
  opportunity_score: number | null
  sample_size: number
}

export interface CompetitorSignal {
  company_name: string
  category_tag: string
  url: string
  appearances: number
  idea_types: string[]
  latest_seen_at: string | null
  latest_idea_title: string
  signal_strength: number
}

export interface WeightChange {
  section: string
  current_weight: number
  suggested_weight: number
  delta: number
}

export interface WeightAlert {
  idea_type: string
  status: DriftStatus
  current_weights: Record<string, number>
  suggested_weights: Record<string, number>
  changes: WeightChange[]
  section_averages: Record<string, number>
  reason: string
}

export interface RecalibrationTrigger {
  idea_type: string
  should_recalibrate: boolean
  reasons: string[]
  drift_score: number
  weak_sections: Record<string, number>
}

export interface HistoricalTrendPoint {
  date: string
  average_score: number | null
  weighted_score: number | null
  analysis_confidence: number | null
  run_count: number
  drift_score: number
}

export interface DriftRecommendation {
  priority: "high" | "medium" | "low" | string
  area: "model" | "tool" | "market" | "weights" | "monitoring" | string
  title: string
  description: string
  action: string
  idea_type?: string
}

export interface DriftMetrics {
  generated_at: string
  summary: DriftSummary
  model_drift: ModelDrift
  idea_type_drift: IdeaTypeDriftMetric[]
  tool_drift: ToolDriftMetric[]
  market_landscape: MarketLandscapeSignal[]
  competitors: CompetitorSignal[]
  weight_alerts: WeightAlert[]
  recalibration_triggers: RecalibrationTrigger[]
  historical_trends: HistoricalTrendPoint[]
  recommendations: DriftRecommendation[]
}
