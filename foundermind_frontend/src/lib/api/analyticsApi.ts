import { apiClient } from "../axios"
import { AnalyticsSummary, RecalibrationResult } from "@/types/analytics"

export const fetchAnalyticsSummary = async (): Promise<AnalyticsSummary> => {
  const { data } = await apiClient.get<AnalyticsSummary>(
    "/agent_analysis/summary/"
  )
  return data
}

export const recalibrateWeights = async (
  ideaType: string
): Promise<RecalibrationResult> => {
  const { data } = await apiClient.post<RecalibrationResult>(
    "/agent_analysis/recalibrate/",
    { idea_type: ideaType }
  )
  return data
}
