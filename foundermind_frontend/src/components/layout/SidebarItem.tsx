"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

interface SidebarItemProps {
  icon: React.ElementType
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
          "text-sm font-medium transition-all",
          "text-neutral-600 dark:text-neutral-400",
          "hover:bg-neutral-100 dark:hover:bg-neutral-800",
          isActive &&
            "bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white"
        )}
      >
        <Icon size={18} className="shrink-0" />

        {!collapsed && (
          <span className="truncate transition-all duration-200">
            {label}
          </span>
        )}

        {isActive && (
          <motion.div
            layoutId="activeIndicator"
            className="absolute left-0 top-2 bottom-2 w-1 rounded-r-md bg-neutral-900 dark:bg-white"
          />
        )}
      </motion.div>
    </Link>
  )
}