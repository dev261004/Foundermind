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

export type FundingStage =
  | "Pre-Seed"
  | "Seed"
  | "Series A"
  | "Series B"
  | "Series C"
  | "Series D+"
  | "Grant"
  | "Undisclosed"

export interface FundingSignal {
  company_name: string
  funding_amount: string
  funding_stage: FundingStage
  description: string
  investors: string[]
  relevance_score: number
  url: string
}

export interface MonetizationStrategyItem {
  strategy_name: string
  type: MonetizationType
  description: string
  fit_score: MonetizationFitScore
  revenue_potential: number
}

export interface CustomerProfileNeed {
  text: string
  icon_emoji: string
}

export interface CustomerProfilePainPoint {
  text: string
  severity: 1 | 2 | 3
}

export interface CustomerProfileBehavior {
  label: string
  icon_emoji: string
}

export interface CustomerProfileValueProp {
  text: string
  icon_emoji: string
}

export interface CustomerProfileDemographics {
  annual_income: string
  locations: string
  education: string
}

export interface CustomerProfile {
  persona_name: string
  age_range: string
  profession: string
  buying_behavior_tags: string[]
  quote: string
  demographics: CustomerProfileDemographics
  brand_affinities: string[]
  persona_strength: number
  needs: CustomerProfileNeed[]
  pain_points: CustomerProfilePainPoint[]
  buying_behavior: CustomerProfileBehavior[]
  value_proposition: CustomerProfileValueProp[]
}

export type TechConfidence = "Essential" | "Recommended" | "Optional"

export interface TechItem {
  id: string
  name: string
  emoji: string
  description: string
  reasoning: string
  confidence: TechConfidence
  alternatives: string[]
}

export interface TechCategory {
  id: string
  name: string
  gradient: string
  items: TechItem[]
}

export interface TechStack {
  categories: TechCategory[]
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
  funding_info?: FundingSignal[] | string | null
  monetization?: MonetizationStrategyItem[] | string | null
  customer_profile?: CustomerProfile | string | null
  tech_stack?: TechStack | string | null
  swot?: SWOTAnalysis | string | null
}

export type ActionTimeframe = "This Week" | "This Month" | "Next 90 Days" | "Next 6 Months"
export type ActionCategory = "Revenue" | "Defense" | "Growth" | "Product" | "Validation" | "Hiring"

export interface FounderAction {
  priority: number
  title: string
  what: string
  why: string
  timeframe: ActionTimeframe
  category: ActionCategory
}

export interface FounderActionPlan {
  horizon: string
  actions: FounderAction[]
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
  issues_found?: string[]
  section_scores?: Record<string, number>
  low_scoring_sections?: Record<string, number>
  average_score?: number
  threshold?: number
  max_iterations?: number
  iteration_scores?: number[]
  after_tool?: string
  delay_seconds?: number
  quality_score?: number
  missing_signals?: string[]
  questions_count?: number
  original_length?: number
  refined_length?: number
  completed_at?: string
}

export interface AgentAnalysisResponse {
  idea_id?: string
  idea_title?: string
  agent_run_id?: string
  idea_type: string
  classification_confidence: number
  analysis_confidence: number
  report_summary?: string | null
  action_plan?: FounderActionPlan | null
  iterations_used?: number
  convergence_reason?: string | null
  iteration_scores?: number[]
  models_used?: Record<string, string>
  results: AgentAnalysisResults
  execution_log: AgentExecutionLogEntry[]
  critique: AgentCritique
}

export interface StartAnalysisResponse {
  agent_run_id: string
  status: "pending" | "running" | "completed" | "partial" | "failed" | "quota_exhausted" | "awaiting_clarification"
  mode?: "async" | "sync_fallback" | "cached"
  result?: AgentAnalysisResponse
  critique?: Partial<AgentCritique> & { error?: string; message?: string }
  error?: string
  clarification_questions?: string[]
}

export interface AgentAnalysisStatusResponse {
  agent_run_id: string
  idea_id: string
  status: "pending" | "running" | "completed" | "partial" | "failed" | "quota_exhausted" | "awaiting_clarification"
  execution_log: AgentExecutionLogEntry[]
  critique?: Partial<AgentCritique> & { error?: string; message?: string }
  confidence?: number | null
  iterations_used?: number
  convergence_reason?: string | null
  iteration_scores?: number[]
  result?: AgentAnalysisResponse
  clarification_questions?: string[]
}

export interface ClarificationState {
  questions: string[]
  run_id: string
}
