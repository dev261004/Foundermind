import {
  Sprout,
  Leaf,
  TreePine,
  Mountain,
  Globe,
  Milestone,
  Landmark,
  DollarSign,
  FileText,
  Handshake,
  CreditCard,
  Gift,
  Users,
  Briefcase,
  Building2,
  Table as TableIcon
} from "lucide-react"

export default function FundingPage() {
  const introText = "Every startup's journey involves raising capital in stages, each tied to a different level of maturity, risk, and investor type. This guide breaks down the funding stages and the types of instruments used to raise that capital."
  
  const stagesIntro = "Funding stages generally reflect a company's progress — the more traction and proof a company has, the later the stage it's raising in."
  
  const stages = [
    {
      title: "Pre-Seed",
      icon: Sprout,
      description: "The earliest stage of funding, usually before a company has a finished product or any real revenue. Founders are validating an idea, building a prototype, or assembling a founding team.",
      details: [
        { label: "Typical source", value: "Founders' own savings, friends and family, angel investors, or pre-seed-focused accelerators" },
        { label: "Typical amount", value: "$10K – $500K" },
        { label: "What investors look for", value: "Founding team quality, problem clarity, early prototype or mockup" },
        { label: "Typical valuation", value: "$1M – $5M" }
      ]
    },
    {
      title: "Seed",
      icon: Leaf,
      description: "The company has a working product (or close to it) and is starting to find early users or customers. This round funds the effort to reach product-market fit.",
      details: [
        { label: "Typical source", value: "Angel investors, seed-stage VC funds, accelerators (e.g., Y Combinator, Techstars)" },
        { label: "Typical amount", value: "$500K – $3M" },
        { label: "What investors look for", value: "Early traction, user growth, retention signals, a credible go-to-market plan" },
        { label: "Typical valuation", value: "$3M – $15M" }
      ]
    },
    {
      title: "Series A",
      icon: TreePine,
      description: "The company has demonstrated product-market fit and a repeatable business model. This round funds scaling — hiring, expanding the customer base, and refining the revenue engine.",
      details: [
        { label: "Typical source", value: "Institutional venture capital firms (lead investor + syndicate)" },
        { label: "Typical amount", value: "$3M – $15M" },
        { label: "What investors look for", value: "Strong unit economics, clear growth metrics (MRR/ARR, CAC, LTV), scalable go-to-market strategy" },
        { label: "Typical valuation", value: "$15M – $50M" }
      ]
    },
    {
      title: "Series B",
      icon: Mountain,
      description: "The business model is proven and the focus shifts to scaling operations — expanding into new markets, building out teams, and increasing market share.",
      details: [
        { label: "Typical source", value: "Larger VC firms, growth equity funds" },
        { label: "Typical amount", value: "$15M – $50M" },
        { label: "What investors look for", value: "Consistent revenue growth, market leadership indicators, operational efficiency" },
        { label: "Typical valuation", value: "$50M – $200M" }
      ]
    },
    {
      title: "Series C and Beyond",
      icon: Globe,
      description: "Later rounds fund aggressive expansion, acquisitions of smaller companies, entry into new geographies, or preparation for an IPO. Companies at this stage are often already well-known market players.",
      details: [
        { label: "Typical source", value: "Growth equity firms, private equity, hedge funds, sovereign wealth funds, existing investors doubling down" },
        { label: "Typical amount", value: "$50M+" },
        { label: "What investors look for", value: "Market dominance, path to profitability or already profitable, expansion opportunities" },
        { label: "Typical valuation", value: "$200M+" }
      ]
    },
    {
      title: "Bridge / Extension Round",
      icon: Milestone,
      description: "An interim round raised between two priced rounds — often to extend runway until the company hits a milestone that justifies a stronger valuation for the next full round.",
      details: [
        { label: "Typical instrument", value: "Convertible notes or SAFEs, sometimes venture debt" },
        { label: "When it happens", value: "Runway is shorter than expected, or market conditions delay the next round" }
      ]
    },
    {
      title: "IPO (Initial Public Offering) / Exit",
      icon: Landmark,
      description: "The company lists shares on a public stock exchange, or is acquired by another company. This is typically the endpoint of the venture-funded journey, giving early investors and founders liquidity.",
      details: []
    }
  ]

  const instrumentsIntro = "Separate from stage, funding can also be categorized by the type of instrument used to raise it."

  const instruments = [
    {
      title: "Equity Funding",
      icon: DollarSign,
      description: "Investors receive ownership shares in exchange for capital. This is the most common instrument for Seed through Series C+ rounds. Dilutes founder ownership but doesn't need to be repaid."
    },
    {
      title: "Convertible Note",
      icon: FileText,
      description: "A short-term debt instrument that converts into equity at a later date — usually at the next priced round — often at a discount or with a valuation cap. Common at pre-seed/seed stage when it's too early to set a firm valuation."
    },
    {
      title: "SAFE (Simple Agreement for Future Equity)",
      icon: Handshake,
      description: "Similar in purpose to a convertible note but structurally not debt — it's an agreement to issue equity in the future. Popularized by Y Combinator, now an industry standard for early-stage rounds because it's faster and cheaper to execute than a priced equity round."
    },
    {
      title: "Venture Debt",
      icon: CreditCard,
      description: "A loan given to venture-backed companies, often alongside or after an equity round. Doesn't dilute ownership, but must be repaid with interest. Typically used to extend runway between equity rounds or fund specific growth initiatives (e.g., inventory, equipment)."
    },
    {
      title: "Grants",
      icon: Gift,
      description: "Non-dilutive funding — no equity given up, no repayment required. Usually from governments, foundations, or innovation programs. Common in deep tech, biotech, and climate startups."
    },
    {
      title: "Crowdfunding",
      icon: Users,
      description: "Raising small amounts from a large number of people, typically via an online platform.",
      bullets: [
        { label: "Reward-based (e.g., Kickstarter)", text: "backers get a product or perk, not equity" },
        { label: "Equity crowdfunding (e.g., Wefunder, Republic)", text: "backers receive actual equity in the company" }
      ]
    },
    {
      title: "Bootstrapping",
      icon: Briefcase,
      description: "Self-funding the business using personal savings or business revenue, without raising external capital. Keeps full ownership and control, but growth is often slower and more constrained by cash flow."
    },
    {
      title: "Corporate Venture Capital (CVC)",
      icon: Building2,
      description: "Investment from the venture arm of a large corporation, often paired with a strategic partnership (e.g., distribution access, technology integration) in addition to capital."
    }
  ]

  const tableData = [
    { stage: "Pre-Seed", amount: "$10K – $500K", valuation: "$1M – $5M", instrument: "SAFE / Convertible Note" },
    { stage: "Seed", amount: "$500K – $3M", valuation: "$3M – $15M", instrument: "SAFE / Equity" },
    { stage: "Series A", amount: "$3M – $15M", valuation: "$15M – $50M", instrument: "Equity" },
    { stage: "Series B", amount: "$15M – $50M", valuation: "$50M – $200M", instrument: "Equity" },
    { stage: "Series C+", amount: "$50M+", valuation: "$200M+", instrument: "Equity" },
    { stage: "Bridge", amount: "Varies", valuation: "N/A (extension)", instrument: "Convertible Note / Venture Debt" }
  ]

  const tableNote = "Amounts and valuations vary significantly by industry, geography, and market conditions — figures above are general benchmarks, not fixed rules."

  return (
    <div className="space-y-12 pb-16">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-white mb-3">
          Understanding Startup Funding
        </h1>
        <p className="text-neutral-400 max-w-3xl leading-relaxed text-lg">
          {introText}
        </p>
      </div>

      {/* Funding Stages */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Funding Stages</h2>
          <p className="text-neutral-400">{stagesIntro}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stages.map((stage, i) => (
            <div key={i} className="dashboard-card group hover:border-purple-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-lg bg-purple-500/10 text-purple-400 group-hover:bg-purple-500/20 group-hover:text-purple-300 transition-colors shrink-0">
                  <stage.icon size={24} />
                </div>
                <h3 className="text-xl font-medium text-white">{stage.title}</h3>
              </div>
              
              <p className="text-neutral-300 mb-6 leading-relaxed flex-1">
                {stage.description}
              </p>

              {stage.details.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-white/5 mt-auto">
                  {stage.details.map((detail, j) => (
                    <div key={j} className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1 sm:gap-4 text-sm">
                      <span className="text-neutral-500 font-medium shrink-0">{detail.label}</span>
                      <span className="text-neutral-300 sm:text-right">{detail.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Instruments */}
      <section className="space-y-6">
        <div>
          <h2 className="text-2xl font-medium text-white mb-2">Funding Types (By Instrument)</h2>
          <p className="text-neutral-400">
            {instrumentsIntro}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {instruments.map((item, i) => (
            <div key={i} className="dashboard-card group hover:border-cyan-500/50 transition-colors flex flex-col">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20 group-hover:text-cyan-300 transition-colors shrink-0">
                  <item.icon size={20} />
                </div>
                <h3 className="text-lg font-medium text-white">{item.title}</h3>
              </div>
              
              <p className="text-neutral-300 leading-relaxed text-sm flex-1">
                {item.description}
              </p>

              {item.bullets && (
                <ul className="mt-4 space-y-2">
                  {item.bullets.map((bullet, j) => (
                    <li key={j} className="text-sm flex items-start gap-2">
                      <span className="text-cyan-500 mt-0.5">•</span>
                      <span>
                        <strong className="text-white font-medium">{bullet.label}:</strong>{' '}
                        <span className="text-neutral-400">{bullet.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Reference Table */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <TableIcon size={20} />
          </div>
          <h2 className="text-2xl font-medium text-white">Quick Reference Table</h2>
        </div>

        <div className="dashboard-card overflow-hidden !p-0 border border-white/10 rounded-xl bg-[#0a0a0a]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="p-4 font-medium text-neutral-400 text-sm tracking-wider uppercase">Stage</th>
                  <th className="p-4 font-medium text-neutral-400 text-sm tracking-wider uppercase">Typical Amount</th>
                  <th className="p-4 font-medium text-neutral-400 text-sm tracking-wider uppercase">Typical Valuation</th>
                  <th className="p-4 font-medium text-neutral-400 text-sm tracking-wider uppercase">Common Instrument</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {tableData.map((row, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-white font-medium">{row.stage}</td>
                    <td className="p-4 text-neutral-300 group-hover:text-white transition-colors">{row.amount}</td>
                    <td className="p-4 text-neutral-300 group-hover:text-white transition-colors">{row.valuation}</td>
                    <td className="p-4 text-neutral-300 group-hover:text-white transition-colors">{row.instrument}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-sm text-neutral-500 italic flex items-start gap-2">
          <span className="text-neutral-400 not-italic">*</span>
          Note: {tableNote}
        </p>
      </section>

    </div>
  )
}
