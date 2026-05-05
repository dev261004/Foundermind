"use client"

import React, { FormEvent, useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store/useAuthStore"
import { useIdeaStore } from "@/store/useIdeaStore"
import { 
  X, Loader2, Sparkles, Target, AlertTriangle, 
  Lightbulb, CheckCircle2, Shield, Brain, 
  Zap, ChevronRight, FileText, BarChart3,
  Cpu, Users, Layers, Activity,
  Presentation, DollarSign
} from 'lucide-react';

const CAPABILITIES = [
  {
    title: "Strategic Planning",
    desc: "Defines core positioning and maps out validation vectors for product-market fit.",
    icon: Brain,
    color: "text-purple-400",
    bg: "from-purple-500/20 border-purple-500/20"
  },
  {
    title: "Market Execution",
    desc: "Analyzes competitor landscapes and calculates Total Addressable Market (TAM).",
    icon: Zap,
    color: "text-blue-400",
    bg: "from-blue-500/20 border-blue-500/20"
  },
  {
    title: "Risk Criticism",
    desc: "Identifies structural vulnerabilities and potential failure points in the business model.",
    icon: Shield,
    color: "text-amber-400",
    bg: "from-amber-500/20 border-amber-500/20"
  },
  {
    title: "Monetization Strategy",
    desc: "Generates viable revenue models and optimized pricing structures.",
    icon: BarChart3,
    color: "text-emerald-400",
    bg: "from-emerald-500/20 border-emerald-500/20"
  },
  {
    title: "Tech Stack Generation",
    desc: "Suggests the most scalable and efficient technologies for your MVP.",
    icon: Layers,
    color: "text-cyan-400",
    bg: "from-cyan-500/20 border-cyan-500/20"
  },
  {
    title: "Ideal Customer Profile",
    desc: "Develops targeted buyer personas and identifies early adopter segments.",
    icon: Users,
    color: "text-pink-400",
    bg: "from-pink-500/20 border-pink-500/20"
  },
  {
    title: "Funding Landscape",
    desc: "Evaluates capital raising viability and scans recent investment trends.",
    icon: DollarSign,
    color: "text-yellow-400",
    bg: "from-yellow-500/20 border-yellow-500/20"
  },
  {
    title: "Pitch Deck Generation",
    desc: "Structures investor-ready narrative flows and key presentation content.",
    icon: Presentation,
    color: "text-orange-400",
    bg: "from-orange-500/20 border-orange-500/20"
  }
];

interface Props {
  open?: boolean
  onClose?: () => void
}

export default function IdeaForm({ open = true, onClose = () => {} }: Props) {
  const router = useRouter()
  const authEmail = useAuthStore((state) => state.email)
  const createIdea = useIdeaStore((state) => state.createIdea)
  const submissionStatus = useIdeaStore((state) => state.submissionStatus)
  const storeError = useIdeaStore((state) => state.error)
  const clearError = useIdeaStore((state) => state.clearError)

  const [guestEmail, setGuestEmail] = useState("")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  useEffect(() => {
    if (open) {
      clearError()
    }
  }, [open, clearError])

  const isSubmitting = submissionStatus === "submitting"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearError()

    const trimmedEmail = (authEmail ?? guestEmail).trim()
    const trimmedTitle = title.trim()
    const trimmedDescription = description.trim()

    if (!trimmedEmail || !trimmedTitle || trimmedDescription.length < 150) {
      return
    }

    const ideaId = await createIdea({
      userEmail: trimmedEmail,
      title: trimmedTitle,
      description: trimmedDescription,
    })

    if (!ideaId) {
      return
    }

    if (onClose) onClose()
    router.push(`/idea/${ideaId}`)
  }

  if (!open) return null;

  return (
    <div className="min-h-screen bg-[#020203] text-white selection:bg-blue-500/30 font-sans overflow-x-hidden w-full">
      {/* Immersive Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_-20%,#1e1b4b_0%,transparent_50%)]" />
        <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        {/* Subtle animated grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-24 pb-12 flex flex-col items-center">
        {/* Branding Centered */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <h1 className="text-6xl md:text-8xl font-black tracking-tighter mb-4 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent">
            Foundermind
          </h1>
          <p className="text-white/40 max-w-lg mx-auto text-lg font-light leading-relaxed">
            Transform raw startup ideas into market-validated concepts through deep strategic analysis.
          </p>
        </motion.div>

        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          {/* Left Column: Capabilities Slider */}
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
            className="lg:col-span-5 w-full relative pt-4"
          >
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-black text-indigo-400 mb-8 flex items-center gap-2">
              <Sparkles size={14} className="animate-pulse" /> Agent Capabilities
            </h3>
            
            <div 
              className="relative h-[440px] overflow-hidden -mx-4 px-4" 
              style={{ maskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)' }}
            >
              <motion.div
                animate={{ y: ["0%", "-50%"] }}
                transition={{
                  y: {
                    repeat: Infinity,
                    repeatType: "loop",
                    duration: 25,
                    ease: "linear",
                  },
                }}
                className="flex flex-col w-full"
              >
                {[1, 2].map((blockIdx) => (
                  <div key={blockIdx} className="flex flex-col gap-6 pb-6 w-full">
                    {CAPABILITIES.map((cap, i) => (
                      <div key={i} className="flex gap-4 items-start">
                        <div className={`shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-b ${cap.bg} border flex items-center justify-center ${cap.color}`}>   
                          {React.createElement(cap.icon, { size: 20 })}
                        </div>
                        <div>
                          <h4 className="font-bold text-white/90 mb-1">{cap.title}</h4>
                          <p className="text-sm text-white/40 leading-relaxed max-w-sm">
                            {cap.desc}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </motion.div>
            </div>
          </motion.div>

          {/* Right Column: Input Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full lg:col-span-7"
          >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-[2.5rem] blur-2xl opacity-50 group-hover:opacity-75 transition duration-1000" />
            
            <div className="relative bg-[#0A0A0B]/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-10 shadow-2xl overflow-hidden">
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="flex flex-col gap-3">
                  <label className="text-[10px] uppercase tracking-widest text-white ml-1">Email</label>
                  <input
                    type="email"
                    required
                    disabled={isSubmitting || Boolean(authEmail)}
                    placeholder={authEmail ? "Authenticated" : "you@example.com"}
                    value={authEmail ?? guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none disabled:opacity-60 disabled:cursor-not-allowed text-white/90 focus:border-blue-500/50 focus:bg-white/[0.08] transition-all font-mono text-sm"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <label className="text-[10px] uppercase tracking-widest text-white ml-1">Idea Title</label>
                  <input
                    type="text"
                    required
                    disabled={isSubmitting}
                    placeholder="AI powered hiring platform"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none focus:border-blue-500/50 focus:bg-white/[0.08] transition-all placeholder:text-white/20"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex justify-between items-end mb-1">
                    <label className="text-[10px] uppercase tracking-widest text-white ml-1">Business Hypothesis</label>
                  </div>
                  <div className="space-y-2">
                    <textarea
                      required
                      disabled={isSubmitting}
                      rows={6}
                      minLength={150}
                      maxLength={1000}
                      placeholder="Describe your startup hypothesis, target market, and unique value proposition. Be as detailed as possible to allow the agents to accurately plan and model your idea."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className={`w-full bg-white/5 border rounded-2xl px-5 py-4 outline-none transition-all placeholder:text-white/20 resize-y min-h-[140px] max-h-[500px] ${
                        description.length >= 800 ? 'border-red-500/50 focus:border-red-500 focus:bg-red-500/5' :
                        description.length >= 600 ? 'border-amber-500/50 focus:border-amber-500 focus:bg-amber-500/5' :
                        'border-white/10 focus:border-blue-500/50 focus:bg-white/[0.08]'
                      }`}
                    />
                    <div className="flex justify-between items-start mt-2 px-1">
                      <div className="flex-1">
                        {description.length > 0 && description.length < 150 && (
                          <p className="text-[10.5px] text-amber-400/90 font-medium tracking-wide mt-1 flex items-center gap-1.5">
                            <AlertTriangle size={12} />
                            Minimum 150 characters required
                          </p>
                        )}
                      </div>
                      <span className={`shrink-0 text-[10px] uppercase tracking-widest font-bold transition-colors mt-1 ${
                        description.length > 800 ? 'text-red-400' :
                        description.length >= 600 ? 'text-amber-400' :
                        description.length >= 150 ? 'text-white/60' :
                        'text-white/30'
                      }`}>
                        {description.length} / 1000
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || description.length < 150}
                  className="w-full h-16 relative bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl font-black text-[13px] uppercase tracking-[0.2em] shadow-[0_0_40px_-10px_rgba(79,70,229,0.4)] hover:shadow-[0_0_60px_-15px_rgba(79,70,229,0.7)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-500 active:scale-[0.98] group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 ease-out" />
                  <span className="flex items-center justify-center gap-3 relative z-10">
                    {isSubmitting ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Analyzing via Agents...
                      </>
                    ) : (
                      <>
                        Start Analysis
                        <ChevronRight size={18} className="transition-transform duration-300 group-hover:translate-x-1.5 group-hover:scale-110" />
                      </>
                    )}
                  </span>
                </button>
              </form>
            </div>
          </div>
          
          {storeError && (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 text-red-500/80 text-xs text-center font-bold tracking-widest uppercase"
            >
              {storeError}
            </motion.p>
          )}
        </motion.div>
        </div>
      </main>
    </div>
  )
}
