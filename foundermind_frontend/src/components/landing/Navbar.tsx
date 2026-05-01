"use client"
import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"

export default function Navbar() {
  const [hovered, setHovered] = useState<string | null>(null)
  const activeTab = hovered || "signup"

  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xl font-bold gradient-text"
        >
          FounderMind
        </motion.h1>

        <div className="relative flex items-center bg-white/[0.03] border border-white/10 rounded-full p-1 backdrop-blur-sm">
          <div className="relative flex items-center">
            <Link
              href="/login"
              className={`relative px-5 py-2 text-sm font-medium transition-colors duration-300 z-10 ${activeTab === 'login' ? 'text-white' : 'text-gray-400'}`}
              onMouseEnter={() => setHovered('login')}
              onMouseLeave={() => setHovered(null)}
            >
              {activeTab === 'login' && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-violet-600 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Login</span>
            </Link>

            <Link
              href="/login?mode=register"
              className={`relative px-5 py-2 text-sm font-medium transition-colors duration-300 z-10 ${activeTab === 'signup' ? 'text-white' : 'text-gray-400'}`}
              onMouseEnter={() => setHovered('signup')}
              onMouseLeave={() => setHovered(null)}
            >
              {activeTab === 'signup' && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-0 bg-violet-600 rounded-full shadow-[0_0_20px_rgba(124,58,237,0.3)]"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">Sign Up</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  )
}