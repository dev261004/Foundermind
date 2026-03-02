// /types/common.ts

export type AsyncStatus = "idle" | "loading" | "success" | "error"

export interface ApiError {
  message: string
  code?: string
  status?: number
}