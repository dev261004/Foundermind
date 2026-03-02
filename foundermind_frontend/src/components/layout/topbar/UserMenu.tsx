"use client"

import * as DropdownMenu from "@radix-ui/react-dropdown-menu"
import { motion } from "framer-motion"
import { ChevronDown, LogOut, Settings, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function UserMenu() {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 rounded-md",
            "hover:bg-neutral-100 dark:hover:bg-neutral-800",
            "transition-colors"
          )}
        >
          <div className="h-8 w-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center text-xs font-medium">
            DA
          </div>
          <ChevronDown size={16} />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content asChild sideOffset={8}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "min-w-[180px] rounded-lg p-1",
              "bg-white dark:bg-neutral-900",
              "border border-neutral-200 dark:border-neutral-800",
              "shadow-lg"
            )}
          >
            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <User size={16} />
              Profile
            </DropdownMenu.Item>

            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <Settings size={16} />
              Settings
            </DropdownMenu.Item>

            <DropdownMenu.Separator className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

            <DropdownMenu.Item className="flex items-center gap-2 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800">
              <LogOut size={16} />
              Log out
            </DropdownMenu.Item>
          </motion.div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}