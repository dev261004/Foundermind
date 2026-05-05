"use client"

import { FormEvent, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useSearchParams } from "next/navigation"
import { authService } from "@/app/services/authService"

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: string }).message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return fallback
}

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim() || ""
  const hasEmail = Boolean(email)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const showRegisterLink = useMemo(
    () => (error || "").toLowerCase().includes("register yourself"),
    [error]
  )

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasEmail) {
      setError("Please enter your email on the login page first.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await authService.requestPasswordReset({ email })
      setSuccessMessage(`password reset link has been sent to ${email}`)
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to send reset email right now."))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-glow" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="login-card"
      >
        <h1 className="login-title">Forgot Password</h1>
        <p className="login-subtitle">
          We&apos;ll send a secure reset link to your account email.
        </p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              required={hasEmail}
              disabled
              readOnly
            />
          </div>

          {error && <p className="login-error">{error}</p>}
          {successMessage && <p className="login-success">{successMessage}</p>}

          <button type="submit" className="login-button" disabled={isSubmitting || !hasEmail}>
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        {showRegisterLink && (
          <div className="auth-form-footer">
            <Link href="/login?mode=register" className="auth-text-link">
              Register yourself -&gt;
            </Link>
          </div>
        )}

        {!showRegisterLink && (
          <div className="auth-form-footer">
            <Link href="/login?mode=login" className="auth-text-link">
              Back to login -&gt;
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}
