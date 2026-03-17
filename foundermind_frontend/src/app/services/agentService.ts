import { apiClient } from "@/lib/axios"
import { AgentAnalysisResponse } from "@/types/analysis"

export interface RunAnalysisRequest {
  idea_id: string
}

const ANALYSIS_REQUEST_TIMEOUT_MS = 3 * 60 * 1000

export const agentService = {
  runAnalysis: async (data: RunAnalysisRequest): Promise<AgentAnalysisResponse> => {
    const response = await apiClient.post<AgentAnalysisResponse>("/agent/run/", data, {
      timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
    })
    return response.data
  },
}
