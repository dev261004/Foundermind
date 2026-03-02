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
 * Response interceptor
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Normalize backend error shape
    const message =
      error.response?.data?.message ||
      error.message ||
      "Unknown error"

    return Promise.reject({
      message,
      status: error.response?.status,
    })
  }
)