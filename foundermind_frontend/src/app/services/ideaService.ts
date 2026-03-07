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

export const ideaService = {
  create: async (data: CreateIdeaRequest): Promise<CreateIdeaResponse> => {
    const response = await apiClient.post<CreateIdeaResponse>("/ideas/create/", data)
    return response.data
  },
}
