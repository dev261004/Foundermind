"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  Crosshair,
  Briefcase,
  Rocket,
  Presentation,
  BrainCircuit,
} from "lucide-react";

const NODES = [
  {
    id: "market-models",
    title: "Market Models",
    icon: TrendingUp,
    x: 350,
    y: 80,
    color: "from-blue-400 to-cyan-300",
    shadow: "shadow-cyan-500/50",
    description:
      "Calculates TAM/SAM/SOM and models market drift to identify timing and long-term viability.",
    metrics: ["TAM/SAM/SOM", "Market Drift", "Trend Analysis"],
  },
  {
    id: "competitor-ai",
    title: "Competitor AI",
    icon: Crosshair,
    x: 100,
    y: 240,
    color: "from-fuchsia-400 to-pink-400",
    shadow: "shadow-purple-500/50",
    description:
      "Scours the web to build a comparative matrix of direct and indirect competitors.",
    metrics: ["Competitor Matrix", "Feature Mapping", "Pricing Models"],
  },
  {
    id: "investor-matching",
    title: "Funding Data",
    icon: Briefcase,
    x: 600,
    y: 240,
    color: "from-emerald-400 to-teal-300",
    shadow: "shadow-emerald-500/50",
    description:
      "Analyzes recent rounds, active funds, and matching criteria for optimal fundraising.",
    metrics: ["Active Investors", "Recent Rounds", "Valuation Benchmarks"],
  },
  {
    id: "startup-forecast",
    title: "Startup Forecast",
    icon: Rocket,
    x: 350,
    y: 400,
    color: "from-orange-400 to-amber-300",
    shadow: "shadow-orange-500/50",
    description:
      "Synthesizes market and competitor data into a comprehensive strategic SWOT profile and Risk Assessment.",
    metrics: ["SWOT Analysis", "Risk Engine", "Weighted Scoring"],
  },
  {
    id: "pitch-builder",
    title: "Pitch Builder",
    icon: Presentation,
    x: 350,
    y: 560,
    color: "from-indigo-400 to-blue-400",
    shadow: "shadow-indigo-500/50",
    description:
      "Translates all analytical findings into a cohesive, investor-ready pitch presentation.",
    metrics: ["Slide Generation", "Narrative Flow", "Export to PDF"],
  },
];

const CONNECTIONS = [
  { from: "market-models", to: "competitor-ai", curve: "M350,80 Q225,160 100,240" },
  { from: "market-models", to: "investor-matching", curve: "M350,80 Q475,160 600,240" },
  { from: "competitor-ai", to: "startup-forecast", curve: "M100,240 Q225,320 350,400" },
  { from: "investor-matching", to: "startup-forecast", curve: "M600,240 Q475,320 350,400" },
  { from: "startup-forecast", to: "pitch-builder", curve: "M350,400 L350,560" },
];

