"use client"

import { FormEvent, Suspense, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordContent />
    </Suspense>
  )
}

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim() || ""
  const token = searchParams.get("token")?.trim() || ""
  const hasValidParams = Boolean(email && token)

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const passwordMismatch = useMemo(() => {
    if (!confirmPassword) return false
    return password !== confirmPassword
  }, [confirmPassword, password])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!hasValidParams) {
      setError("This reset link is invalid or incomplete.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await authService.resetPassword({
        email,
        token,
        password,
      })
      router.push("/login?mode=login")
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to reset password right now."))
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
        <h1 className="login-title">Reset Password</h1>
        <p className="login-subtitle">
          Create a new password for your FounderMind account.
        </p>

        {!hasValidParams ? (
          <>
            <p className="login-error">This reset link is invalid or incomplete.</p>
            <div className="auth-form-footer">
              <Link href="/forgot-password" className="auth-text-link">
                Request a new reset link -&gt;
              </Link>
            </div>
          </>
        ) : (
          <>
            <form className="login-form" onSubmit={handleSubmit}>
              <div className="input-group">
                <label htmlFor="reset-email">Email</label>
                <input id="reset-email" type="email" value={email} disabled readOnly />
              </div>

              <div className="input-group">
                <label htmlFor="password">New Password</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Enter new password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="input-group">
                <label htmlFor="confirm-password">Confirm Password</label>
                <input
                  id="confirm-password"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>

              {passwordMismatch && (
                <p className="login-error">Passwords do not match.</p>
              )}

              {error && <p className="login-error">{error}</p>}

              <button
                type="submit"
                className="login-button"
                disabled={isSubmitting || passwordMismatch}
              >
                {isSubmitting ? "Resetting password..." : "Reset password"}
              </button>
            </form>

            <div className="auth-form-footer">
              <Link href="/login" className="auth-text-link">
                Back to login -&gt;
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
