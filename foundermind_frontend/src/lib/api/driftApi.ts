import { apiClient } from "../axios"
import { DriftMetrics } from "@/types/drift"

export const fetchDriftMetrics = async (
  ideaType?: string
): Promise<DriftMetrics> => {
  const { data } = await apiClient.get<DriftMetrics>(
    ideaType
      ? `/agent_analysis/drift/${ideaType}/`
      : "/agent_analysis/drift/"
  )
  return data
}
