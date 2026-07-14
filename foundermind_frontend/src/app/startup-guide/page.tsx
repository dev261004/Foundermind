"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { startupGuideContent } from "./content";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function StartupGuidePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30">
      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-16 md:py-24">
        {/* Navigation */}
        <Link 
          href="/" 
          className="inline-flex items-center text-sm font-medium text-zinc-400 hover:text-white transition-colors mb-12 group"
        >
          <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Home
        </Link>

        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16 border-b border-white/10 pb-12"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-6 ring-1 ring-white/10 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">
            Founder's Playbook
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl">
            A practical walkthrough of what it actually takes to go from idea to a working company.
          </p>
        </motion.div>

        {/* Content */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="prose prose-invert prose-lg max-w-none 
            prose-headings:text-white prose-headings:font-semibold
            prose-h2:text-2xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:pb-4 prose-h2:border-b prose-h2:border-white/10
            prose-h3:text-xl prose-h3:text-zinc-200
            prose-p:text-zinc-300 prose-p:leading-relaxed
            prose-li:text-zinc-300
            prose-strong:text-white prose-strong:font-semibold
            prose-a:text-indigo-400 prose-a:no-underline hover:prose-a:text-indigo-300 hover:prose-a:underline
            prose-table:border-collapse prose-table:w-full prose-table:text-sm prose-table:my-8
            prose-th:bg-white/5 prose-th:p-4 prose-th:text-left prose-th:font-medium prose-th:text-white prose-th:border prose-th:border-white/10
            prose-td:p-4 prose-td:border prose-td:border-white/10 prose-td:text-zinc-300
            bg-white/[0.02] p-8 md:p-12 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-sm"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {startupGuideContent}
          </ReactMarkdown>
        </motion.div>
      </div>
    </div>
  );
}
