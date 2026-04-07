import { Outlet } from "react-router-dom"
import { AmbientBackground } from "@/components/ambient-background"

export function RootLayout() {
  return (
    <div className="min-h-screen relative isolate bg-background">
      <AmbientBackground />
      <div className="relative z-10 min-h-screen">
        <Outlet />
      </div>
    </div>
  )
}
