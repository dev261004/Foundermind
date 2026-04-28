import { MarketDataHeader } from "@/components/results/MarketData"
import { MarketDataEmpty } from "@/components/results/MarketData/MarketDataEmpty"

export default function TempMarketEmptyPage() {
  return (
    <div className="min-h-screen p-8 flex items-center justify-center font-sans antialiased text-gray-100 bg-[#0a0a0c]">
      <div className="w-full max-w-5xl bg-[#111116] rounded-2xl p-6 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.3)] border border-white/5">
        <details className="group" open>
          <MarketDataHeader />
          <div className="w-full selection:bg-cyan-500/30 px-6 pb-6">
            <MarketDataEmpty />
          </div>
        </details>
      </div>
    </div>
  )
}
