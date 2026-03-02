import { apiClient } from "../axios"
import { DriftMetrics } from "@/types/drift"

export const fetchDriftMetrics = async (): Promise<DriftMetrics> => {
  const { data } = await apiClient.get<DriftMetrics>(
    "/analytics/drift"
  )
  return data
}