import { AppSidebar } from "@/app/dashboard/app-sidebar"
import { LoadingBar } from "@/app/dashboard/loading-bar"
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
        } as React.CSSProperties
      }
      className="group/layout"
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <LoadingBar />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
} 