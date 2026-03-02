import { ReactNode } from "react"
import { cn } from "@/lib/utils"

type SpanCount = 1 | 2 | 3 | 4

interface GridItemProps {
  children: ReactNode
  span?: SpanCount
  className?: string
}

const spanConfig: Record<SpanCount, string> = {
  1: "",
  2: "xl:col-span-2",
  3: "xl:col-span-3",
  4: "xl:col-span-4",
}

export function GridItem({
  children,
  span = 1,
  className,
}: GridItemProps) {
  return (
    <div
      className={cn(
        "min-w-0",
        spanConfig[span],
        className
      )}
    >
      {children}
    </div>
  )
}