"use client"

import { FormEvent, useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"

export default function LoginPage() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { login, register, isLoading, error, clearError } = useAuthStore()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [mode, setMode] = useState<"login" | "register">("login")

    useEffect(() => {
        const modeParam = searchParams.get("mode")
        if (modeParam === "register") {
            setMode("register")
        } else if (modeParam === "login") {
            setMode("login")
        }
    }, [searchParams])

    const isRegisterMode = mode === "register"

    const switchMode = (nextMode: "login" | "register") => {
        clearError()
        setMode(nextMode)
    }

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        clearError()

        const success = isRegisterMode
            ? await register(email, password)
            : await login(email, password)

        if (success) {
            router.push("/dashboard")
        }
    }

    return (
        <div className="login-page">
            <div className="login-glow" />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: .6 }}
                className="login-card"
            >
                <div className="auth-toggle" role="tablist" aria-label="Authentication mode">
                    <button
                        type="button"
                        className={`auth-toggle-button ${!isRegisterMode ? "active" : ""}`}
                        onClick={() => switchMode("login")}
                        disabled={isLoading}
                    >
                        Login
                    </button>

                    <button
                        type="button"
                        className={`auth-toggle-button ${isRegisterMode ? "active" : ""}`}
                        onClick={() => switchMode("register")}
                        disabled={isLoading}
                    >
                        Register
                    </button>
                </div>

                <h1 className="login-title">
                    {isRegisterMode ? "Create Account" : "Welcome Back"}
                </h1>

                <p className="login-subtitle">
                    {isRegisterMode
                        ? "Register once and you will be logged in automatically."
                        : "Login to continue using FounderMind AI"}
                </p>

                <form className="login-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="email">Email</label>

                        <input
                            id="email"
                            type="email"
                            placeholder="founder@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>

                        <input
                            id="password"
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>

                    {error && (
                        <p className="login-error">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        className="login-button"
                        disabled={isLoading}
                    >
                        {isLoading
                            ? isRegisterMode
                                ? "Creating account..."
                                : "Logging in..."
                            : isRegisterMode
                                ? "Register"
                                : "Login"}
                    </button>
                </form>

                <p className="auth-switch-text">
                    {isRegisterMode ? "Already have an account?" : "Need an account?"}{" "}
                    <button
                        type="button"
                        className="auth-switch-button"
                        onClick={() => switchMode(isRegisterMode ? "login" : "register")}
                        disabled={isLoading}
                    >
                        {isRegisterMode ? "Login here" : "Register here"}
                    </button>
                </p>
            </motion.div>
        </div>
    )
}
