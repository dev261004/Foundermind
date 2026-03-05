"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"
interface SidebarItemProps {
 icon: LucideIcon
  label: string
  href: string
  collapsed: boolean
  onClick?: () => void
}

export function SidebarItem({
  icon: Icon,
  label,
  href,
  collapsed,
  onClick,
}: SidebarItemProps) {
  const isActive = false

  return (
    <Link href={href} onClick={onClick}>
      <motion.div
        whileHover={{ x: 2 }}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg",
          "text-sm font-medium transition-all duration-200",
          "text-neutral-400",
          "hover:text-white",
          "hover:bg-white/5",
          "backdrop-blur-md",
          isActive &&
          "bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-white"
        )}
      >
       <Icon
  size={18}
  className="shrink-0 transition-transform group-hover:scale-110"
/>
<motion.div
  className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition"
  style={{
    background:
      "linear-gradient(90deg, rgba(124,58,237,0.15), rgba(6,182,212,0.15))",
  }}
/>
        {!collapsed && (
          <span className="truncate transition-all duration-200">
            {label}
          </span>
        )}

        {isActive && (
          <motion.div
            layoutId="activeIndicator"
           className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-gradient-to-b from-purple-500 to-cyan-400 shadow-[0_0_10px_rgba(124,58,237,0.8)]"
          />
        )}
      </motion.div>
    </Link>
  )
}