"use client"

import { motion } from "framer-motion"

export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 backdrop-blur-lg border-b border-white/5">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-6 py-4">

        <motion.h1 
          initial={{opacity:0,y:-10}}
          animate={{opacity:1,y:0}}
          className="text-xl font-bold gradient-text"
        >
          FounderMind
        </motion.h1>

        <div className="flex gap-4">
          <button className="text-sm text-gray-300 hover:text-white">
            Login
          </button>

          <button className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-sm glow-button">
            Sign Up
          </button>
        </div>
      </div>
    </nav>
  )
}