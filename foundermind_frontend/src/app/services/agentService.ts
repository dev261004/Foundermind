import { apiClient } from "@/lib/axios"
import { AgentAnalysisResponse } from "@/types/analysis"

export interface RunAnalysisRequest {
  idea_id: string
}

export const agentService = {
  runAnalysis: async (data: RunAnalysisRequest): Promise<AgentAnalysisResponse> => {
    const response = await apiClient.post<AgentAnalysisResponse>("/agent/run/", data)
    return response.data
  },
}
