import { Suspense } from "react"
import IdeaAnalysisPage from "@/components/idea/IdeaAnalysisPage"

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { id } = await params

  return (
    <Suspense fallback={null}>
      <IdeaAnalysisPage ideaId={id} />
    </Suspense>
  )
}
