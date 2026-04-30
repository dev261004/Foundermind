"use client";

import { Cpu, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export function TechStackEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-[#14161f] border border-[#222631] shadow-inner flex items-center justify-center mb-5">
        <Cpu className="w-8 h-8 text-[#2a2e3d]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-300 mb-2 tracking-tight">
        No stack generated yet
      </h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">
        The agent needs more context to recommend an appropriate tech stack. Try
        providing more details about the product&apos;s scope and scale.
      </p>
      <motion.button
        type="button"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-200 text-[13px] font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 group/btn"
      >
        <RefreshCw className="w-4 h-4 text-indigo-600 group-hover/btn:text-indigo-700 transition-colors" />
        Retry analysis
      </motion.button>
    </div>
  );
}
