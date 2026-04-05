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

type AnimPhase = "hidden" | "entering" | "switching" | "exiting"

interface AnimState {
  phase: AnimPhase
  /** The panel whose content should be rendered (non-null while animating out). */
  renderedPanel: PanelType
  /** Previous panel kept temporarily while switching content. */
  previousPanel: PanelType
}

type AnimAction =
  | { type: "OPEN"; panel: PanelType }
  | { type: "START_SWITCH"; panel: PanelType }
  | { type: "SWITCH_DONE" }
  | { type: "START_CLOSE" }
  | { type: "CLOSE_DONE" }

function animReducer(state: AnimState, action: AnimAction): AnimState {
  switch (action.type) {
    case "OPEN":
      return { phase: "entering", renderedPanel: action.panel, previousPanel: null }
    case "START_SWITCH":
      if (!action.panel || action.panel === state.renderedPanel) {
        return state
      }
      if (state.phase === "entering" || state.phase === "switching") {
        return {
          phase: "switching",
          renderedPanel: action.panel,
          previousPanel: state.renderedPanel,
        }
      }
      return state
    case "SWITCH_DONE":
      return state.phase === "switching"
        ? { phase: "entering", renderedPanel: state.renderedPanel, previousPanel: null }
        : state
    case "START_CLOSE":
      return state.phase === "entering" || state.phase === "switching"
        ? { phase: "exiting", renderedPanel: state.renderedPanel, previousPanel: null }
        : state
    case "CLOSE_DONE":
      return { phase: "hidden", renderedPanel: null, previousPanel: null }
    default:
      return state
  }
}

const INITIAL_ANIM_STATE: AnimState = { phase: "hidden", renderedPanel: null, previousPanel: null }
const PANEL_CLOSE_ANIMATION_MS = 400
const PANEL_SWITCH_ANIMATION_MS = 420

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
      if (anim.phase === "hidden") {
        dispatch({ type: "OPEN", panel: activePanel })
      } else if (mode === "docked" && anim.renderedPanel !== activePanel) {
        dispatch({ type: "START_SWITCH", panel: activePanel })
      } else if (anim.renderedPanel !== activePanel) {
        dispatch({ type: "OPEN", panel: activePanel })
      }
    } else {
      dispatch({ type: "START_CLOSE" })
      const timer = setTimeout(() => dispatch({ type: "CLOSE_DONE" }), PANEL_CLOSE_ANIMATION_MS)
      return () => clearTimeout(timer)
    }
  }, [activePanel, anim.phase, anim.renderedPanel, mode])

  useEffect(() => {
    if (anim.phase !== "switching") return
    const timer = setTimeout(() => dispatch({ type: "SWITCH_DONE" }), PANEL_SWITCH_ANIMATION_MS)
    return () => clearTimeout(timer)
  }, [anim.phase])

  if (anim.phase === "hidden") return null

  const renderPanelContent = (panel: PanelType, animationClass?: string) => (
    <div
      className={cn(
        "h-full overflow-y-scroll app-scrollbar",
        mode === "overlay" ? "pt-24 pb-6" : "pt-6 pb-6",
        animationClass,
      )}
    >
      {panel === "profile" && currentUser && (
        <ProfilePanel currentUser={currentUser} tasks={tasks} />
      )}
      {panel === "profile" && !currentUser && (
        <div className="p-6 text-sm text-muted-foreground">Profile data is not available.</div>
      )}
      {panel === "stats" && <StatsPanel tasks={tasks} />}
      {panel === "library" && <LibraryPanel tasks={tasks} />}
      {panel === "settings" && <SettingsPanel />}
    </div>
  )

  const panelContent = anim.phase === "switching" && mode === "docked" && anim.previousPanel ? (
    <div className="relative h-full overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {renderPanelContent(anim.previousPanel, "animate-panel-content-switch-out")}
      </div>
      <div className="absolute inset-0">
        {renderPanelContent(anim.renderedPanel, "animate-panel-content-switch-in")}
      </div>
    </div>
  ) : (
    renderPanelContent(anim.renderedPanel)
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
