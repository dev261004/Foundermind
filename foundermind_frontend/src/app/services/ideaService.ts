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

export interface UpdateIdeaRequest {
  title: string
  description?: string
  reset_analysis: boolean
}

export interface UpdateIdeaResponse {
  message: string
  idea: IdeaRecord
  rerun_required: boolean
}

export interface IdeaHistoryItem {
  idea_id: string
  title: string
  description?: string
  status?: "completed" | "partial" | "failed" | "quota_exhausted" | "active" | "cancelled"
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

export type IdeaHistoryStatusFilter =
  | "all"
  | "active"
  | "completed"
  | "partial"
  | "failed"
  | "cancelled"
  | "quota_exhausted"

export type IdeaHistorySort = "date-asc" | "date-desc" | "score-asc" | "score-desc"

export interface IdeaHistoryQueryParams {
  search?: string
  status?: IdeaHistoryStatusFilter
  sort?: IdeaHistorySort
}

export interface DeleteIdeaResponse {
  message: string
  idea_id: string
  status: "deleted"
}

export const ideaService = {
  create: async (data: CreateIdeaRequest): Promise<CreateIdeaResponse> => {
    const response = await apiClient.post<CreateIdeaResponse>("/ideas/create/", data)
    return response.data
  },

  updateIdea: async (ideaId: string, data: UpdateIdeaRequest): Promise<UpdateIdeaResponse> => {
    const response = await apiClient.patch<UpdateIdeaResponse>(`/ideas/${ideaId}/`, data)
    return response.data
  },

  getHistory: async (params: IdeaHistoryQueryParams = {}): Promise<IdeaHistoryResponse> => {
    const response = await apiClient.get<IdeaHistoryResponse>("/ideas/history/", {
      params,
    })
    return response.data
  },

  deleteIdea: async (ideaId: string): Promise<DeleteIdeaResponse> => {
    const response = await apiClient.delete<DeleteIdeaResponse>(`/ideas/${ideaId}/delete/`)
    return response.data
  },
}
