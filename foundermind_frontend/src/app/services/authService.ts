// src/app/services/authService.ts

import { apiClient } from "@/lib/axios"

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  email: string
  role?: "user" | "admin"
}

export interface RegisterRequest {
  email: string
  password: string
}

export interface RegisterResponse {
  message: string
  access_token: string
  refresh_token: string
  email: string
  role?: "user" | "admin"
}

export interface ForgotPasswordRequest {
  email: string
}

export interface ForgotPasswordResponse {
  message: string
}

export interface ResetPasswordRequest {
  email: string
  token: string
  password: string
}

export interface ResetPasswordResponse {
  message: string
}

async function postLocalJson<T>(url: string, data: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw {
      message:
        (payload as { error?: string; message?: string }).error ||
        (payload as { error?: string; message?: string }).message ||
        "Request failed. Please try again.",
    }
  }

  return payload as T
}

export const authService = {
  /**
   * Calls POST /users/login/
   * Returns access_token, refresh_token, and email on success.
   */
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>("/users/login/", data)
    return response.data
  },

  /**
   * Calls POST /users/register/
   */
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await apiClient.post<RegisterResponse>("/users/register/", data)
    return response.data
  },

  requestPasswordReset: async (
    data: ForgotPasswordRequest
  ): Promise<ForgotPasswordResponse> => {
    return postLocalJson<ForgotPasswordResponse>("/api/auth/forgot-password", data)
  },

  resetPassword: async (
    data: ResetPasswordRequest
  ): Promise<ResetPasswordResponse> => {
    const response = await apiClient.post<ResetPasswordResponse>(
      "/users/reset-password/",
      data
    )
    return response.data
  },
}
