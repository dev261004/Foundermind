export default function DashboardPage() {

  return (

    <div className="space-y-8">

      {/* Header */}

      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Dashboard
        </h1>

        <p className="text-neutral-400 mt-1">
          Overview of your startup ideas and AI insights
        </p>
      </div>

      {/* Stats */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        <div className="dashboard-card">
          <h3>Total Ideas</h3>
          <p className="text-3xl font-semibold mt-2">12</p>
        </div>

        <div className="dashboard-card">
          <h3>Market Models</h3>
          <p className="text-3xl font-semibold mt-2">5</p>
        </div>

        <div className="dashboard-card">
          <h3>AI Analyses</h3>
          <p className="text-3xl font-semibold mt-2">8</p>
        </div>

      </div>

      {/* Recent Ideas */}

      <div className="dashboard-card">

        <h2 className="text-lg font-medium mb-4">
          Recent Ideas
        </h2>

        <ul className="space-y-3 text-neutral-300">

          <li>AI powered hiring platform</li>
          <li>Decentralized freelancer marketplace</li>
          <li>AI healthcare assistant</li>

        </ul>

      </div>

    </div>

  )
}