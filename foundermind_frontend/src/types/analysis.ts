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

export interface AgentAnalysisResults {
  similar_startups?: string
  market_data?: string
  market_quantitative_model?: MarketQuantitativeModel | null
  funding_info?: string
  monetization?: string
  customer_profile?: string
  tech_stack?: string
  swot?: string
}

export interface AgentCritique {
  overall_score: number
  section_scores: Record<string, number>
  issues_found: string[]
  rerun_tools: string[]
  needs_rerun: boolean
}

export interface AgentExecutionLogEntry {
  type?: string
  tool?: string
  status?: string
  error?: string
  idea_type?: string
  classification_source?: string
  classification_confidence?: number
  weights_used?: Record<string, number>
  iteration?: number
  rerun_tools?: string[]
  reason?: string
}

export interface AgentAnalysisResponse {
  idea_type: string
  classification_confidence: number
  analysis_confidence: number
  results: AgentAnalysisResults
  execution_log: AgentExecutionLogEntry[]
  critique: AgentCritique
}
