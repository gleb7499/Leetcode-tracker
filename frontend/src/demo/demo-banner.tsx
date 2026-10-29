import { useState } from "react"
import { RotateCcw } from "lucide-react"
import { useLocation } from "react-router-dom"
import { IS_DEMO } from "./demo-config"

async function resetDemo(): Promise<void> {
  const { resetDemoData } = await import("./mock-server")
  resetDemoData()
  try {
    // Per-user "reviewed today" counters live next to the mock database.
    for (const key of Object.keys(window.localStorage)) {
      if (key.startsWith("leetcode-tracker.daily-progress")) window.localStorage.removeItem(key)
    }
  } catch {
    // Storage is blocked: nothing to clear.
  }
  window.location.reload()
}

export function DemoBanner() {
  const [isResetting, setIsResetting] = useState(false)
  const { pathname } = useLocation()

  // Reset only makes sense inside the app; auth screens carry their own notice.
  if (!IS_DEMO || pathname === "/login" || pathname === "/verify-email") return null

  return (
    <div className="fixed bottom-4 left-4 z-30 flex items-center gap-2 rounded-full border border-border bg-card/80 py-1.5 pl-3 pr-1.5 text-xs text-muted-foreground shadow-sm backdrop-blur">
      <span>
        <span className="font-medium text-foreground/90">Demo</span>
        <span className="hidden sm:inline"> · data stays in your browser</span>
      </span>
      <button
        type="button"
        disabled={isResetting}
        onClick={() => {
          setIsResetting(true)
          void resetDemo()
        }}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
      >
        <RotateCcw className="size-3" aria-hidden />
        Reset
      </button>
    </div>
  )
}
