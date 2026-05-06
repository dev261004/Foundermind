import { create } from "zustand"
import { ideaService, UpdateIdeaResponse } from "@/app/services/ideaService"

type SubmissionStatus = "idle" | "submitting" | "running" | "completed" | "failed"
const EDIT_DRAFT_STORAGE_KEY = "foundermind.idea_edit_draft"

export type Stage =
  | "planning"
  | "executing"
  | "critic"
  | "rerun"
  | "final"
  | "failed"
  | null

export interface IdeaEditDraft {
  ideaId: string
  title: string
  description: string
}

function persistEditDraft(draft: IdeaEditDraft | null) {
  if (typeof window === "undefined") {
    return
  }

  if (!draft) {
    window.sessionStorage.removeItem(EDIT_DRAFT_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(EDIT_DRAFT_STORAGE_KEY, JSON.stringify(draft))
}

function restoreEditDraft(): IdeaEditDraft | null {
  if (typeof window === "undefined") {
    return null
  }

  const raw = window.sessionStorage.getItem(EDIT_DRAFT_STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as IdeaEditDraft
    if (
      parsed &&
      typeof parsed.ideaId === "string" &&
      typeof parsed.title === "string" &&
      typeof parsed.description === "string"
    ) {
      return parsed
    }
  } catch {
    window.sessionStorage.removeItem(EDIT_DRAFT_STORAGE_KEY)
  }

  return null
}

interface IdeaState {
  ideaInput: string
  industry?: string
  region?: string

  ideaId: string | null
  submissionStatus: SubmissionStatus
  currentStage: Stage
  error: string | null
  editDraft: IdeaEditDraft | null

  setIdeaInput: (value: string) => void
  setMetadata: (industry: string, region: string) => void
  setEditDraft: (draft: IdeaEditDraft) => void
  loadEditDraft: () => IdeaEditDraft | null
  clearEditDraft: () => void

  startSubmission: () => void
  createIdea: (payload: {
    userEmail: string
    title: string
    description?: string
  }) => Promise<string | null>
  updateIdea: (payload: {
    ideaId: string
    title: string
    description?: string
    resetAnalysis: boolean
  }) => Promise<UpdateIdeaResponse | null>
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
  editDraft: null,

  setIdeaInput: (value) => set({ ideaInput: value }),
  setMetadata: (industry, region) => set({ industry, region }),
  setEditDraft: (draft) => {
    persistEditDraft(draft)
    set({ editDraft: draft })
  },
  loadEditDraft: () => {
    const draft = restoreEditDraft()
    set({ editDraft: draft })
    return draft
  },
  clearEditDraft: () => {
    persistEditDraft(null)
    set({ editDraft: null })
  },

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

  updateIdea: async ({ ideaId, title, description, resetAnalysis }) => {
    set({ submissionStatus: "submitting", error: null })

    try {
      const data = await ideaService.updateIdea(ideaId, {
        title,
        description,
        reset_analysis: resetAnalysis,
      })

      set({
        ideaId,
        ideaInput: title,
        submissionStatus: data.rerun_required ? "running" : "completed",
        error: null,
      })

      return data
    } catch (err: unknown) {
      const message =
        (err as { message?: string })?.message ?? "Idea update failed. Please try again."

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

  reset: () => {
    persistEditDraft(null)
    set({
      ideaInput: "",
      ideaId: null,
      submissionStatus: "idle",
      currentStage: null,
      error: null,
      editDraft: null,
    })
  },
}))
