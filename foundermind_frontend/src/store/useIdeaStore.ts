import { create } from "zustand"
import { ideaService } from "@/app/services/ideaService"

type SubmissionStatus = "idle" | "submitting" | "running" | "completed" | "failed"

export type Stage =
  | "planning"
  | "executing"
  | "critic"
  | "rerun"
  | "final"
  | "failed"
  | null

interface IdeaState {
  ideaInput: string
  industry?: string
  region?: string

  ideaId: string | null
  submissionStatus: SubmissionStatus
  currentStage: Stage
  error: string | null

  setIdeaInput: (value: string) => void
  setMetadata: (industry: string, region: string) => void

  startSubmission: () => void
  createIdea: (payload: {
    userEmail: string
    title: string
    description?: string
  }) => Promise<string | null>
  setIdeaId: (id: string) => void
  setStage: (stage: Stage) => void
  setStatus: (status: SubmissionStatus) => void
  clearError: () => void

  reset: () => void
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideaInput: "",
  industry: undefined,
  region: undefined,

  ideaId: null,
  submissionStatus: "idle",
  currentStage: null,
  error: null,

  setIdeaInput: (value) => set({ ideaInput: value }),
  setMetadata: (industry, region) => set({ industry, region }),

  startSubmission: () =>
    set({ submissionStatus: "submitting", error: null }),

  createIdea: async ({ userEmail, title, description }) => {
    set({ submissionStatus: "submitting", error: null })

    try {
      const data = await ideaService.create({
        user_email: userEmail,
        title,
        description,
      })
      const ideaId = data.idea.id

      set({
        ideaId,
        ideaInput: title,
        submissionStatus: "running",
        error: null,
      })

      return ideaId
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Idea submission failed. Please try again."

      set({
        submissionStatus: "failed",
        error: message,
      })

      return null
    }
  },

  setIdeaId: (id) =>
    set({ ideaId: id, submissionStatus: "running" }),

  setStage: (stage) =>
    set({ currentStage: stage }),

  setStatus: (status) =>
    set({ submissionStatus: status }),

  clearError: () =>
    set({ error: null }),

  reset: () =>
    set({
      ideaInput: "",
      ideaId: null,
      submissionStatus: "idle",
      currentStage: null,
      error: null,
    }),
}))
