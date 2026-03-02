// /types/analytics.ts

export interface RollingMetricPoint {
  date: string
  average_score: number
  average_confidence: number
  convergence_rate: number
}

export interface WeightRecalibrationPoint {
  date: string
  weight_name: string
  old_weight: number
  new_weight: number
}

export interface PerformanceSummary {
  avg_overall_score: number
  avg_opportunity_score: number
  avg_confidence_score: number
  convergence_rate: number
  rerun_frequency: number
}

export interface ConfidenceDistributionBucket {
  range: string
  count: number
}

export interface AnalyticsMetrics {
  rolling_metrics: RollingMetricPoint[]
  weight_history: WeightRecalibrationPoint[]
  performance_summary: PerformanceSummary
  confidence_distribution: ConfidenceDistributionBucket[]
}