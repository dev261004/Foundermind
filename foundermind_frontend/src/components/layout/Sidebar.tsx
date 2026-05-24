"use client"

import { motion, AnimatePresence } from "framer-motion"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Lightbulb,
  LineChart,
  BarChart3,
  Activity,
  Shield,
  LogOut,
  Settings,
  User,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SidebarItem } from "./SidebarItem"
import { LucideIcon } from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"

interface NavItem {
  label: string
  icon: LucideIcon
  href: string
}

interface SidebarProps {
  collapsed: boolean
  mobileOpen: boolean
  onToggleCollapse: () => void
  onOpenMobile: () => void
  onCloseMobile: () => void
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Ideas", icon: Lightbulb, href: "/dashboard/ideas" },
  { label: "Analytics", icon: LineChart, href: "/dashboard/analytics" },
  { label: "Admin", icon: Shield, href: "/dashboard/admin" },
  { label: "Market Models", icon: BarChart3, href: "#" },
  { label: "Drift Monitor", icon: Activity, href: "/dashboard/drift" },
]

export function Sidebar({
  collapsed,
  mobileOpen,
  onToggleCollapse,
  onOpenMobile,
  onCloseMobile,
}: SidebarProps) {
  const router = useRouter()
  const logout = useAuthStore((state) => state.logout)
  const sidebarWidth = collapsed ? 88 : 280

  const handleLogout = () => {
    logout()
    onCloseMobile()
    router.replace("/login")
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        className={cn(
          "hidden lg:flex fixed left-0 top-0 z-40 h-screen flex-col",
          "border-r border-white/10",
          "bg-gradient-to-b from-[#050505] via-[#070707] to-[#050505]",
          "backdrop-blur-xl",
          "shadow-[0_0_40px_rgba(124,58,237,0.15)]"
        )}
      >
        <div className="flex h-full flex-col justify-between px-4 py-6">
          <div>
            {/* Logo + Collapse */}
            <div className="flex items-center justify-between mb-10">
              <div
                className={cn(
                  "flex items-center gap-3 transition-all",
                  collapsed && "justify-center w-full"
                )}
              >
                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-purple-600 to-cyan-500 flex items-center justify-center shadow-lg">
                  <span className="text-white dark:text-neutral-900 font-semibold text-sm">
                    FM
                  </span>
                </div>

                {!collapsed && (
                  <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                    FounderMind
                  </span>
                )}
              </div>

              <button
                onClick={onToggleCollapse}
                className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                {collapsed ? (
                  <PanelLeftOpen size={18} />
                ) : (
                  <PanelLeftClose size={18} />
                )}
              </button>
            </div>

            <nav className="space-y-1">
              {NAV_ITEMS.map((item) => (
                <SidebarItem
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  href={item.href}
                  collapsed={collapsed}
                />
              ))}
            </nav>
          </div>

          <div className="space-y-1">
            <SidebarItem
              icon={Settings}
              label="Settings"
              href="#"
              collapsed={collapsed}
            />
            <SidebarItem
              icon={User}
              label="Profile"
              href="#"
              collapsed={collapsed}
            />
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                "text-sm font-medium text-rose-300 transition-all duration-200",
                "hover:bg-rose-500/10 hover:text-rose-100"
              )}
            >
              <LogOut
                size={18}
                className="shrink-0 transition-transform group-hover:scale-110"
              />
              {!collapsed && (
                <span className="truncate transition-all duration-200">
                  Logout
                </span>
              )}
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Mobile Trigger */}
      <button
        onClick={onOpenMobile}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm"
      >
        <PanelLeftOpen size={18} />
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onCloseMobile}
              className="fixed inset-0 bg-black z-40"
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25 }}
              className="fixed top-0 left-0 z-50 h-screen w-[280px] bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-xl flex flex-col justify-between px-4 py-6"
            >
              <div>
                <div className="flex items-center gap-3 mb-10">
                  <div className="h-9 w-9 rounded-lg bg-neutral-900 dark:bg-white flex items-center justify-center">
                    <span className="text-white dark:text-neutral-900 font-semibold text-sm">
                      FM
                    </span>
                  </div>
                  <span className="text-lg font-semibold tracking-tight text-neutral-900 dark:text-white">
                    FounderMind
                  </span>
                </div>

                <nav className="space-y-1">
                  {NAV_ITEMS.map((item) => (
                    <SidebarItem
                      key={item.label}
                      icon={item.icon}
                      label={item.label}
                      href={item.href}
                      collapsed={false}
                      onClick={onCloseMobile}
                    />
                  ))}
                </nav>
              </div>

              <div className="space-y-1">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5",
                    "text-sm font-medium text-rose-500 transition-all duration-200",
                    "hover:bg-rose-500/10 hover:text-rose-400"
                  )}
                >
                  <LogOut
                    size={18}
                    className="shrink-0 transition-transform group-hover:scale-110"
                  />
                  <span className="truncate transition-all duration-200">
                    Logout
                  </span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
