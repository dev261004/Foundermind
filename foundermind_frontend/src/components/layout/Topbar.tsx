"use client"

import { ReactNode } from "react"
import { PanelLeft, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { SearchInput } from "./topbar/SearchInput"
import { ThemeToggle } from "./topbar/ThemeToggle"
import { UserMenu } from "./topbar/UserMenu"

interface TopbarProps {
  title?: string
  breadcrumbs?: ReactNode
  onSidebarToggle?: () => void
}

export function Topbar({
  title = "Dashboard",
  breadcrumbs,
  onSidebarToggle,
}: TopbarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 h-16 w-full",
        "border-b border-neutral-200 dark:border-neutral-800",
        "bg-white/80 dark:bg-neutral-950/80",
        "backdrop-blur supports-[backdrop-filter]:bg-white/60",
        "flex items-center justify-between px-4 lg:px-6"
      )}
    >
      {/* LEFT */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          onClick={onSidebarToggle}
          className={cn(
            "p-2 rounded-md",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
            "transition-colors"
          )}
        >
          <PanelLeft size={18} />
        </button>

        <div className="flex flex-col min-w-0">
          {breadcrumbs && (
            <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
              {breadcrumbs}
            </div>
          )}
          <h1 className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* CENTER */}
      <div className="hidden md:flex flex-1 justify-center px-8">
        <SearchInput />
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-2">
        <button
          className={cn(
            "relative p-2 rounded-md",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
            "transition-colors"
          )}
        >
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-neutral-900 dark:bg-white" />
        </button>

        <ThemeToggle />

        <UserMenu />
      </div>
    </header>
  )
}