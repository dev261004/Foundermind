"use client"

import Link from "next/link"
import { motion } from "framer-motion"

export default function NotFound() {

  return (

    <div className="notfound-page">

      <div className="notfound-glow"/>

      {/* Neural network */}

      <motion.svg
        className="broken-network"
        viewBox="0 0 300 200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: .8 }}
      >

        {/* working connections */}

        <line x1="50" y1="80" x2="120" y2="40" className="neural-line"/>
        <line x1="120" y1="40" x2="200" y2="90" className="neural-line"/>
        <line x1="200" y1="90" x2="250" y2="40" className="neural-line"/>

        {/* broken connection */}

        <line x1="120" y1="40" x2="120" y2="120" className="broken-line"/>

        {/* nodes */}

        <circle cx="50" cy="80" r="4" className="node"/>
        <circle cx="120" cy="40" r="4" className="node"/>
        <circle cx="200" cy="90" r="4" className="node"/>
        <circle cx="250" cy="40" r="4" className="node"/>

        {/* broken node */}

        <circle cx="120" cy="120" r="4" className="broken-node"/>

      </motion.svg>

      {/* text */}

      <motion.div
        initial={{ y:20, opacity:0 }}
        animate={{ y:0, opacity:1 }}
        transition={{ delay:.4 }}
        className="notfound-content"
      >

        <h1 className="notfound-code">
          404
        </h1>

        <h2 className="notfound-title">
          Connection Lost
        </h2>

        <p className="notfound-text">
          FounderMind Agent searched its network but couldn't
          locate this page.
        </p>

        <Link href="/dashboard">
          <button className="notfound-btn">
            Return to Dashboard
          </button>
        </Link>

      </motion.div>

    </div>

  )
}