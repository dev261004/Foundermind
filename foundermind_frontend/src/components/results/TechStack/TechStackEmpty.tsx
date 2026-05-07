"use client";

import { Cpu } from "lucide-react";

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
      <p className="text-xs text-gray-600">
        Retry controls appear below when this section can be rerun.
      </p>
    </div>
  );
}
