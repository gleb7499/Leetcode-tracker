"use client"

import { useState, useCallback, useEffect } from "react"
import { ReviewSession } from "@/components/review-session"
import { HomeView } from "@/components/home-view"
import { ProfileMenu, type PanelType } from "@/components/profile-menu"
import { SidePanel } from "@/components/side-panel"
import { useDailyProgress } from "@/hooks/use-daily-progress"
import { type ReviewFeedback } from "@/lib/review-feedback"
import { cn } from "@/lib/utils"

export default function Home() {
  const [view, setView] = useState<"home" | "review" | "transitioning">("home")
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [isSplitDesktop, setIsSplitDesktop] = useState(false)
  const isReviewView = view === "review"
  const isPanelOpen = !isReviewView && activePanel !== null
  const isDesktopPanelOpen = isPanelOpen && isSplitDesktop
  const {
    todayProgress,
    todayTotal,
    todayRemaining,
    incrementCompleted,
  } = useDailyProgress(12)

  const handleStartSession = useCallback(() => {
    if (todayRemaining <= 0) {
      return
    }

    // Close panel if open before starting session
    setActivePanel(null)
    setView("transitioning")
    setTimeout(() => {
      setView("review")
    }, 400)
  }, [todayRemaining])

  const handleReviewFeedback = useCallback((_: ReviewFeedback) => {
    // Placeholder: while backend review endpoint is not wired, any feedback counts as one reviewed task.
    incrementCompleted()
  }, [incrementCompleted])

  const handleEndSession = useCallback(() => {
    setView("transitioning")
    setTimeout(() => {
      setView("home")
    }, 400)
  }, [])

  const handlePanelChange = useCallback((panel: PanelType) => {
    setActivePanel(panel)
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const mql = window.matchMedia("(min-width: 1024px)")
    const onChange = () => {
      setIsSplitDesktop(mql.matches)
    }

    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return (
    <main className="min-h-screen relative overflow-hidden bg-background">
      {/* Ambient background - morphing glass orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/8 blur-[100px] animate-morph"
        />
        <div 
          className="absolute bottom-1/3 right-1/4 w-[300px] h-[300px] bg-accent/5 blur-[80px] animate-morph"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      {/* Profile menu - always visible except during review */}
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
                : "translate-x-0 pr-0"
            )}
          >
            <HomeView
              todayProgress={todayProgress}
              todayTotal={todayTotal}
              onStartSession={handleStartSession}
              isExiting={view === "transitioning"}
            />
          </div>

          {/* Side panel: overlay on mobile/tablet, docked in the middle on desktop */}
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
