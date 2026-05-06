"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Cpu, Info, RefreshCw } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  TechCategory,
  TechItem,
  TechStack as TechStackData,
} from "@/types/analysis";

const confidenceColors = {
  Essential: "bg-red-500/10 text-red-400 border-red-500/20",
  Recommended: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Optional: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

// Safelist for dynamic gradients sent from backend
// from-orange-500 to-orange-600
// from-teal-500 to-teal-600
// from-blue-500 to-blue-600
// from-purple-500 to-purple-600
// from-green-500 to-green-600
// from-cyan-500 to-cyan-600
// from-red-500 to-red-600
// from-pink-500 to-pink-600

function TechCard({ item }: { item: TechItem }) {
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [selectedTech, setSelectedTech] = useState(item.name);
  const containerRef = useRef<HTMLDivElement>(null);
  const toggleButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const menuId = `${item.id}-swap-menu`;
  const toggleId = `${item.id}-swap-toggle`;

  const closeMenu = () => {
    setIsSwapOpen(false);
    toggleButtonRef.current?.focus();
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsSwapOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    if (isSwapOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      const timeoutId = setTimeout(() => {
        const firstItem = menuRef.current?.querySelector(
          '[role="menuitem"]',
        ) as HTMLElement | null;
        if (firstItem) firstItem.focus();
      }, 50);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      };
    }
  }, [isSwapOpen]);

  const handleMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!menuRef.current) return;
    const items = Array.from(
      menuRef.current.querySelectorAll('[role="menuitem"]'),
    ) as HTMLElement[];
    if (items.length === 0) return;

    const index = items.indexOf(document.activeElement as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = (index + 1) % items.length;
      items[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex = (index - 1 + items.length) % items.length;
      items[prevIndex]?.focus();
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative group rounded-lg p-3.5 bg-[#14161f] border border-[#222631] hover:border-gray-500/50 hover:bg-[#1a1c27] transition-all duration-200"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{item.emoji}</span>
          <span className="font-semibold text-sm text-gray-200">
            {selectedTech}
          </span>
        </div>
        <button
          ref={toggleButtonRef}
          id={toggleId}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isSwapOpen}
          aria-controls={isSwapOpen ? menuId : undefined}
          aria-label={`Swap technology for ${selectedTech}`}
          onClick={() => setIsSwapOpen(!isSwapOpen)}
          onKeyDown={(e) => {
            if (
              (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") &&
              !isSwapOpen
            ) {
              e.preventDefault();
              setIsSwapOpen(true);
            }
          }}
          className={`transition-all duration-200 p-1 rounded focus:outline-none focus:ring-2 focus:ring-purple-500/50 hover:bg-[#2a2e3d] hover:text-white ${isSwapOpen ? "text-white bg-[#2a2e3d]" : "text-gray-500 opacity-60 group-hover:opacity-100 group-hover:text-gray-300"}`}
          title="Swap alternative"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-gray-400 mb-4 leading-relaxed">
        {item.description}
      </p>

      <div className="flex items-end justify-between mt-auto">
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${confidenceColors[item.confidence]}`}
        >
          {item.confidence}
        </span>

        <div className="relative flex flex-col items-center group/tooltip">
          <button
            type="button"
            aria-label={`Reasoning for choosing ${selectedTech}`}
            className="text-gray-500 hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded transition-colors p-1"
          >
            <Info className="w-3.5 h-3.5" />
          </button>

          <div
            role="tooltip"
            className="absolute bottom-full right-[-10px] md:left-1/2 md:-translate-x-1/2 mb-2 w-[220px] p-2.5 bg-[#1e212b] text-xs text-gray-300 rounded-lg shadow-xl border border-[#2a2e3d] opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 flex flex-col items-center text-center pointer-events-none"
          >
            <div className="font-semibold text-gray-400 mb-1.5 flex items-center justify-center gap-1.5 leading-tight">
              <Cpu className="w-3.5 h-3.5 shrink-0" />
              <span>Why did the agent choose this?</span>
            </div>
            <p className="leading-relaxed">{item.reasoning}</p>
            <div className="absolute top-full right-2 md:left-1/2 md:-translate-x-1/2 border-[5px] border-transparent border-t-[#1e212b]" />
            <div className="absolute top-full mt-[1px] right-2 md:left-1/2 md:-translate-x-1/2 border-[6px] border-transparent border-t-[#2a2e3d] -z-10" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isSwapOpen && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Alternative technologies"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute top-9 right-2 w-52 bg-[#1e212b]/95 backdrop-blur-xl border border-[#2a2e3d] rounded-xl shadow-[0_10px_40px_-5px_rgba(0,0,0,0.8)] z-40 flex flex-col origin-top-right ring-1 ring-black/50 overflow-hidden outline-none"
          >
            <div className="px-3 py-2.5 bg-[#14161f]/50 text-[10px] font-bold text-gray-300 uppercase tracking-widest border-b border-[#2a2e3d]">
              Select Alternative
            </div>
            <div className="flex flex-col p-1.5 gap-0.5">
              {item.alternatives.map((alt) => (
                <button
                  key={alt}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setSelectedTech(alt);
                    closeMenu();
                  }}
                  className={`text-xs text-left px-2.5 py-2 rounded-md transition-colors flex items-center justify-between group/btn focus:outline-none focus:ring-2 focus:ring-purple-500/50 ${selectedTech === alt ? "bg-purple-500/15 text-purple-300 font-medium" : "text-gray-300 hover:bg-[#2a2e3d] hover:text-white"}`}
                >
                  {alt}
                  {selectedTech === alt && (
                    <div className="w-1.5 h-1.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.8)]" />
                  )}
                </button>
              ))}
              {selectedTech !== item.name && (
                <>
                  <div className="h-px bg-[#2a2e3d] my-1 mx-1" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedTech(item.name);
                      closeMenu();
                    }}
                    className="text-xs text-left px-2.5 py-2 rounded-md text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-colors border-[#2a2e3d]/50 flex items-center justify-between font-medium group/revert"
                  >
                    Revert to original
                    <RefreshCw className="w-3.5 h-3.5 transition-transform duration-300 group-hover/revert:-rotate-180" />
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CategoryColumn({ category }: { category: TechCategory }) {
  return (
    <div className="flex flex-col rounded-xl bg-[#0f1117] border border-[#222631] shadow-sm">
      <div className="rounded-t-xl overflow-hidden">
        <div className={`h-1 w-full bg-gradient-to-r ${category.gradient}`} />
        <div className="p-3 bg-[#14161f] border-b border-[#222631]">
          <h3 className="font-semibold text-sm text-gray-200 tracking-wide">
            {category.name}
          </h3>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-3 flex-1 bg-[#0b0c10] rounded-b-xl">
        {category.items.map((item) => (
          <TechCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  );
}

export function TechStack({ stack }: { stack: TechStackData }) {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const updateCols = () => {
      if (window.innerWidth >= 1280) setColumns(4);
      else if (window.innerWidth >= 1024) setColumns(3);
      else if (window.innerWidth >= 640) setColumns(2);
      else setColumns(1);
    };
    updateCols();
    window.addEventListener("resize", updateCols);
    return () => window.removeEventListener("resize", updateCols);
  }, []);

  const masonryColumns = useMemo(() => {
    const colsArray: TechCategory[][] = Array.from({ length: columns }, () => []);
    const colWeights = Array(columns).fill(0);

    stack.categories.forEach((category) => {
      const weight = 1 + category.items.length * 2;
      const minIdx = colWeights.indexOf(Math.min(...colWeights));
      colsArray[minIdx].push(category);
      colWeights[minIdx] += weight;
    });

    return colsArray;
  }, [columns, stack.categories]);

  return (
    <div className="p-4 md:p-6 bg-[#0b0c10]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
        {masonryColumns.map((col, colIdx) => (
          <div key={colIdx} className="flex flex-col gap-4">
            {col.map((category) => (
              <CategoryColumn key={category.id} category={category} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
