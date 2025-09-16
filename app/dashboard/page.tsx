import { SectionCards } from "@/app/dashboard/section-cards"
import { ChartAreaInteractive } from "@/app/dashboard/chart-area-interactive"
import { HoldingsTable } from "@/app/dashboard/holdings-table"

export default function Page() {
  return (
    <>
      <SectionCards />
      <div className="px-4 lg:px-6">
        <ChartAreaInteractive />
      </div>
      <HoldingsTable />
    </>
  )
}
