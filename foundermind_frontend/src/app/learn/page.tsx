"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { startupGuideContent } from "../startup-guide/content";
import { fundingGlossaryContent } from "./fundingContent";
import { ArrowLeft, BookOpen, GraduationCap } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LearnPage() {
  const [activeTab, setActiveTab] = useState<"startup" | "funding">("startup");

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-indigo-500/30">
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
          className="mb-10 border-b border-white/10 pb-8"
        >
          <div className="inline-flex items-center justify-center p-3 bg-white/5 rounded-2xl mb-6 ring-1 ring-white/10">
            <GraduationCap className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-white">
            Founder's Learning Center
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl">
            Everything you need to know about building and funding your startup.
          </p>
        </motion.div>

        {/* Tabs */}
        <div className="flex space-x-2 mb-8 bg-white/5 p-1 rounded-xl w-fit border border-white/10">
          <button
            onClick={() => setActiveTab("startup")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "startup"
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
          >
            Startup Guide
          </button>
          <button
            onClick={() => setActiveTab("funding")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === "funding"
                ? "bg-white/10 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              }`}
          >
            Funding Glossary
          </button>
        </div>

        {/* Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
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
            prose-td:p-4 prose-td:border prose-td:border-white/10 prose-td:text-zinc-300"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {activeTab === "startup" ? startupGuideContent : fundingGlossaryContent}
          </ReactMarkdown>
        </motion.div>
      </div>
    </div>
  );
}
