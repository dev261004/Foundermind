"use client"

import { PageContainer } from "@/components/layout/PageContainer"
import { DashboardGrid } from "@/components/layout/DashboardGrid"
import { GridItem } from "@/components/layout/GridItem"
import { cn } from "@/lib/utils"

// Sample card component for testing
function TestCard({ 
  title, 
  children, 
  className,
  color = "blue" 
}: { 
  title: string
  children: React.ReactNode
  className?: string
  color?: "blue" | "green" | "purple" | "orange"
}) {
  const colorClasses = {
    blue: "border-l-blue-500 bg-blue-50 dark:bg-blue-950/30",
    green: "border-l-green-500 bg-green-50 dark:bg-green-950/30",
    purple: "border-l-purple-500 bg-purple-50 dark:bg-purple-950/30",
    orange: "border-l-orange-500 bg-orange-50 dark:bg-orange-950/30",
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-neutral-200 dark:border-neutral-800",
        "bg-white dark:bg-neutral-900",
        "p-6 shadow-sm",
        colorClasses[color],
        "border-l-4",
        className
      )}
    >
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
        {title}
      </h3>
      {children}
    </div>
  )
}

// Sample content for grid items
function StatBox({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-neutral-500 dark:text-neutral-400">{label}</span>
      <span className="text-2xl font-bold text-neutral-900 dark:text-white">{value}</span>
      {change && (
        <span className="text-sm text-green-600 dark:text-green-400">{change}</span>
      )}
    </div>
  )
}

