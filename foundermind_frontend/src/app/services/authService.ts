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
}
