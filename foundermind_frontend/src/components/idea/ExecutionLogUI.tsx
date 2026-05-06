import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Circle,
  CircleDashed,
  Clock,
  Loader2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  ChevronDown
} from 'lucide-react';
import { AgentExecutionLogEntry } from "@/types/analysis";

interface ExecutionLogUIProps {
  executionLog: AgentExecutionLogEntry[];
  runStatus: "running" | "completed" | "error" | "awaiting_clarification" | "partial" | "quota_exhausted" | "idle" | "failed";
  errorMessage?: string | null;
  onRetry: () => void;
  ideaTitle: string;
  ideaType: string;
}

export function ExecutionLogUI({
  executionLog,
  runStatus,
  errorMessage,
  onRetry,
  ideaTitle,
  ideaType
}: ExecutionLogUIProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(0);
  const [hasRetried, setHasRetried] = useState(false);

  // Determine normalized status
  const normalizedStatus = 
    (runStatus === 'running' || runStatus === 'idle') ? 'running' :
    (runStatus === 'completed' || runStatus === 'partial' || runStatus === 'awaiting_clarification') ? 'completed' : 
    'error';

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (normalizedStatus === 'running') {
      interval = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [normalizedStatus]);

  // Cooldown logic: if it fails again after a retry, start 60s cooldown
  useEffect(() => {
    if (normalizedStatus === 'error' && hasRetried) {
      setRetryCooldown(60);
    }
  }, [normalizedStatus, hasRetried]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (retryCooldown > 0) {
      interval = setInterval(() => {
        setRetryCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [retryCooldown]);

  const handleRetryClick = () => {
    setHasRetried(true);
    setElapsedSeconds(0);
    onRetry();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Convert AgentExecutionLogEntry[] into timeline events
  const timelineEvents = executionLog.map((entry, index) => {
    let title = "Agent Event";
    if (entry.type === "quality_check") title = "Quality Check";
    else if (entry.type === "idea_refinement") title = "Idea Refinement";
    else if (entry.type === "idea_classification") title = "Idea Classification";
    else if (entry.type === "inter_tool_delay") title = "Inter-tool Pacing";
    else if (entry.type === "self_healing_cycle") title = `Self-healing Cycle ${entry.iteration ?? ""}`.trim();
    else if (entry.type === "convergence") title = "Convergence Decision";
    else if (entry.agent) title = entry.agent.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    else if (entry.tool) title = entry.tool.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    let description = entry.message || "Executing task...";
    
    // Detailed log descriptions
    if (entry.type === "idea_classification") {
      description = `Classified as ${entry.idea_type ?? "general"} using ${entry.classification_source ?? "unknown"} with confidence ${((entry.classification_confidence ?? 0) * 100).toFixed(0)}%.`;
    } else if (entry.type === "quality_check") {
      const score = entry.quality_score ?? 0;
      const missing = entry.missing_signals ?? [];
      if (entry.status === "awaiting_clarification") {
        description = `Quality score ${score}/4 — below threshold. Missing: ${missing.join(", ") || "none"}. Requesting user clarification.`;
      } else {
        description = `Quality score ${score}/4 — sufficient for analysis.`;
      }
    } else if (entry.type === "idea_refinement") {
      const origLen = entry.original_length ?? 0;
      const refLen = entry.refined_length ?? 0;
      description = `Description refined from ${origLen} to ${refLen} characters.`;
    } else if (entry.type === "self_healing_cycle") {
      const reruns = entry.rerun_tools?.map(t => t.replace(/_/g, " ")).join(", ") || "no tools";
      description = `Critic requested another pass using: ${reruns}.`;
    } else if (entry.type === "inter_tool_delay") {
      description = `Waiting ${entry.delay_seconds ?? 0}s before continuing after ${entry.after_tool?.replace(/_/g, " ") ?? "the previous tool"}.`;
    } else if (entry.type === "convergence") {
      description = entry.reason ?? "The orchestrator decided no further iterations were needed.";
    } else if (entry.agent && entry.error) {
      description = `${entry.agent.replace(/_/g, " ")} failed: ${entry.error}`;
    } else if (entry.agent) {
      description = entry.message ?? `${entry.agent.replace(/_/g, " ")} completed successfully.`;
    } else if (entry.tool) {
      if (entry.status === "skipped") {
        description = entry.message ?? `Skipping ${entry.tool.replace(/_/g, " ")} because a checkpoint already exists.`;
      } else if (entry.error) {
        description = `Failed while executing ${entry.tool.replace(/_/g, " ")}: ${entry.error}`;
      } else {
        description = entry.message ?? `Successfully executed ${entry.tool.replace(/_/g, " ")}.`;
      }
    }

    const isCompleted = normalizedStatus === 'completed' || index < executionLog.length - 1 || entry.status === 'completed';
    
    return {
      id: index,
      title,
      description,
      status: isCompleted ? 'Completed' : 'Started',
      metrics: {
        score: entry.average_score ?? entry.quality_score,
        issues: entry.issues_found?.length,
        iteration: entry.iteration
      }
    };
  });

  // If running, we might append a "fake" currently running step if the last one is completed
  // But usually executionLog just grows.

  return (
    <div className="w-full text-zinc-300 font-sans selection:bg-indigo-500/30 pb-12 relative">

      <div className="sticky top-4 sm:top-6 inset-x-0 z-50 flex justify-center pointer-events-none mb-12">
        <header className="pointer-events-auto bg-[#1c1c1f]/80 backdrop-blur-xl border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.4)] rounded-full px-2 sm:px-4 h-14 flex items-center justify-between w-[calc(100%-32px)] max-w-[1180px] relative overflow-hidden transition-all">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-transparent to-emerald-500/10 pointer-events-none" />

          <div className="flex-1 flex items-center gap-2 sm:gap-3 relative z-10 pl-2 min-w-0 pr-4">
            <div className="flex-shrink-0 flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex-shrink-0 text-sm font-bold text-white tracking-tight">Foundermind</span>
              <span className="flex-shrink-0 text-zinc-600 font-light hidden sm:block">/</span>
              <span className="text-sm font-medium text-zinc-300 hidden sm:block truncate" title={ideaTitle}>{ideaTitle}</span>
            </div>
          </div>

          <div className="hidden md:flex flex-shrink-0 items-center justify-center relative z-10">
            {normalizedStatus === 'completed' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-400 whitespace-nowrap">Analysis Complete</span>
              </div>
            )}
            {normalizedStatus === 'error' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-[11px] font-medium text-red-400 whitespace-nowrap">Analysis Failed</span>
              </div>
            )}
            {normalizedStatus === 'running' && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50">
                <span className="relative flex h-2 w-2 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-medium text-emerald-400 whitespace-nowrap">Analysis running...</span>
              </div>
            )}
          </div>

          <div className="flex-1 flex items-center justify-end gap-3 relative z-10 pr-1 flex-shrink-0">
             <div className="hidden lg:flex flex-col items-end mr-1">
               <span className="text-[9px] uppercase tracking-widest text-white font-bold mb-0.5">Idea Type</span>
               {elapsedSeconds > 3 || normalizedStatus === 'completed' ? (
                 <div className="flex items-center gap-1.5 animation-fade-in">
                   <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400" />
                   <span className="text-xs font-medium text-zinc-300 leading-none truncate max-w-[120px]">{ideaType || "General"}</span>
                 </div>
               ) : (
                 <div className="flex items-center gap-1.5 opacity-70">
                   <Loader2 className="w-2.5 h-2.5 text-indigo-400 animate-spin" />
                   <span className="text-[10px] font-mono text-zinc-400 leading-none">Generating...</span>
                 </div>
               )}
             </div>
             
             <a href="/dashboard/ideas" className="inline-flex flex-shrink-0 items-center justify-center px-4 py-2 rounded-full bg-white text-zinc-900 hover:bg-zinc-200 transition-colors text-xs font-semibold shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap">
               Idea History
             </a>
          </div>
        </header>
      </div>

      <div className="w-[calc(100%-32px)] max-w-[1180px] mx-auto relative z-10">
        
        {/* Status Hero */}
        {normalizedStatus !== 'completed' && (
          <div className="mb-12">
            <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-zinc-100 flex items-center gap-4">
             {normalizedStatus === 'error' && <AlertCircle className="w-8 h-8 text-red-500" />}
             {normalizedStatus === 'running' && <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />}
             {normalizedStatus === 'error' ? 'Analysis failed' : 'Running startup analysis...'}
          </h1>
          <p className="mt-4 text-base text-zinc-400 max-w-2xl leading-relaxed">
            {normalizedStatus === 'error'
              ? (errorMessage || 'An unexpected error or timeout occurred while gathering data. Time limits exceeded during execution. Review the logs below.')
              : 'Our AI agents are actively researching the market, analyzing competitors, and evaluating your idea. Watch the live progress below.'}
          </p>
          {normalizedStatus !== 'running' && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {normalizedStatus === 'error' && (
                 <button 
                   onClick={handleRetryClick} 
                   disabled={retryCooldown > 0}
                   className="flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-zinc-800 disabled:text-zinc-500 text-white text-sm font-medium transition-colors duration-200"
                 >
                    {retryCooldown > 0 ? (
                      <Clock className="w-4 h-4" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {retryCooldown > 0 ? `Retry in ${retryCooldown}s` : 'Retry Analysis'}
                 </button>
               )}
            </div>
          )}
          </div>
        )}

        {/* Professional Log UI */}
        <details className="relative bg-[#0c0c0e]/90 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4)] group overflow-hidden" open>
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent z-0" />
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none z-0" />

          <summary className="relative border-b border-white/[0.05] bg-white/[0.01] px-6 py-4 flex items-center justify-between z-10 cursor-pointer select-none">
             <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-zinc-200 tracking-tight">Execution Logs</span>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-zinc-800/50 text-[10px] font-mono text-zinc-400 border border-zinc-700/50 uppercase tracking-wider">
                     {timelineEvents.length} steps
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                     <Clock className="w-3.5 h-3.5 text-indigo-400" />
                     <span className="text-xs font-mono font-medium text-indigo-300 tracking-wide">{formatTime(elapsedSeconds)}</span>
                  </div>
                </div>
             </div>
             <div className="flex items-center gap-2">
                 {normalizedStatus === 'completed' && (
                   <span className="text-[10px] font-mono text-emerald-500/80 tracking-widest">● COMPLETED</span>
                 )}
                 {normalizedStatus === 'error' && (
                   <span className="text-[10px] font-mono text-red-500 tracking-widest">● FAILED</span>
                 )}
                 {normalizedStatus === 'running' && (
                   <span className="text-[10px] font-mono text-emerald-500 tracking-widest animate-pulse">● LIVE RUNNING</span>
                 )}
                 <ChevronDown className="w-4 h-4 text-zinc-500 group-open:rotate-180 transition-transform ml-2" />
             </div>
          </summary>
          
          <div className="relative p-6 sm:p-8 z-10 max-h-[500px] overflow-y-auto no-scrollbar">
            <div className="relative border-l border-zinc-800/60 ml-3.5 space-y-8 sm:space-y-10">
               {timelineEvents.map((event, index) => {
                 const isCompleted = event.status === 'Completed';
                 const isLastStarted = !isCompleted && (index === 0 || timelineEvents[index - 1]?.status === 'Completed');
                 const isPending = !isCompleted && !isLastStarted;

                 return (
                   <div key={event.id} className="relative pl-8 group">
                      <span className="absolute left-[-13px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#0c0c0e] border-[4px] border-[#0c0c0e] shadow-[0_0_0_2px_#0c0c0e]">
                         {isCompleted ? (
                           <CheckCircle className="w-full h-full text-zinc-600" />
                         ) : isLastStarted ? (
                           <CircleDashed className="w-full h-full text-indigo-500 animate-[spin_3s_linear_infinite]" />
                         ) : (
                           <Circle className="w-full h-full text-zinc-800" />
                         )}
                      </span>

                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 -mt-1">
                         <div className={isPending ? 'opacity-50' : 'opacity-100'}>
                            <div className="flex items-center gap-3 mb-1.5">
                              <h4 className={`text-sm font-medium ${isCompleted ? 'text-zinc-300' : isLastStarted ? 'text-indigo-400' : 'text-zinc-500'}`}>
                                {event.title}
                              </h4>
                              {isLastStarted && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[9px] font-mono tracking-widest uppercase border border-indigo-500/20">
                                  Running
                                </span>
                              )}
                              {event.metrics?.score !== undefined && (
                                <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 text-[9px] font-mono tracking-widest uppercase border border-zinc-700/50">
                                  Score: {event.metrics.score}
                                </span>
                              )}
                            </div>
                            <p className={`text-[13px] font-mono leading-relaxed mt-1 ${isLastStarted ? 'text-zinc-400' : 'text-zinc-500'}`}>
                              {event.description}
                            </p>
                         </div>
                         <div className="flex items-center gap-2 sm:mt-0 opacity-40">
                            <span className="text-[10px] font-mono text-zinc-500">
                               step_{String(index + 1).padStart(2, '0')}
                            </span>
                         </div>
                      </div>
                   </div>
                 );
               })}
               
               {normalizedStatus === 'error' && (
                 <div className="relative pl-8 pt-2">
                    <span className="absolute left-[-13px] top-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-[#0c0c0e] border-[4px] border-[#0c0c0e] shadow-[0_0_0_2px_#0c0c0e]">
                      <AlertCircle className="w-full h-full text-red-500" />
                    </span>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-4 -mt-1">
                       <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 w-full relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 to-transparent blur-xl pointer-events-none" />
                          <div className="relative flex items-center gap-2 mb-1.5">
                             <h4 className="text-sm font-medium text-red-400">Execution Error</h4>
                             <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[9px] font-mono tracking-widest uppercase border border-red-500/20">
                               Failed
                             </span>
                          </div>
                          <p className="relative text-[13px] font-mono leading-relaxed mt-1 text-red-400/80">
                             {errorMessage || "Process terminated unexpectedly."}
                          </p>
                       </div>
                    </div>
                 </div>
               )}
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}
