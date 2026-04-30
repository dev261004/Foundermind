export interface MarketResearchPoint {
  term: string
  detail: string
}

export interface MarketDataStructured {
  market_drivers: MarketResearchPoint[]
  target_segments: MarketResearchPoint[]
  competitive_landscape: MarketResearchPoint[]
  key_signals: MarketResearchPoint[]
}

export interface MarketQuantitativeModel {
  tam_billion_usd?: number
  sam_billion_usd?: number
  som_billion_usd?: number
  calculated_cagr?: number
  tam_score?: number
  cagr_score?: number
  opportunity_score?: number
  [key: string]: number | string | null | undefined
}

export type MonetizationFitScore = "High" | "Medium" | "Low"
export type MonetizationType = "B2B" | "API" | "B2C" | "Institutional"

export type SimilarStartupIconType =
  | "shield"
  | "newspaper"
  | "building"
  | "circle"
  | "globe"
  | "code"
  | "chart"
  | "bolt"

export interface SimilarStartup {
  company_name: string
  category_tag: string
  description: string
  url: string
  icon_type: SimilarStartupIconType
}

export interface MonetizationStrategyItem {
  strategy_name: string
  type: MonetizationType
  description: string
  fit_score: MonetizationFitScore
  revenue_potential: number
}

export type CompetitiveStance =
  | "Vulnerable Position"
  | "At Risk"
  | "Defensible Position"
  | "Strong Position"

export interface SWOTExplore {
  deep_dive: string
  strategic_imperatives: string[]
}

export interface SWOTStrengthItem {
  term: string
  detail: string
  explore: SWOTExplore
}

export interface SWOTWeaknessItem {
  term: string
  detail: string
  severity: 1 | 2 | 3
  explore: SWOTExplore
}

export interface SWOTOpportunityItem {
  term: string
  detail: string
  potential: 1 | 2 | 3
  explore: SWOTExplore
}

export interface SWOTThreatItem {
  term: string
  detail: string
  severity: 1 | 2 | 3
  explore: SWOTExplore
}

export interface SWOTAnalysis {
  critical_insight: {
    label: string
    detail: string
  }
  competitive_position: {
    stance: CompetitiveStance
    description: string
    score: number     // 0-100
  }
  strengths: SWOTStrengthItem[]
  weaknesses: SWOTWeaknessItem[]
  opportunities: SWOTOpportunityItem[]
  threats: SWOTThreatItem[]
}

export interface AgentAnalysisResults {
  similar_startups?: SimilarStartup[] | null
  market_data?: string
  market_quantitative_model?: MarketQuantitativeModel | null
  market_data_structured?: MarketDataStructured | null
  funding_info?: string
  monetization?: MonetizationStrategyItem[] | string | null
  customer_profile?: string
  tech_stack?: string
  swot?: SWOTAnalysis | string | null
}

export interface AgentCritique {
  overall_score: number
  section_scores: Record<string, number>
  issues_found: string[]
  rerun_tools: string[]
  needs_rerun: boolean
  error?: string | null
  message?: string | null
}

export interface AgentExecutionLogEntry {
  type?: string
  agent?: string
  tool?: string
  status?: string
  result?: string | null
  error?: string
  error_type?: string
  model_used?: string
  message?: string
  timestamp?: string
  idea_type?: string
  classification_source?: string
  classification_confidence?: number
  weights_used?: Record<string, number>
  iteration?: number
  rerun_tools?: string[]
  reason?: string
  after_tool?: string
  delay_seconds?: number
}

export interface AgentAnalysisResponse {
  idea_id?: string
  agent_run_id?: string
  idea_type: string
  classification_confidence: number
  analysis_confidence: number
  report_summary?: string | null
  models_used?: Record<string, string>
  results: AgentAnalysisResults
  execution_log: AgentExecutionLogEntry[]
  critique: AgentCritique
}

export interface StartAnalysisResponse {
  agent_run_id: string
  status: "pending" | "running" | "completed" | "partial" | "failed" | "quota_exhausted"
  mode?: "async" | "sync_fallback" | "cached"
  result?: AgentAnalysisResponse
  critique?: Partial<AgentCritique> & { error?: string; message?: string }
  error?: string
}

export interface AgentAnalysisStatusResponse {
  agent_run_id: string
  idea_id: string
  status: "pending" | "running" | "completed" | "partial" | "failed" | "quota_exhausted"
  execution_log: AgentExecutionLogEntry[]
  critique?: Partial<AgentCritique> & { error?: string; message?: string }
  confidence?: number | null
  result?: AgentAnalysisResponse
}
