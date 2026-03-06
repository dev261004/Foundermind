
import type { ReactNode } from "react"
import "@/styles/globals.css"
import "@/styles/not-found.css"

interface RootLayoutProps {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

