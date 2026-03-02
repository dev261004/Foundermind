"use client"

import { Search } from "lucide-react"
import { cn } from "@/lib/utils"

export function SearchInput() {
  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full max-w-md",
        "bg-neutral-100 dark:bg-neutral-900",
        "border border-neutral-200 dark:border-neutral-800",
        "rounded-lg px-3 py-2",
        "focus-within:ring-1 focus-within:ring-neutral-300 dark:focus-within:ring-neutral-700",
        "transition-all"
      )}
    >
      <Search size={16} className="text-neutral-500" />
      <input
        type="text"
        placeholder="Search..."
        className="bg-transparent outline-none text-sm w-full placeholder:text-neutral-500 dark:placeholder:text-neutral-500"
      />
    </div>
  )
}