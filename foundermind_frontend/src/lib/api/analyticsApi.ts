import { apiClient } from "../axios"
import { AnalyticsMetrics } from "@/types/analytics"

export const fetchAnalyticsMetrics = async (): Promise<AnalyticsMetrics> => {
  const { data } = await apiClient.get<AnalyticsMetrics>(
    "/analytics/metrics"
  )
  return data
}