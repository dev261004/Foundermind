import { create } from "zustand"

type SubmissionStatus = "idle" | "submitting" | "running" | "completed" | "failed"

type Stage =
  | "planning"
  | "executing"
  | "critic"
  | "rerun"
  | "final"
  | null

interface IdeaState {
  ideaInput: string
  industry?: string
  region?: string

  ideaId: string | null
  submissionStatus: SubmissionStatus
  currentStage: Stage

  setIdeaInput: (value: string) => void
  setMetadata: (industry: string, region: string) => void

  startSubmission: () => void
  setIdeaId: (id: string) => void
  setStage: (stage: Stage) => void
  setStatus: (status: SubmissionStatus) => void

  reset: () => void
}

export const useIdeaStore = create<IdeaState>((set) => ({
  ideaInput: "",
  industry: undefined,
  region: undefined,

  ideaId: null,
  submissionStatus: "idle",
  currentStage: null,

  setIdeaInput: (value) => set({ ideaInput: value }),
  setMetadata: (industry, region) => set({ industry, region }),

  startSubmission: () =>
    set({ submissionStatus: "submitting" }),

  setIdeaId: (id) =>
    set({ ideaId: id, submissionStatus: "running" }),

  setStage: (stage) =>
    set({ currentStage: stage }),

  setStatus: (status) =>
    set({ submissionStatus: status }),

  reset: () =>
    set({
      ideaInput: "",
      ideaId: null,
      submissionStatus: "idle",
      currentStage: null,
    }),
}))