import { apiClient } from "@/lib/axios"

export interface CreateIdeaRequest {
  user_email: string
  title: string
  description?: string
}

export interface IdeaRecord {
  id: string
  user_email: string
  title: string
  description?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface CreateIdeaResponse {
  message: string
  idea: IdeaRecord
}

export interface IdeaHistoryItem {
  idea_id: string
  title: string
  description?: string
  status?: string
  created_at?: string
  updated_at?: string
  analyzed_at?: string
  agent_run_id?: string | null
  idea_type?: string | null
  analysis_confidence?: number | null
  overall_score?: number | null
  sections_ready: number
  preview: string
}

export interface IdeaHistoryResponse {
  history: IdeaHistoryItem[]
  count: number
}

export const ideaService = {
  create: async (data: CreateIdeaRequest): Promise<CreateIdeaResponse> => {
    const response = await apiClient.post<CreateIdeaResponse>("/ideas/create/", data)
    return response.data
  },

  getHistory: async (): Promise<IdeaHistoryResponse> => {
    const response = await apiClient.get<IdeaHistoryResponse>("/ideas/history/")
    return response.data
  },
}
