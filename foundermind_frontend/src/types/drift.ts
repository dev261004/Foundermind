// /types/drift.ts

export interface DriftPoint {
  date: string
  drift_score: number
}

export interface ToolDriftMetric {
  tool_name: string
  drift_score: number
  last_updated: string
}

export interface IdeaTypeDriftMetric {
  idea_type: string
  drift_score: number
  last_updated: string
}

export interface DriftThreshold {
  threshold_value: number
  severity: "low" | "medium" | "high"
}

export interface DriftMetrics {
  global_drift: DriftPoint[]
  idea_type_drift: IdeaTypeDriftMetric[]
  tool_drift: ToolDriftMetric[]
  threshold: DriftThreshold
}