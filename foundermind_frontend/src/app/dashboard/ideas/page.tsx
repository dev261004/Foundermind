"use client"

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { toast, Toaster } from 'sonner';
import { 
  Lightbulb, 
  Search, 
  ArrowRight,
  SlidersHorizontal,
  Trash2,
  X,
  Check,
  Copy,
  Download,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ideaService,
  IdeaHistoryItem,
  IdeaHistorySort,
  IdeaHistoryStatusFilter,
} from "@/app/services/ideaService";
import { ApiError } from "@/lib/api/types";
import { useAuthStore } from "@/store/useAuthStore";

const DEFAULT_STATUS_FILTER: IdeaHistoryStatusFilter = "all"
const DEFAULT_SORT_BY: IdeaHistorySort = "date-desc"
const MIN_SEARCH_CHARACTERS = 3

function getErrorMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as ApiError).message
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return fallback
}

export default function DashboardIdeasPage() {
  const accessToken = useAuthStore((state) => state.accessToken);
  const hasLoadedHistoryRef = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [history, setHistory] = useState<IdeaHistoryItem[]>([]);
  const [baseHistory, setBaseHistory] = useState<IdeaHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [, setIsUpdatingHistory] = useState(false);
  const [deletingIdeaId, setDeletingIdeaId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<IdeaHistoryStatusFilter>(DEFAULT_STATUS_FILTER);
  const [sortBy, setSortBy] = useState<IdeaHistorySort>(DEFAULT_SORT_BY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  
  const [ideaToDelete, setIdeaToDelete] = useState<IdeaHistoryItem | null>(null);
  const [ideaToView, setIdeaToView] = useState<IdeaHistoryItem | null>(null);
  const trimmedQuery = query.trim();
  const showMinSearchHint = trimmedQuery.length > 0 && trimmedQuery.length < MIN_SEARCH_CHARACTERS;
  const isSearchReady = trimmedQuery.length >= MIN_SEARCH_CHARACTERS;

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const fetchBaseHistory = useCallback(
    async ({ manualRefresh = false }: { manualRefresh?: boolean } = {}) => {
      if (!accessToken) return;

      const shouldShowInitialLoader = !hasLoadedHistoryRef.current && !manualRefresh

      if (manualRefresh) {
        setIsRefreshing(true);
      } else if (shouldShowInitialLoader) {
        setIsLoading(true);
      } else {
        setIsUpdatingHistory(true);
      }

      setError(null);

      try {
        const data = await ideaService.getHistory({
          status: statusFilter,
          sort: sortBy,
        });
        setBaseHistory(data.history);
      } catch (err: unknown) {
        setError(getErrorMessage(err, "Unable to load idea history right now."));
      } finally {
        if (manualRefresh) {
          setIsRefreshing(false);
        } else if (shouldShowInitialLoader) {
          setIsLoading(false);
          hasLoadedHistoryRef.current = true
        } else {
          setIsUpdatingHistory(false);
        }
      }
    },
    [accessToken, sortBy, statusFilter]
  )

  useEffect(() => {
    if (!hasMounted) return;
    if (!accessToken) {
      hasLoadedHistoryRef.current = false;
      setHistory([]);
      setBaseHistory([]);
      setError(null);
      setIsLoading(false);
      return;
    }

    void fetchBaseHistory();
  }, [accessToken, fetchBaseHistory, hasMounted]);

  useEffect(() => {
    if (trimmedQuery.length === 0 || trimmedQuery.length < MIN_SEARCH_CHARACTERS) {
      setHistory(baseHistory);
    }
  }, [baseHistory, trimmedQuery]);

  useEffect(() => {
    if (!hasMounted) return;

    if (trimmedQuery.length === 0 || trimmedQuery.length < MIN_SEARCH_CHARACTERS) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchQuery(trimmedQuery);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [hasMounted, trimmedQuery]);

  useEffect(() => {
    if (!hasMounted || !accessToken || debouncedSearchQuery.length < MIN_SEARCH_CHARACTERS) {
      return;
    }

    if (debouncedSearchQuery !== trimmedQuery) {
      return;
    }

    let cancelled = false;

    const searchHistory = async () => {
      setIsUpdatingHistory(true);
      setError(null);

      try {
        const data = await ideaService.getHistory({
          search: debouncedSearchQuery,
          status: statusFilter,
          sort: sortBy,
        });
        if (!cancelled) {
          setHistory(data.history);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(getErrorMessage(err, "Unable to search idea history right now."));
        }
      } finally {
        if (!cancelled) {
          setIsUpdatingHistory(false);
        }
      }
    };

    void searchHistory();

    return () => {
      cancelled = true;
    };
  }, [accessToken, debouncedSearchQuery, hasMounted, sortBy, statusFilter, trimmedQuery]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFiltersOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRefresh = async () => {
    if (!accessToken) return;

    await fetchBaseHistory({ manualRefresh: true });

    if (!isSearchReady) {
      return;
    }

    setError(null);

    try {
      const data = await ideaService.getHistory({
        search: trimmedQuery,
        status: statusFilter,
        sort: sortBy,
      });
      setHistory(data.history);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Unable to refresh idea history right now."));
    }
  };

  const handleDelete = async () => {
    if (!ideaToDelete) return;

    const deletingIdea = ideaToDelete;

    setDeletingIdeaId(deletingIdea.idea_id);
    setError(null);

    try {
      await ideaService.deleteIdea(deletingIdea.idea_id);
      setHistory((prev) => prev.filter((idea) => idea.idea_id !== deletingIdea.idea_id));
      setBaseHistory((prev) => prev.filter((idea) => idea.idea_id !== deletingIdea.idea_id));
      if (ideaToView?.idea_id === deletingIdea.idea_id) {
        setIdeaToView(null);
      }
      setIdeaToDelete(null);
      toast.success('Idea deleted successfully');
    } catch (err: unknown) {
      const message = getErrorMessage(err, "Unable to delete idea right now.")
      setError(message);
      toast.error(message);
    } finally {
      setDeletingIdeaId(null);
    }
  };

  const avgScore = (() => {
    const scoredIdeas = history.filter(idea => typeof idea.overall_score === 'number');
    if (scoredIdeas.length === 0) return "0.0";
    const sum = scoredIdeas.reduce((acc, idea) => acc + (idea.overall_score || 0), 0);
    return (sum / scoredIdeas.length).toFixed(1);
  })();

  const avgConfidence = (() => {
    const confidentIdeas = history.filter(idea => typeof idea.analysis_confidence === 'number');
    if (confidentIdeas.length === 0) return "0%";
    const sum = confidentIdeas.reduce((acc, idea) => acc + (idea.analysis_confidence || 0), 0);
    return Math.round((sum / confidentIdeas.length) * 100) + "%";
  })();

  if (!hasMounted) {
    return <HistorySkeleton />;
  }

  if (!accessToken) {
    return <LoginPrompt />;
  }

  return (
    <div className="text-white selection:bg-indigo-500/30 font-sans antialiased">
      <div className="flex w-full max-w-6xl flex-col gap-8 py-2">
        {/* Header Hero Section */}
        <section className="relative rounded-[32px] border border-white/10 bg-gradient-to-br from-[#12141D] to-[#0d121c] shadow-2xl">
          {/* Background blobs wrapper with overflow hidden to prevent tooltips from being cut */}
          <div className="absolute inset-0 overflow-hidden rounded-[32px] pointer-events-none">
            <div className="absolute -top-[30%] -left-[10%] w-[500px] h-[500px] bg-blue-600/15 blur-[120px] rounded-full mix-blend-screen" />
            <div className="absolute bottom-[10%] right-[5%] w-[400px] h-[400px] bg-cyan-500/10 blur-[100px] rounded-full mix-blend-screen" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8 px-6 py-8 md:px-10 md:py-10">
            <div className="space-y-4 max-w-xl">
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
                Idea History
              </h1>
              <p className="text-gray-400 text-sm sm:text-base font-medium leading-relaxed">
                Review and manage your previously analyzed startup ideas and AI reports.
              </p>
            </div>

            <div className="flex flex-row items-center flex-wrap md:flex-nowrap gap-4 shrink-0 justify-start md:justify-end">
              <div className="bg-[#0B0C10] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center min-w-[120px] shadow-inner cursor-default transition-colors hover:border-white/20">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5 flex items-center gap-1.5"><Lightbulb size={12} className="text-blue-400" /> Ideas</p>
                <p className="text-3xl font-bold tracking-tight text-white leading-none">
                  {history.length}
                </p>
              </div>

              <div className="group/avgscore relative bg-[#0B0C10] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center min-w-[120px] shadow-inner cursor-default transition-colors hover:border-white/20">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Avg. Score</p>
                <p className="text-3xl font-bold tracking-tight text-white leading-none">
                  {avgScore}
                </p>
                
                <div className="absolute top-full right-1/2 translate-x-1/2 md:right-0 md:translate-x-0 mt-4 w-[280px] sm:w-[320px] opacity-0 pointer-events-none group-hover/avgscore:opacity-100 group-hover/avgscore:translate-y-1 transition-all duration-200 z-50 origin-top">
                  <div className="bg-[#2A2A35] border border-white/10 rounded-2xl p-5 shadow-2xl relative text-left">
                    <p className="text-sm font-bold text-white mb-2">Avg. Score</p>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      Average viability score across all your analyzed ideas. 
                      Each idea is rated 0–10 by our Critic Agent based on market 
                      potential, feasibility, and overall strength. 
                      <span className="block mt-2 text-gray-400 font-bold">10 = highly viable, 0 = not viable.</span>
                    </p>
                    <div className="absolute bottom-full left-1/2 -ml-2 md:left-auto md:right-[50px] -mb-[1px] w-4 h-4 bg-[#2A2A35] border-t border-l border-white/10 transform rotate-45" />
                  </div>
                </div>
              </div>

              <div className="group/avgconf relative bg-[#0B0C10] border border-white/10 rounded-3xl p-5 flex flex-col items-center justify-center min-w-[120px] shadow-inner cursor-default transition-colors hover:border-white/20">
                <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Avg. Conf</p>
                <p className="text-3xl font-bold tracking-tight text-white leading-none">
                  {avgConfidence}
                </p>

                <div className="absolute top-full right-1/2 translate-x-1/2 md:right-0 md:translate-x-0 mt-4 w-[280px] sm:w-[320px] opacity-0 pointer-events-none group-hover/avgconf:opacity-100 group-hover/avgconf:translate-y-1 transition-all duration-200 z-50 origin-top">
                  <div className="bg-[#2A2A35] border border-white/10 rounded-2xl p-5 shadow-2xl relative text-left">
                    <p className="text-sm font-bold text-white mb-2">Avg. Confidence</p>
                    <p className="text-xs text-gray-300 leading-relaxed font-medium">
                      Average confidence in the AI&apos;s analysis across all your ideas. 
                      Reflects how reliable and complete each assessment is, based 
                      on available data and research depth. 
                      <span className="block mt-2 text-gray-400 font-bold">Higher % = more certain analysis.</span>
                    </p>
                    <div className="absolute bottom-full left-1/2 -ml-2 md:left-auto md:right-[50px] -mb-[1px] w-4 h-4 bg-[#2A2A35] border-t border-l border-white/10 transform rotate-45" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <section className="rounded-[24px] border border-rose-400/20 bg-rose-500/10 px-5 py-4 text-sm text-rose-100">
            {error}
          </section>
        )}

        {/* Toolbar */}
        <section className="p-4 sm:p-5 rounded-3xl bg-[#12141D] border border-white/10">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
            <div className="relative flex-1 w-full group">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 z-20">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by title, preview, type, or tags (min 3 chars)..."
                className="w-full bg-[#1A1A1A] border border-white/10 rounded-full py-2.5 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 transition-all font-medium relative z-10"
              />
              <AnimatePresence>
                {showMinSearchHint && (
                  <motion.div 
                    initial={{ opacity: 0, y: -5 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    exit={{ opacity: 0, y: -5 }} 
                    className="absolute top-full left-4 mt-1 text-[11px] font-bold text-amber-500/90 tracking-wide z-10"
                  >
                    Please enter at least {MIN_SEARCH_CHARACTERS} characters to search
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative w-full sm:w-auto shrink-0" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                className={cn(
                  "w-full sm:w-auto flex items-center justify-between sm:justify-center gap-2 px-4 py-2.5 border rounded-full text-sm font-semibold transition-all shrink-0 cursor-pointer",
                  isFiltersOpen || statusFilter !== DEFAULT_STATUS_FILTER || sortBy !== DEFAULT_SORT_BY
                    ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                    : "bg-[#1A1A1A] border-white/10 text-gray-300 hover:bg-white/5"
                )}
              >
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  <span>Filter & Sort</span>
                  {(statusFilter !== DEFAULT_STATUS_FILTER || sortBy !== DEFAULT_SORT_BY) && (
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isFiltersOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 sm:left-auto mt-3 w-full sm:w-[320px] bg-[#1A1A1A] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden min-w-[280px]"
                  >
                    <div className="p-5 space-y-6">
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Status</label>
                        <div className="grid grid-cols-2 gap-2 text-left">
                          {['all', 'completed', 'active', 'partial', 'failed', 'cancelled', 'quota_exhausted'].map((s) => (
                            <button
                              key={s}
                              onClick={() => setStatusFilter(s as IdeaHistoryStatusFilter)}
                              className={cn(
                                "px-3 py-2 rounded-xl text-sm font-medium transition-colors border text-left",
                                statusFilter === s
                                  ? "bg-indigo-500 border-indigo-400 text-white shadow-lg shadow-indigo-500/20"
                                  : "bg-[#0B0C10] border-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5"
                              )}
                            >
                              {s === 'all'
                                ? 'All Status'
                                : s.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <label className="text-xs font-bold uppercase tracking-widest text-gray-500">Sort By</label>
                        <div className="grid grid-cols-1 gap-2">
                          {[
                            { value: 'date-asc', label: 'Oldest First' },
                            { value: 'date-desc', label: 'Newest First' },
                            { value: 'score-desc', label: 'Highest Score' },
                            { value: 'score-asc', label: 'Lowest Score' },
                          ].map((s) => (
                            <button
                              key={s.value}
                              onClick={() => setSortBy(s.value as IdeaHistorySort)}
                              className={cn(
                                "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border",
                                sortBy === s.value
                                  ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300"
                                  : "bg-[#0B0C10] border-white/5 text-gray-400 hover:text-white hover:border-white/20 hover:bg-white/5"
                              )}
                            >
                              <span>{s.label}</span>
                              {sortBy === s.value && <Check className="w-4 h-4" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {(query || statusFilter !== DEFAULT_STATUS_FILTER || sortBy !== DEFAULT_SORT_BY) && (
              <button
                type="button"
                title="Clear Filters"
                onClick={() => {
                  setQuery('');
                  setStatusFilter(DEFAULT_STATUS_FILTER);
                  setSortBy(DEFAULT_SORT_BY);
                }}
                className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 border border-white/10 rounded-full bg-[#1A1A1A] hover:bg-white/10 text-sm font-semibold text-gray-300 transition-all shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:block">Clear</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="flex items-center justify-center p-2.5 sm:px-4 sm:py-2.5 border border-white/10 rounded-full bg-[#1A1A1A] hover:bg-white/10 text-sm font-semibold text-gray-300 transition-all shrink-0 cursor-pointer disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
              <span className="hidden sm:block ml-2">Refresh</span>
            </button>

            <Link
              href="/submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 hover:brightness-110 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all shrink-0 cursor-pointer"
            >
              <span>Analyze new idea</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Ideas List */}
        {isLoading ? (
          <HistoryGridSkeleton />
        ) : (
          <section className={cn(
            "grid gap-5",
            history.length > 0 ? "xl:grid-cols-2" : "grid-cols-1"
          )}>
            <AnimatePresence mode="popLayout">
              {history.length > 0 ? (
                history.map(idea => (
                  <motion.div
                    key={idea.idea_id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <IdeaHistoryCard 
                      idea={idea} 
                      onDelete={() => setIdeaToDelete(idea)} 
                      onView={() => setIdeaToView(idea)}
                    />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-20 px-4 text-center border whitespace-pre-wrap border-dashed border-white/10 rounded-[32px] bg-white/[0.02]"
                >
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">No ideas found</h3>
                  <p className="text-gray-400 max-w-sm text-sm mb-8">
                    We couldn&apos;t find any ideas matching your current search or filter criteria.
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-4">
                    <Link href="/submit" className="flex items-center justify-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 hover:brightness-110 text-white text-sm font-bold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer">
                      <Lightbulb className="w-4 h-4" />
                      <span>Analyze New Idea</span>
                    </Link>
                    {(query || statusFilter !== DEFAULT_STATUS_FILTER || sortBy !== DEFAULT_SORT_BY) && (
                      <button
                        onClick={() => {
                          setQuery('');
                          setStatusFilter(DEFAULT_STATUS_FILTER);
                          setSortBy(DEFAULT_SORT_BY);
                        }}
                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white text-sm font-bold rounded-full transition-colors cursor-pointer"
                      >
                        Clear filters
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {ideaToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!deletingIdeaId) {
                  setIdeaToDelete(null);
                }
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md overflow-hidden rounded-[32px] border border-white/10 bg-[#12141D] p-8 shadow-2xl"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
                  <Trash2 size={32} />
                </div>
                <h3 className="mb-2 text-2xl font-bold tracking-tight text-white">Delete Idea?</h3>
                <p className="mb-8 text-sm leading-relaxed text-gray-400 font-medium">
                  Are you sure you want to delete <span className="text-white font-bold">{`"${ideaToDelete.title}"`}</span>? This will remove it from your dashboard history.
                </p>
                <div className="flex w-full flex-wrap gap-3">
                  <button
                    onClick={() => setIdeaToDelete(null)}
                    disabled={deletingIdeaId === ideaToDelete.idea_id}
                    className="flex-1 rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-gray-300 transition-colors hover:bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deletingIdeaId === ideaToDelete.idea_id}
                    className="flex-1 rounded-2xl bg-red-500 py-4 text-sm font-bold text-white shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {deletingIdeaId === ideaToDelete.idea_id ? (
                      <span className="inline-flex items-center gap-2">
                        <RefreshCw size={16} className="animate-spin" />
                        Deleting...
                      </span>
                    ) : (
                      "Yes, Delete"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Description Modal */}
      <AnimatePresence>
        {ideaToView && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIdeaToView(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl overflow-hidden rounded-[32px] border border-white/10 bg-[#12141D] p-8 shadow-2xl flex flex-col max-h-[85vh]"
            >
              <div className="flex items-center justify-between mb-6 shrink-0">
                <h3 className="text-2xl font-bold tracking-tight text-white pr-4">Idea Description</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(ideaToView.description || "");
                      toast.success('Description copied to clipboard');
                    }}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Copy description"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => setIdeaToView(null)}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto pr-2 custom-scrollbar">
                <h4 className="text-lg font-bold text-gray-200 mb-3">{ideaToView.title}</h4>
                <p className="text-base leading-relaxed text-gray-300 font-medium whitespace-pre-wrap">
                  {ideaToView.description || "No description provided."}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <Toaster 
        position="bottom-right" 
        toastOptions={{
          style: {
            background: '#12141D',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#fff',
            borderRadius: '20px',
            padding: '16px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
          },
          className: 'font-sans tracking-wide',
          classNames: {
            title: 'font-bold text-sm',
            toast: 'bg-[#12141D] border-white/10 text-white',
            icon: 'text-cyan-400'
          }
        }} 
      />
    </div>
  );
}

function IdeaHistoryCard({ idea, onDelete, onView }: { idea: IdeaHistoryItem, onDelete: () => void, onView: () => void }) {
  const getStatusTone = (status?: string) => {
    if (status === "completed") return "success";
    if (status === "partial" || status === "quota_exhausted") return "warning";
    if (status === "failed") return "danger";
    if (status === "cancelled") return "warning";
    return "neutral";
  };

  const humanizeLabel = (value: string) => {
    return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <article className="group relative flex flex-col h-full rounded-3xl bg-[#12141D] border border-white/10 p-6 sm:p-8 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-cyan-400/25 hover:shadow-[0_28px_80px_rgba(6,182,212,0.08)] hover:z-50 focus-within:z-50">
      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl w-full h-full">  
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_34%)] opacity-0 transition duration-300 group-hover:opacity-100" />
      </div>

      <div className="relative flex h-full flex-col z-10">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2 pt-1">
            <Tag tone={getStatusTone(idea.status)}>{humanizeLabel(idea.status || "active")}</Tag>
            <Tag tone="neutral">{humanizeLabel(idea.idea_type || "General")}</Tag>
            <Tag tone="neutral">{idea.sections_ready || 0} sections ready</Tag>
          </div>

          <div className="group/score relative min-w-[76px] h-[76px] flex flex-col items-center justify-center rounded-[24px] border border-white/10 bg-[#0B0C10] shrink-0 cursor-default">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Score</p>
            <p className="text-2xl font-bold leading-none text-white">
              {typeof idea.overall_score === 'number' ? idea.overall_score.toFixed(1) : "--"}
            </p>
            
            <div className="absolute bottom-full right-0 lg:-right-4 mb-3 w-[260px] opacity-0 pointer-events-none group-hover/score:opacity-100 group-hover/score:-translate-y-1 transition-all duration-200 z-50">
              <div className="bg-[#2A2A35] border border-white/10 rounded-xl p-4 shadow-2xl relative text-center">
                <p className="text-[13px] font-bold text-white mb-1.5">Overall Viability Score</p>
                <p className="text-xs text-gray-300 font-medium leading-relaxed">
                  0-10 scale based on comprehensive market & competitive analysis
                </p>
                <div className="absolute top-full right-8 lg:right-12 -mt-[5px] w-3 h-3 bg-[#2A2A35] border-r border-b border-white/10 transform rotate-45" />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-[28px] font-bold tracking-tight text-white line-clamp-2 mb-3 leading-[1.2] min-h-[66px]">{idea.title}</h2>
          <div className="min-h-[85px]">
            <p className="text-sm leading-relaxed text-gray-400 line-clamp-3 font-medium">
              {idea.description || "No description provided."}
            </p>
            {(idea.description?.length || 0) > 120 && (
              <button 
                onClick={onView}
                className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
              >
                Read full description <ArrowRight size={12} className="relative top-[0.5px]" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <DataGridItem label="Analyzed" value={formatDate(idea.analyzed_at || idea.created_at)} />
          <DataGridItem 
            label="Confidence" 
            value={formatPercent(idea.analysis_confidence)} 
            tooltip="AI confidence score based on available data and pattern matching"
          />
          <DataGridItem label="Report" value={idea.agent_run_id ? humanizeLabel(idea.status ?? "ready") : "Saved"} />
        </div>

        <div className="mt-auto">
          <div className="rounded-2xl border border-white/10 bg-[#0B0C10] p-5 mb-6">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2.5">Preview</p>
            <p className="text-[13px] leading-[1.6] font-medium text-gray-400 line-clamp-3 font-sans">
              {idea.preview || "No preview available."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={{
                pathname: `/idea/${idea.idea_id}`,
                query: {
                  title: idea.title,
                  ...(idea.status === "cancelled" ? { resume: "1" } : {}),
                },
              }}
              className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:brightness-110"
            >
              {idea.status === "cancelled" ? "Retry analysis" : "View full analysis"}
              <ArrowRight size={16} />
            </Link>

            <div className="group/download relative">
              <button
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-transparent px-6 py-3 text-sm font-bold text-gray-300 transition-colors hover:bg-white/5"
              >
                <Download size={16} />
                Download
              </button>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-max opacity-0 pointer-events-none group-hover/download:opacity-100 group-hover/download:-translate-y-1 transition-all duration-200 z-50">
                <div className="bg-[#2A2A35] border border-white/10 rounded-xl p-3 shadow-2xl relative text-center">
                  <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
                    Download report
                  </p>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#2A2A35]"></div>
                </div>
              </div>
            </div>

            <button
              onClick={onDelete}
              className="inline-flex cursor-pointer items-center justify-center w-11 h-11 rounded-full border border-red-500/20 bg-red-500/5 text-red-500/80 transition-colors hover:bg-red-500/10 hover:text-red-500 flex-shrink-0 ml-auto"
              title="Delete Idea"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

function DataGridItem({ label, value, tooltip }: { label: string, value: string, tooltip?: string }) {
  return (
    <div className="group/item relative p-4 rounded-2xl border border-white/10 bg-[#0B0C10] cursor-default">
      <div className="flex items-center gap-1.5 mb-1">
        <div className="text-[10px] uppercase tracking-widest font-bold text-gray-500">{label}</div>
      </div>
      <div className="text-sm font-bold text-gray-200">{value}</div>
      
      {tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-[220px] opacity-0 pointer-events-none group-hover/item:opacity-100 group-hover/item:-translate-y-1 transition-all duration-200 z-50">
          <div className="bg-[#2A2A35] border border-white/10 rounded-xl p-3 shadow-2xl relative text-center">
            <p className="text-[11px] text-gray-300 font-medium leading-relaxed">
              {tooltip}
            </p>
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#2A2A35]"></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode
  tone?: "neutral" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : tone === "warning"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : tone === "danger"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
          : "border-white/10 bg-transparent text-gray-300"

  return (
    <span className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold ${toneClass}`}>
      {children}
    </span>
  )
}

function formatDate(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatPercent(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";
  return `${Math.round(Number(value) * 100)}%`;
}

function HistorySkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 animate-pulse">
      <div className="h-48 rounded-[32px] bg-white/[0.05]" />
      <div className="h-20 rounded-[28px] bg-white/[0.05]" />
      <div className="grid gap-5 xl:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-96 rounded-[28px] bg-white/[0.05]" />
        ))}
      </div>
    </div>
  )
}

function HistoryGridSkeleton() {
  return (
    <section className="grid gap-5 xl:grid-cols-2 animate-pulse">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-96 rounded-[28px] bg-white/[0.05]" />
      ))}
    </section>
  )
}

function LoginPrompt() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-6">
      <div className="w-full rounded-[32px] border border-white/10 bg-[#12141D] p-8 text-center shadow-2xl sm:p-10">
        <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-[24px] border border-white/10 bg-white/5 text-cyan-400">
          <Lightbulb size={28} />
        </div>
        <h1 className="mt-5 text-3xl font-bold text-white tracking-tight">Login to view your idea history</h1>
        <p className="mt-3 text-sm leading-7 text-gray-400 font-medium">
          Your dashboard history is tied to your account so you can reopen previous analyses any time.
        </p>
        <Link
          href="/login"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-blue-600 via-indigo-500 to-cyan-400 px-6 py-3 text-sm font-bold text-white transition-all hover:brightness-110"
        >
          Go to login
          <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
