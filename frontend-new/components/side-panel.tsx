import { useEffect, useReducer } from "react"
import { cn } from "@/lib/utils"
import { ProfilePanel } from "./panels/profile-panel"
import { StatsPanel } from "./panels/stats-panel"
import { LibraryPanel } from "./panels/library-panel"
import { SettingsPanel } from "./panels/settings-panel"
import {
  DESKTOP_SPLIT_PANEL_RIGHT_OFFSET_CLASS,
  DESKTOP_SPLIT_PANEL_WIDTH_CLASS,
} from "./panels/split-layout"
import type { PanelType } from "./panels/panel-types"
import type { CurrentUser, Task } from "@/src/shared/types"

interface SidePanelProps {
  activePanel: PanelType
  onClose: () => void
  mode?: "overlay" | "docked"
  className?: string
  tasks?: Task[]
  currentUser?: CurrentUser | null
}

type AnimPhase = "hidden" | "entering" | "exiting"

interface AnimState {
  phase: AnimPhase
  /** The panel whose content should be rendered (non-null while animating out). */
  renderedPanel: PanelType
}

type AnimAction =
  | { type: "OPEN"; panel: PanelType }
  | { type: "START_CLOSE" }
  | { type: "CLOSE_DONE" }

function animReducer(state: AnimState, action: AnimAction): AnimState {
  switch (action.type) {
    case "OPEN":
      return { phase: "entering", renderedPanel: action.panel }
    case "START_CLOSE":
      return state.phase === "entering"
        ? { phase: "exiting", renderedPanel: state.renderedPanel }
        : state
    case "CLOSE_DONE":
      return { phase: "hidden", renderedPanel: null }
    default:
      return state
  }
}

const INITIAL_ANIM_STATE: AnimState = { phase: "hidden", renderedPanel: null }

export function SidePanel({
  activePanel,
  mode = "overlay",
  className,
  tasks,
  currentUser,
}: SidePanelProps) {
  const [anim, dispatch] = useReducer(animReducer, INITIAL_ANIM_STATE)

  useEffect(() => {
    if (activePanel) {
      dispatch({ type: "OPEN", panel: activePanel })
    } else {
      dispatch({ type: "START_CLOSE" })
      const timer = setTimeout(() => dispatch({ type: "CLOSE_DONE" }), 400)
      return () => clearTimeout(timer)
    }
  }, [activePanel])

  if (anim.phase === "hidden") return null

  const panelContent = (
    <div
      className={cn(
        "h-full overflow-y-scroll app-scrollbar",
        mode === "overlay" ? "pt-24 pb-6" : "pt-6 pb-6",
      )}
    >
      {anim.renderedPanel === "profile" && currentUser && (
        <ProfilePanel currentUser={currentUser} tasks={tasks} />
      )}
      {anim.renderedPanel === "profile" && !currentUser && (
        <div className="p-6 text-sm text-muted-foreground">Profile data is not available.</div>
      )}
      {anim.renderedPanel === "stats" && <StatsPanel tasks={tasks} />}
      {anim.renderedPanel === "library" && <LibraryPanel tasks={tasks} />}
      {anim.renderedPanel === "settings" && <SettingsPanel />}
    </div>
  )

  const isClosing = anim.phase === "exiting"

  if (mode === "docked") {
    return (
      <aside
        className={cn(
          "fixed z-40 top-4 bottom-4",
          DESKTOP_SPLIT_PANEL_RIGHT_OFFSET_CLASS,
          DESKTOP_SPLIT_PANEL_WIDTH_CLASS,
          "overflow-hidden rounded-3xl",
          "border border-white/10",
          "bg-card/45 backdrop-blur-2xl",
          "shadow-[0_18px_50px_-32px_rgba(0,0,0,0.85)]",
          isClosing ? "animate-panel-slide-out" : "animate-panel-slide-in",
          className,
        )}
      >
        {panelContent}
      </aside>
    )
  }

  return (
    <div
      className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-96 z-40",
        "glass-panel",
        isClosing ? "animate-panel-slide-out" : "animate-panel-slide-in",
        className,
      )}
    >
      {panelContent}
    </div>
  )
}
