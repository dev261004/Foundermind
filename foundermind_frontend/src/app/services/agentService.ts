import { apiClient } from "@/lib/axios"
import {
  AgentAnalysisResponse,
  AgentAnalysisStatusResponse,
  StartAnalysisResponse,
} from "@/types/analysis"

export interface RunAnalysisRequest {
  idea_id: string
}

const ANALYSIS_REQUEST_TIMEOUT_MS = 3 * 60 * 1000

export const agentService = {
  startAnalysis: async (data: RunAnalysisRequest): Promise<StartAnalysisResponse> => {
    const response = await apiClient.post<StartAnalysisResponse>("/agent/start/", data, {
      timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
    })
    return response.data
  },

  getAnalysisStatus: async (runId: string): Promise<AgentAnalysisStatusResponse> => {
    const response = await apiClient.get<AgentAnalysisStatusResponse>(`/agent/status/${runId}/`, {
      timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
    })
    return response.data
  },

  runAnalysis: async (data: RunAnalysisRequest): Promise<AgentAnalysisResponse> => {
    const response = await apiClient.post<AgentAnalysisResponse>("/agent/run/", data, {
      timeout: ANALYSIS_REQUEST_TIMEOUT_MS,
    })
    return response.data
  },
}
