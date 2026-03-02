import { apiClient } from "../axios"
import { IdeaResponse } from "@/types/idea"
import { StageStatusResponse } from "@/types/agent"

/**
 * Submit new idea
 */
export interface SubmitIdeaPayload {
  idea: string
  industry?: string
  region?: string
}

export interface SubmitIdeaResponse {
  idea_id: string
}

export const submitIdea = async (
  payload: SubmitIdeaPayload
): Promise<SubmitIdeaResponse> => {
  const { data } = await apiClient.post<SubmitIdeaResponse>(
    "/ideas",
    payload
  )
  return data
}

/**
 * Poll idea run status
 */
export const fetchIdeaStatus = async (
  ideaId: string
): Promise<StageStatusResponse> => {
  const { data } = await apiClient.get<StageStatusResponse>(
    `/ideas/${ideaId}/status`
  )
  return data
}

/**
 * Fetch full idea intelligence result
 */
export const fetchIdeaResult = async (
  ideaId: string
): Promise<IdeaResponse> => {
  const { data } = await apiClient.get<IdeaResponse>(
    `/ideas/${ideaId}/result`
  )
  return data
}