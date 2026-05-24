export type ComparisonMode = "analyses" | "ideas"

export interface ComparisonOption {
  idea_id?: string
  run_id?: string
  latest_run_id?: string
  label: string
  description?: string
  owner?: string
  status?: string
  idea_type?: string
  created_at?: string | null
  overall_score?: number | null
  weighted_score?: number | null
  analysis_confidence?: number | null
  iterations_used?: number
}

export interface ComparisonOptionsResponse {
  ideas: ComparisonOption[]
  analysis_runs: ComparisonOption[]
}

export interface ComparisonSignalSet {
  tam_billion_usd?: number | null
  cagr?: number | null
  opportunity_score?: number | null
  competitor_count?: number | null
  funding_signal_count?: number | null
  monetization_count?: number | null
  sections_ready?: number | null
}

export interface ComparisonItem {
  run_id?: string
  idea_id: string
  label: string
  status?: string
  idea_type?: string
  owner?: string
  description?: string
  created_at?: string | null
  overall_score?: number | null
  weighted_score?: number | null
  analysis_confidence?: number | null
  iterations_used?: number
  decision_score?: number | null
  section_scores?: Record<string, number>
  signals: ComparisonSignalSet
  report_summary?: string
}

export interface MetricValue {
  id: string
  label: string
  value: number | string | null
  delta_from_first?: number | null
}

export interface MetricComparisonRow {
  metric: string
  label: string
  values: MetricValue[]
}

export interface SectionChange {
  section: string
  label: string
  values: MetricValue[]
  delta: number | null
  trend: "improved" | "degraded" | "stable" | string
  spread: number
}

export interface ComparisonReport {
  title: string
  summary: string
  recommendations: string[]
}

export interface ComparisonSummary {
  items_compared: number
  best_id?: string | null
  best_label?: string | null
  average_overall_score?: number | null
  score_spread?: number | null
  improved_count?: number
  degraded_count?: number
}

export interface ComparisonResult {
  status: "ready" | "insufficient_selection" | string
  message?: string
  comparison_type?: ComparisonMode
  summary?: ComparisonSummary
  items?: ComparisonItem[]
  metric_deltas?: MetricComparisonRow[]
  section_changes?: SectionChange[]
  improved?: SectionChange[]
  degraded?: SectionChange[]
  ranking?: ComparisonItem[]
  side_by_side_metrics?: MetricComparisonRow[]
  report?: ComparisonReport
}
