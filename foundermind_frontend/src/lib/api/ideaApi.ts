import { apiClient } from "../axios"
import { IdeaResponse } from "@/types/idea"
import { StageStatusResponse } from "@/types/agent"

export interface SubmitIdeaPayload {
  idea: string
  industry?: string
  region?: string
}

export interface SubmitIdeaResponse {
  idea_id: string
}

export const submitIdea = async (
  payload: SubmitIdeaPayload,
  signal?: AbortSignal
): Promise<SubmitIdeaResponse> => {
  const { data } = await apiClient.post<SubmitIdeaResponse>(
    "/ideas",
    payload,
    { signal }
  )
  return data
}

export const fetchIdeaStatus = async (
  ideaId: string,
  signal?: AbortSignal
): Promise<StageStatusResponse> => {
  const { data } = await apiClient.get<StageStatusResponse>(
    `/ideas/${ideaId}/status`,
    { signal }
  )
  return data
}

export const fetchIdeaResult = async (
  ideaId: string,
  signal?: AbortSignal
): Promise<IdeaResponse> => {
  const { data } = await apiClient.get<IdeaResponse>(
    `/ideas/${ideaId}/result`,
    { signal }
  )
  return data
}