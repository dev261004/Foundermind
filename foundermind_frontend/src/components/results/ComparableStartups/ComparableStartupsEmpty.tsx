import { Radar, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

export function ComparableStartupsEmpty() {
  return (
    <div className="bg-neutral-950/30 overflow-hidden relative min-h-[400px]">
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative mb-6 group cursor-default"
        >
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full group-hover:bg-indigo-500/30 transition-colors duration-700" />
          <div className="w-20 h-20 rounded-[1.25rem] bg-[#0A0A0B] border border-white/[0.08] flex items-center justify-center shadow-2xl relative z-10 ring-1 ring-white/[0.02] overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <Radar
              className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300 transition-colors duration-500"
              strokeWidth={1.25}
            />
          </div>
        </motion.div>
        <motion.h3
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-[17px] font-medium text-white mb-2 tracking-tight"
        >
          No comparable startups
        </motion.h3>
        <motion.p
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[14px] text-neutral-400 max-w-[320px] mb-8 leading-relaxed font-medium"
        >
          We couldn&apos;t find any direct competitors in this space yet. Try
          broadening your research parameters.
        </motion.p>
        <motion.button
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="flex items-center justify-center gap-2.5 px-6 py-2.5 rounded-full bg-white text-neutral-950 hover:bg-neutral-200 text-[13px] font-semibold transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-95 group/btn"
        >
          <RefreshCw className="w-4 h-4 text-indigo-600 group-hover/btn:text-indigo-700 transition-colors" />
          Retry analysis
        </motion.button>
      </div>
    </div>
  );
}
