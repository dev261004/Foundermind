import { apiClient } from "@/lib/axios"
import {
  AgentAnalysisResponse,
  AgentAnalysisStatusResponse,
  StartAnalysisResponse,
} from "@/types/analysis"

export interface RunAnalysisRequest {
  idea_id: string
  force?: boolean
}

export interface ClarificationRequest {
  answers: Record<string, string>
}

export interface ClarificationResponse {
  status: string
  run_id: string
}

export type StopAnalysisAction = "edit" | "new_idea" | "terminate"

export interface StopAnalysisResponse {
  status: "cancelled" | "terminated"
  agent_run_id?: string
  idea_id: string
  title?: string
  description?: string
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

  submitClarification: async (runId: string, answers: Record<string, string>): Promise<ClarificationResponse> => {
    const response = await apiClient.post<ClarificationResponse>(`/agent/clarify/${runId}/`, {
      answers,
    })
    return response.data
  },

  stopAnalysis: async (runId: string, action: StopAnalysisAction): Promise<StopAnalysisResponse> => {
    const response = await apiClient.post<StopAnalysisResponse>(`/agent/stop/${runId}/`, {
      action,
    })
    return response.data
  },
}
