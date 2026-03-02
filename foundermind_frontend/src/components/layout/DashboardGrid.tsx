import { ReactNode } from "react"
import { cn } from "@/lib/utils"

type ColumnCount = 1 | 2 | 3 | 4
type GapSize = "sm" | "md" | "lg"

interface DashboardGridProps {
  children: ReactNode
  columns?: ColumnCount
  gap?: GapSize
  className?: string
}

const columnConfig: Record<ColumnCount, string> = {
  1: "grid-cols-1",
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 xl:grid-cols-4",
}

const gapConfig: Record<GapSize, string> = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
}

export function DashboardGrid({
  children,
  columns = 3,
  gap = "md",
  className,
}: DashboardGridProps) {
  return (
    <div
      className={cn(
        "grid w-full",
        columnConfig[columns],
        gapConfig[gap],
        className
      )}
    >
      {children}
    </div>
  )
}