import { useState, useCallback, useEffect, useRef } from "react"
import { ReviewSession } from "@/components/review-session"
import { HomeView } from "@/components/home-view"
import { ProfileMenu, type PanelType } from "@/components/profile-menu"
import { SidePanel } from "@/components/side-panel"
import { useDailyProgress } from "@/hooks/use-daily-progress"
import { type ReviewFeedback } from "@/lib/review-feedback"
import { cn } from "@/lib/utils"

type ViewState = "home" | "review" | "transitioning"

const TRANSITION_DURATION_MS = 400

export default function App() {
  const [view, setView] = useState<ViewState>("home")
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [isSplitDesktop, setIsSplitDesktop] = useState(false)

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isReviewView = view === "review"
  const isPanelOpen = !isReviewView && activePanel !== null
  const isDesktopPanelOpen = isPanelOpen && isSplitDesktop

  const {
    todayProgress,
    todayTotal,
    todayRemaining,
    incrementCompleted,
  } = useDailyProgress(12)

  const scheduleTransition = useCallback((nextView: ViewState) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
    }
    transitionTimerRef.current = setTimeout(() => {
      setView(nextView)
    }, TRANSITION_DURATION_MS)
  }, [])

  const handleStartSession = useCallback(() => {
    if (todayRemaining <= 0) {
      return
    }
    setActivePanel(null)
    setView("transitioning")
    scheduleTransition("review")
  }, [todayRemaining, scheduleTransition])

  const handleReviewFeedback = useCallback((_: ReviewFeedback) => {
    incrementCompleted()
  }, [incrementCompleted])

  const handleEndSession = useCallback(() => {
    setView("transitioning")
    scheduleTransition("home")
  }, [scheduleTransition])

  const handlePanelChange = useCallback((panel: PanelType) => {
    setActivePanel(panel)
  }, [])

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 1024px)")
    const onChange = () => {
      setIsSplitDesktop(mql.matches)
    }
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  useEffect(() => {
    return () => {
      if (transitionTimerRef.current) {
        clearTimeout(transitionTimerRef.current)
      }
    }
  }, [])

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Ambient background – morphing glass orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="ambient-orb ambient-orb--primary animate-morph" />
        <div className="ambient-orb ambient-orb--accent animate-morph animate-delay-neg-4s" />
      </div>

      {/* Profile menu – always visible except during review */}
      {!isReviewView && (
        <ProfileMenu
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
          mode="floating"
        />
      )}

      {/* Content */}
      {isReviewView ? (
        <ReviewSession
          onReviewFeedback={handleReviewFeedback}
          onEnd={handleEndSession}
          currentProgress={todayProgress}
          totalCards={todayTotal}
        />
      ) : (
        <>
          {/* Main content: smoothly shifts left when desktop side panel opens */}
          <div
            className={cn(
              "transition-[transform,padding,opacity] duration-700 ease-out",
              isDesktopPanelOpen
                ? "lg:-translate-x-8 lg:pr-[calc(min(56vw,920px)+7rem)]"
                : "translate-x-0 pr-0",
            )}
          >
            <HomeView
              todayProgress={todayProgress}
              todayTotal={todayTotal}
              onStartSession={handleStartSession}
              isExiting={view === "transitioning"}
            />
          </div>

          {/* Side panel: overlay on mobile/tablet, docked on desktop */}
          <SidePanel
            activePanel={activePanel}
            onClose={() => setActivePanel(null)}
            mode={isSplitDesktop ? "docked" : "overlay"}
          />
        </>
      )}
    </main>
  )
}
