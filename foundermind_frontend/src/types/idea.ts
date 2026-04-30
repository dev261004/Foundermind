import type { CustomerProfile, SimilarStartup } from "@/types/analysis"

// /types/idea.ts

export type IdeaType = "tech" | "marketplace" | "deeptech" | "general"

export interface MarketQuantitativeModel {
  tam_billion_usd: number
  sam_billion_usd: number
  som_billion_usd: number

  calculated_cagr: number

  tam_score: number
  cagr_score: number
  opportunity_score: number
}

export interface IdeaResults {
  similar_startups: SimilarStartup[]
  market_data: string
  market_quantitative_model: MarketQuantitativeModel
  funding_info: string
  monetization: string
  customer_profile: CustomerProfile | string | null
  tech_stack: string
  swot: string
}

export interface SectionScores {
  [sectionName: string]: number
}

export interface Critique {
  overall_score: number
  section_scores: SectionScores
  needs_rerun: boolean
}

export interface ExecutionLogEntry {
  tool: string
  status: "success" | "failed" | "running"
  duration_ms: number
}

export interface IdeaResponse {
  idea_type: IdeaType
  results: IdeaResults
  critique: Critique
  execution_log: ExecutionLogEntry[]
  confidence_score: number
}
