// /lib/axios.ts

import axios from "axios"

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
})

/**
 * Request interceptor — attach Bearer token if available.
 * We import useAuthStore lazily via getState() to avoid circular imports
 * (authService → apiClient → useAuthStore → authService).
 */
apiClient.interceptors.request.use((config) => {
  // Dynamic import to avoid circular dependency at module load time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { useAuthStore } = require("@/store/useAuthStore")
  const token: string | null = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

/**
 * Response interceptor — normalize backend error shape.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Unknown error"

    return Promise.reject({
      message,
      status: error.response?.status,
    })
  }
)