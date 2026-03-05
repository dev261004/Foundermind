"use client"

import { Brain, Lightbulb, BarChart3 } from "lucide-react"

const steps = [
  {
    icon: Lightbulb,
    title: "Submit your idea",
    desc: "Describe your startup concept and target market."
  },
  {
    icon: Brain,
    title: "AI agents analyze",
    desc: "AI evaluates competitors, opportunities, and risks."
  },
  {
    icon: BarChart3,
    title: "Get validation report",
    desc: "Receive deep insights into your startup potential."
  }
]

export function HowItWorks() {
  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
        {steps.map((step, i) => (
          <div
            key={i}
            className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:shadow-sm transition"
          >
            <step.icon className="mb-4" size={24} />
            <h3 className="font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}