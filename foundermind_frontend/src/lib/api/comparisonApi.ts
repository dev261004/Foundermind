import { apiClient } from "../axios"
import {
  ComparisonOptionsResponse,
  ComparisonResult,
} from "@/types/comparison"

export const fetchComparisonOptions =
  async (): Promise<ComparisonOptionsResponse> => {
    const { data } = await apiClient.get<ComparisonOptionsResponse>(
      "/agent_analysis/comparisons/options/"
    )
    return data
  }

export const compareAnalysisRuns = async (
  runIds: string[]
): Promise<ComparisonResult> => {
  const { data } = await apiClient.post<ComparisonResult>(
    "/agent_analysis/comparisons/analyses/",
    { run_ids: runIds }
  )
  return data
}

export const compareIdeas = async (
  ideaIds: string[]
): Promise<ComparisonResult> => {
  const { data } = await apiClient.post<ComparisonResult>(
    "/agent_analysis/comparisons/ideas/",
    { idea_ids: ideaIds }
  )
  return data
}
