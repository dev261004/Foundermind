"use client"

import { useState, FormEvent } from "react"
import { motion } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"

export default function LoginPage() {
    const router = useRouter()
    const { login, isLoading, error, clearError } = useAuthStore()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        clearError()
        const success = await login(email, password)
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

                <h1 className="login-title">
                    Welcome Back
                </h1>

                <p className="login-subtitle">
                    Login to continue using FounderMind AI
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
                        {isLoading ? "Logging in…" : "Login"}
                    </button>

                </form>

            </motion.div>

        </div>

    )

}