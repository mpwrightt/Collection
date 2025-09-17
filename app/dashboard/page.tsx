import { SectionCards } from "@/app/dashboard/section-cards"
import { ChartAreaInteractive } from "@/app/dashboard/chart-area-interactive"
import { HoldingsTable } from "@/app/dashboard/holdings-table"

export default function Page() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight px-4 lg:px-6">Collection Dashboard</h1>
        <p className="text-muted-foreground px-4 lg:px-6">Track your card collection value and performance</p>
      </div>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <HoldingsTable />
    </div>
  )
}
