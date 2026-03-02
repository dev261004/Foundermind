"use client"

import { ReactNode } from "react"
import { Sidebar } from "./Sidebar"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      <Sidebar />
      <main className="lg:pl-[280px] transition-all duration-300">
        <div className="px-6 py-8">{children}</div>
      </main>
    </div>
  )
}