"use client"

import { motion } from "framer-motion"

export default function LoginPage() {

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

                <form className="login-form">

                    <div className="input-group">

                        <label>Email</label>

                        <input
                            type="email"
                            placeholder="founder@example.com"
                        />

                    </div>

                    <div className="input-group">

                        <label>Password</label>

                        <input
                            type="password"
                            placeholder="Enter password"
                        />

                    </div>

                    <button className="login-button">
                        Login
                    </button>

                </form>

            </motion.div>

        </div>

    )

}