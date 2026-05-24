"use client"

import { Suspense } from "react"
import IdeaForm from "@/components/idea/IdeaForm"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <IdeaForm
        open
        onClose={() => undefined}
      />
    </Suspense>
  )
}
