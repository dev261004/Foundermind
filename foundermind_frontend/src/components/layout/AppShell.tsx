"use client"

import { ReactNode, useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"

import { cn } from "@/lib/utils"

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSidebarToggle = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileOpen((prev) => !prev)
    } else {
      setCollapsed((prev) => !prev)
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
     <Sidebar
  collapsed={collapsed}
  mobileOpen={mobileOpen}
  onToggleCollapse={() => setCollapsed((prev) => !prev)}
  onOpenMobile={() => setMobileOpen(true)}
  onCloseMobile={() => setMobileOpen(false)}
/>

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-300",
          collapsed ? "lg:pl-[88px]" : "lg:pl-[280px]"
        )}
      >
      

        <div className="flex-1 overflow-y-auto pt-16">
          {children}
        </div>
      </div>
    </div>
  )
}