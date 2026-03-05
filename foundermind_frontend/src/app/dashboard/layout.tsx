"use client"

import { useState } from "react"
import { Sidebar } from "@/components/layout/Sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {

  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (

    <div className="flex min-h-screen bg-neutral-950 text-white">

      <Sidebar
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        onOpenMobile={() => setMobileOpen(true)}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 p-8 ${
          collapsed ? "lg:ml-[88px]" : "lg:ml-[280px]"
        }`}
      >
        {children}
      </main>

    </div>

  )
}