export default function IntelligenceEngine() {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-neutral-950 py-24 font-sans text-white">
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="absolute inset-0 bg-neutral-950 [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,transparent_10%,black_100%)]" />

        <div className="absolute left-1/4 top-0 h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 h-[600px] w-[600px] rounded-full bg-fuchsia-600/10 blur-[150px]" />
        <div className="absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-900/10 blur-[150px]" />
      </div>

      <div className="relative z-10 mb-16 text-center">
        <motion.h2
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4 text-5xl font-bold tracking-tight md:text-6xl"
        >
          FounderMind{" "}
          <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Intelligence Engine
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mx-auto max-w-2xl text-lg text-neutral-400"
        >
          Watch how our orchestrator agents transform raw startup concepts into
          validated, investor-ready business models through autonomous research.
        </motion.p>
      </div>

      <div className="relative mx-auto mt-8 aspect-[700/650] w-full max-w-[700px] xl:scale-110">
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 700 650"
        >
          <defs>
            <linearGradient id="line-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.2" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {CONNECTIONS.map((conn, idx) => (
            <path
              key={`base-${idx}`}
              d={conn.curve}
              fill="none"
              stroke="#333"
              strokeWidth="2"
              strokeDasharray="6 6"
            />
          ))}

          {CONNECTIONS.map((conn, idx) => {
            const isActive = activeNode === conn.from || activeNode === conn.to;
            return (
              <motion.path
                key={`flow-${idx}`}
                d={conn.curve}
                fill="none"
                stroke="url(#line-gradient)"
                strokeWidth={isActive ? "4" : "2"}
                filter={isActive ? "url(#glow)" : ""}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: isActive ? 1 : 0.6,
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "linear",
                }}
              />
            );
          })}
        </svg>

        <div className="absolute inset-0">
          {NODES.map((node, index) => {
            const Icon = node.icon;
            const isActive = activeNode === node.id;
            const isHovered = activeNode !== null && !isActive;
            const leftPerc = `${(node.x / 700) * 100}%`;
            const topPerc = `${(node.y / 650) * 100}%`;

            return (
              <motion.div
                key={node.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer ${isActive ? "z-50" : "z-20"}`}
                style={{ left: leftPerc, top: topPerc }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: isHovered ? 0.4 : 1,
                }}
                transition={{
                  scale: {
                    delay: index * 0.15,
                    type: "spring",
                    stiffness: 200,
                    damping: 20,
                  },
                  opacity: { duration: 0.3 },
                }}
                onMouseEnter={() => setActiveNode(node.id)}
                onMouseLeave={() => setActiveNode(null)}
              >
                <div className="relative flex flex-col items-center group">
                  <div
                    className={`
                      relative w-20 h-20 rounded-full flex items-center justify-center
                      bg-neutral-900 border transition-all duration-500 z-10
                      ${isActive ? "scale-110 border-white/50 shadow-[0_0_40px_rgba(255,255,255,0.2)]" : "border-neutral-600 shadow-xl group-hover:border-white/30 group-hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"}
                    `}
                  >
                    {isActive && (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className={`absolute inset-[-6px] rounded-full border border-dashed opacity-50
                          ${node.color.split(" ")[0].replace("from-", "border-")}
                        `}
                      />
                    )}

                    <div
                      className={`
                        absolute inset-0 rounded-full bg-gradient-to-br ${node.color}
                        transition-all duration-300 flex items-center justify-center
                        ${isActive ? "opacity-100 scale-105" : "opacity-70 group-hover:opacity-90"}
                      `}
                    />

                    <Icon
                      className={`
                        w-8 h-8 relative z-20 transition-all duration-300 drop-shadow-md
                        ${isActive ? "text-white scale-110" : "text-neutral-200 group-hover:text-white"}
                      `}
                    />
                  </div>

                  <div className="mt-4 text-center z-10 w-40">
                    <span
                      className={`block text-sm font-medium tracking-wide transition-colors duration-300 ${isActive ? "text-white" : "text-neutral-200 group-hover:text-white"}`}
                    >
                      {node.title}
                    </span>
                  </div>

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                        exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-50 w-72 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 p-5 shadow-[0_0_50px_rgba(0,0,0,0.9)] pointer-events-none md:w-80"
                        style={{
                          ...(node.x > 350
                            ? { right: "110%", top: "50%", transform: "translateY(-50%)" }
                            : node.x < 350
                              ? { left: "110%", top: "50%", transform: "translateY(-50%)" }
                              : node.y > 350
                                ? { left: "110%", bottom: "0%" }
                                : { left: "110%", top: "0%" }),
                        }}
                      >
                        <div
                          className={`absolute left-0 top-0 h-[2px] w-full bg-gradient-to-r ${node.color} opacity-80`}
                        />

                        <div className="absolute left-0 top-0 h-2 w-2 border-l border-t border-white/20" />
                        <div className="absolute right-0 top-0 h-2 w-2 border-r border-t border-white/20" />
                        <div className="absolute bottom-0 left-0 h-2 w-2 border-b border-l border-white/20" />
                        <div className="absolute bottom-0 right-0 h-2 w-2 border-b border-r border-white/20" />

                        <div className="mb-4 flex items-center gap-3 border-b border-white/10 pb-3">
                          <BrainCircuit className="h-4 w-4 text-cyan-400" />
                          <h4 className="text-sm font-mono uppercase tracking-wider text-white">
                            {node.title}
                          </h4>
                        </div>

                        <p className="mb-6 text-sm leading-relaxed text-neutral-300">
                          {node.description}
                        </p>

                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-neutral-400">
                            <span className="h-2 w-2 rounded-full bg-cyan-500/50" />
                            Active Variables
                          </div>
                          {node.metrics.map((metric, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-3 rounded-sm border border-neutral-800/50 bg-neutral-900/50 p-2 font-mono text-sm text-neutral-300"
                            >
                              <span className="text-cyan-500/50">[{i + 1}]</span>
                              {metric}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
