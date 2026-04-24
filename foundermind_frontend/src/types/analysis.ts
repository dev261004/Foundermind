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