export default function TestDashboardPage() {
  return (
    <PageContainer>
      <div className="space-y-8">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">
            Dashboard Test Page
          </h1>
          <p className="text-neutral-600 dark:text-neutral-400 mt-2">
            Testing all layout components: Sidebar, Topbar, PageContainer, DashboardGrid, GridItem
          </p>
        </div>

        {/* Test Section 1: Full Width Cards */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            Full Width Items (span=1)
          </h2>
          <DashboardGrid columns={2} gap="md">
            <GridItem span={1}>
              <TestCard title="Sidebar Test" color="blue">
                <div className="space-y-2">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    The sidebar should be visible on the left with navigation items:
                  </p>
                  <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>Dashboard</li>
                    <li>Ideas</li>
                    <li>Analytics</li>
                    <li>Market Models</li>
                    <li>Drift Monitor</li>
                  </ul>
                  <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-4">
                    ✓ Try collapsing the sidebar (click the collapse button)
                    <br />
                    ✓ Try on mobile (resize window below 1024px)
                  </p>
                </div>
              </TestCard>
            </GridItem>
            <GridItem span={1}>
              <TestCard title="Topbar Test" color="green">
                <div className="space-y-2">
                  <p className="text-neutral-600 dark:text-neutral-400">
                    The topbar (toolbar) should have:
                  </p>
                  <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1">
                    <li>Sidebar toggle button</li>
                    <li>Page title</li>
                    <li>Search input (center)</li>
                    <li>Notification bell</li>
                    <li>Theme toggle</li>
                    <li>User menu</li>
                  </ul>
                  <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-4">
                    ✓ Click the sidebar toggle to collapse/expand
                    <br />
                    ✓ Try the theme toggle for dark/light mode
                  </p>
                </div>
              </TestCard>
            </GridItem>
          </DashboardGrid>
        </section>

        {/* Test Section 2: Spanning Items */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            Spanning Items (span=2)
          </h2>
          <DashboardGrid columns={2} gap="md">
            <GridItem span={2}>
              <TestCard title="PageContainer & Grid Layout Test" color="purple">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <StatBox label="Total Ideas" value="127" change="+12%" />
                  <StatBox label="Active Runs" value="8" change="+3" />
                  <StatBox label="Drift Score" value="2.4%" change="-0.5%" />
                  <StatBox label="Confidence" value="87%" change="+5%" />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-500 mt-4">
                  ✓ This card spans 2 columns on xl screens
                  <br />
                  ✓ PageContainer limits max-width to 1400px with responsive padding
                </p>
              </TestCard>
            </GridItem>
          </DashboardGrid>
        </section>

        {/* Test Section 3: Different Column Counts */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            4 Column Grid Test
          </h2>
          <DashboardGrid columns={4} gap="sm">
            <GridItem span={1}>
              <TestCard title="Col 1" color="blue">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Single column item
                </p>
              </TestCard>
            </GridItem>
            <GridItem span={1}>
              <TestCard title="Col 2" color="green">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Single column item
                </p>
              </TestCard>
            </GridItem>
            <GridItem span={1}>
              <TestCard title="Col 3" color="purple">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Single column item
                </p>
              </TestCard>
            </GridItem>
            <GridItem span={1}>
              <TestCard title="Col 4" color="orange">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Single column item
                </p>
              </TestCard>
            </GridItem>
          </DashboardGrid>
        </section>

        {/* Test Section 4: Mixed Spans */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            Mixed Spans Test
          </h2>
          <DashboardGrid columns={4} gap="md">
            <GridItem span={3}>
              <TestCard title="Wide Item (span=3)" color="blue">
                <p className="text-neutral-600 dark:text-neutral-400">
                  This item spans 3 columns on xl screens, 2 on large screens, and full width on smaller screens.
                </p>
                <div className="mt-4 h-32 bg-neutral-100 dark:bg-neutral-800 rounded flex items-center justify-center">
                  <span className="text-neutral-400">Chart Area</span>
                </div>
              </TestCard>
            </GridItem>
            <GridItem span={1}>
              <TestCard title="Narrow (span=1)" color="orange">
                <p className="text-neutral-600 dark:text-neutral-400">
                  Side content or stats
                </p>
              </TestCard>
            </GridItem>
          </DashboardGrid>
        </section>

        {/* Test Section 5: Different Gap Sizes */}
        <section>
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            Gap Sizes Test
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Gap: sm (gap-4)
              </h3>
              <DashboardGrid columns={3} gap="sm">
                {[1, 2, 3].map((i) => (
                  <GridItem key={i} span={1}>
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded text-center">
                      Item {i}
                    </div>
                  </GridItem>
                ))}
              </DashboardGrid>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Gap: md (gap-6) - Default
              </h3>
              <DashboardGrid columns={3} gap="md">
                {[1, 2, 3].map((i) => (
                  <GridItem key={i} span={1}>
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded text-center">
                      Item {i}
                    </div>
                  </GridItem>
                ))}
              </DashboardGrid>
            </div>
            <div>
              <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                Gap: lg (gap-8)
              </h3>
              <DashboardGrid columns={3} gap="lg">
                {[1, 2, 3].map((i) => (
                  <GridItem key={i} span={1}>
                    <div className="bg-neutral-100 dark:bg-neutral-800 p-4 rounded text-center">
                      Item {i}
                    </div>
                  </GridItem>
                ))}
              </DashboardGrid>
            </div>
          </div>
        </section>

        {/* Test Instructions */}
        <section className="bg-neutral-100 dark:bg-neutral-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
            Testing Instructions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
                Sidebar Tests
              </h3>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1 text-sm">
                <li>Verify sidebar appears on the left</li>
                <li>Click collapse button to collapse/expand</li>
                <li>Resize window to mobile size</li>
                <li>Mobile: sidebar should become a drawer</li>
                <li>Test mobile drawer open/close</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
                Topbar Tests
              </h3>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1 text-sm">
                <li>Verify topbar is sticky at top</li>
                <li>Test sidebar toggle button</li>
                <li>Test search input functionality</li>
                <li>Test notification bell</li>
                <li>Test theme toggle (light/dark)</li>
                <li>Test user menu dropdown</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
                Grid Tests
              </h3>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1 text-sm">
                <li>Test responsive column changes</li>
                <li>Test different span values</li>
                <li>Test gap sizes (sm, md, lg)</li>
                <li>Verify xl breakpoint behavior</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-neutral-900 dark:text-white mb-2">
                PageContainer Tests
              </h3>
              <ul className="list-disc list-inside text-neutral-600 dark:text-neutral-400 space-y-1 text-sm">
                <li>Verify max-width is 1400px</li>
                <li>Test responsive padding</li>
                <li>Verify centered layout</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </PageContainer>
  )
}

