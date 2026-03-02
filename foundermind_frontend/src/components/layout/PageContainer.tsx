import { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps {
  children: ReactNode
  className?: string
}

export function PageContainer({
  children,
  className,
}: PageContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[1400px] px-4 sm:px-6 lg:px-8 py-8",
        className
      )}
    >
      {children}
    </div>
  )
}