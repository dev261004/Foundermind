"use client";

import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { FundingSignal, FundingStage } from "@/types/analysis";

type SignalColor = "emerald" | "purple" | "blue" | "cyan" | "amber";

type FundingCardSignal = {
  amount: string;
  round: FundingStage;
  company: string;
  description: string;
  tags: string[];
  match: number;
  url: string;
  color: SignalColor;
};

const colorVariants = {
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    gradient: "from-emerald-300 to-emerald-500",
    line: "bg-emerald-500",
    glow: "rgba(16, 185, 129, 0.8)",
  },
  purple: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    gradient: "from-purple-300 to-purple-500",
    line: "bg-purple-500",
    glow: "rgba(168, 85, 247, 0.8)",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    gradient: "from-blue-300 to-blue-500",
    line: "bg-blue-500",
    glow: "rgba(59, 130, 246, 0.8)",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    gradient: "from-cyan-300 to-cyan-500",
    line: "bg-cyan-500",
    glow: "rgba(6, 182, 212, 0.8)",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    gradient: "from-amber-300 to-amber-500",
    line: "bg-amber-500",
    glow: "rgba(245, 158, 11, 0.8)",
  },
} as const;

function getStageColor(stage: FundingStage): SignalColor {
  switch (stage) {
    case "Pre-Seed":
    case "Seed":
      return "blue";
    case "Series A":
    case "Undisclosed":
      return "purple";
    case "Series B":
      return "emerald";
    case "Series C":
    case "Series D+":
      return "cyan";
    case "Grant":
      return "amber";
    default:
      return "purple";
  }
}

function normalizeSignal(signal: FundingSignal): FundingCardSignal {
  return {
    amount: signal.funding_amount,
    round: signal.funding_stage,
    company: signal.company_name,
    description: signal.description,
    tags: signal.investors,
    match: signal.relevance_score,
    url: signal.url,
    color: getStageColor(signal.funding_stage),
  };
}

function SignalCard({
  signal,
  index,
}: {
  signal: FundingCardSignal;
  index: number;
}) {
  const variant = colorVariants[signal.color];
  const hasUrl = signal.url.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: "easeOut" }}
      className="group relative flex flex-col md:flex-row items-stretch bg-white/[0.02] border border-white/5 hover:border-white/15 rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/[0.04] max-w-full"
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${variant.line} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
        style={{ boxShadow: `0 0 15px ${variant.glow}` }}
      />

      <div className="w-full md:w-[280px] shrink-0 p-8 flex flex-col justify-center border-b md:border-b-0 md:border-r border-white/5 relative overflow-hidden">
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 ${variant.bg} rounded-full blur-[60px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`}
        />

        <div className="relative z-10 flex flex-col items-start">
          <div
            className={`text-4xl lg:text-5xl font-display font-bold text-transparent bg-clip-text bg-gradient-to-br ${variant.gradient} tracking-tight mb-3`}
          >
            {signal.amount}
          </div>
          <span
            className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest ${variant.bg} ${variant.text} ${variant.border} border backdrop-blur-md`}
          >
            {signal.round}
          </span>
        </div>
      </div>

      <div className="flex-grow p-8 flex flex-col justify-center z-10 relative">
        <div className="flex items-start justify-between gap-4 mb-2">
          <h2 className="text-xl font-bold text-white group-hover:text-emerald-50 transition-colors">
            {signal.company}
          </h2>

          {hasUrl && (
            <div className="group/arrow relative shrink-0">
              <a
                href={signal.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.02] border border-white/[0.05] text-white/30 hover:text-white/90 hover:bg-white/[0.08] hover:border-white/[0.14] transition-colors"
              >
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-3 py-1.5 bg-slate-900 border border-white/10 text-slate-200 text-xs rounded-lg shadow-xl whitespace-nowrap opacity-0 invisible group-hover/arrow:opacity-100 group-hover/arrow:visible transition-all duration-200 z-50 pointer-events-none tracking-normal font-medium leading-none">
                View external signal
              </div>
            </div>
          )}
        </div>

        <p className="text-slate-400 text-sm leading-relaxed max-w-2xl mb-6">
          {signal.description}
        </p>

        {signal.tags.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-auto">
            {signal.tags.map((tag) => (
              <span
                key={tag}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 transition-colors rounded-full text-xs font-medium text-slate-300 border border-white/10 backdrop-blur-sm cursor-default"
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${variant.line} opacity-80`}
                />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="hidden md:flex flex-col items-center justify-center p-8 border-l border-white/5 bg-black/20 min-w-[160px] group/score relative cursor-default">
        <div className="relative flex items-center justify-center w-16 h-16 mb-2">
          <svg className="transform -rotate-90 w-16 h-16 pointer-events-none">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-white/5"
            />
            <motion.circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={175.93}
              initial={{ strokeDashoffset: 175.93 }}
              whileInView={{
                strokeDashoffset: 175.93 - (signal.match / 100) * 175.93,
              }}
              viewport={{ once: true }}
              transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
              className={variant.text}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-lg font-bold text-white tracking-tight">
              {signal.match}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-2 block w-full text-center">
          Score Match
        </span>

        <div className="absolute right-full top-1/2 -translate-y-1/2 mr-4 px-3 py-2 bg-slate-900 border border-white/10 text-slate-300 text-xs rounded-lg shadow-xl w-48 opacity-0 invisible group-hover/score:opacity-100 group-hover/score:visible transition-all duration-200 z-50 pointer-events-none">
          <div className="font-semibold text-white mb-1">Relevance Score</div>
          Based on your custom investment criteria and recent search parameters.
        </div>
      </div>
    </motion.div>
  );
}

interface FundingLandscapeProps {
  signals: FundingSignal[];
}

export function FundingLandscape({ signals }: FundingLandscapeProps) {
  return (
    <div className="flex flex-col gap-4">
      {signals.map((signal, index) => (
        <SignalCard
          key={`${signal.company_name}-${index}`}
          signal={normalizeSignal(signal)}
          index={index}
        />
      ))}
    </div>
  );
}
