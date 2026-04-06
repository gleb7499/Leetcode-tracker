import { useState, useCallback, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { ReviewSession } from "@/components/review-session"
import { HomeView } from "@/components/home-view"
import { ProfileMenu } from "@/components/profile-menu"
import { SidePanel } from "@/components/side-panel"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { AddTaskFab } from "@/src/features/add-task/add-task-fab"
import { AddTaskModal } from "@/src/features/add-task/add-task-modal"
import type { PanelType } from "@/components/panels/panel-types"
import { DESKTOP_SPLIT_CONTENT_RESERVE_CLASS } from "@/components/panels/split-layout"
import { useDailyProgress } from "@/hooks/use-daily-progress"
import { useAuth } from "@/src/shared/hooks/useAuth"
import { useTasks } from "@/src/shared/hooks/useTasks"
import type { Task } from "@/src/shared/types"
import { type ReviewFeedback } from "@/lib/review-feedback"
import type { ReviewStatus } from "@/src/shared/types"
import type { ResolvedTaskDraft } from "@/src/shared/types"
import { cn } from "@/lib/utils"

type ViewState = "home" | "review" | "transitioning-to-review"

const TRANSITION_DURATION_MS = 400

export default function App() {
  const navigate = useNavigate()
  const { currentUser, logout } = useAuth()
  const { tasks, getTasksForToday, recordReview, addTask } = useTasks()

  const [view, setView] = useState<ViewState>("home")
  const [activePanel, setActivePanel] = useState<PanelType>(null)
  const [isSplitDesktop, setIsSplitDesktop] = useState(false)
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [sessionTasks, setSessionTasks] = useState<Task[]>([])

  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true })
    }
  }, [currentUser, navigate])

  const todayTasks = getTasksForToday()
  const isReviewView = view === "review"
  const isTransitioningToReview = view === "transitioning-to-review"
  const isPanelOpen = !isReviewView && activePanel !== null
  const isDesktopPanelOpen = isPanelOpen && isSplitDesktop

  const {
    todayProgress,
    todayTotal,
    todayRemaining,
    incrementCompleted,
  } = useDailyProgress(todayTasks.length)

  const scheduleTransition = useCallback((nextView: Exclude<ViewState, "transitioning-to-review">) => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
    }
    transitionTimerRef.current = setTimeout(() => {
      setView(nextView)
    }, TRANSITION_DURATION_MS)
  }, [])

  const handleStartSession = useCallback(() => {
    const fresh = getTasksForToday()

    if (todayRemaining <= 0 || fresh.length === 0) {
      return
    }

    setSessionTasks(fresh)
    setActivePanel(null)
    setView("transitioning-to-review")
    scheduleTransition("review")
  }, [todayRemaining, getTasksForToday, scheduleTransition])

  const handleReviewFeedback = useCallback(
    (taskId: string, feedback: ReviewFeedback) => {
      recordReview(taskId, feedback as ReviewStatus)
      incrementCompleted()
    },
    [recordReview, incrementCompleted],
  )

  const handleEndSession = useCallback(() => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current)
      transitionTimerRef.current = null
    }
    setSessionTasks([])
    setView("home")
  }, [])

  const handlePanelChange = useCallback((panel: PanelType) => {
    setActivePanel(panel)
  }, [])

  const handleLogout = useCallback(() => {
    setIsLogoutDialogOpen(false)
    setActivePanel(null)
    logout()
    navigate("/login", { replace: true })
  }, [logout, navigate])

  const handleRequestLogout = useCallback(() => {
    setIsLogoutDialogOpen(true)
  }, [])

  const handleCancelLogout = useCallback(() => {
    setIsLogoutDialogOpen(false)
  }, [])

  const handleOpenAddTask = useCallback(() => {
    setIsAddTaskModalOpen(true)
  }, [])

  const handleCloseAddTask = useCallback(() => {
    setIsAddTaskModalOpen(false)
  }, [])

  const handleSaveTaskFromFlow = useCallback(
    ({
      scheduleMode,
      note,
      draft,
    }: {
      scheduleMode: "today" | "tomorrow"
      note?: string
      draft: ResolvedTaskDraft
    }) => {
      addTask({
        name: draft.name,
        url: draft.url,
        difficulty: draft.difficulty,
        topics: draft.topics.join(", "),
        notes: note?.trim() || draft.notes || "",
        source: draft.source,
        sourceMeta: draft.sourceMeta,
        scheduleMode,
      })
    },
    [addTask],
  )

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

  if (!currentUser) return null

  return (
    <main className="min-h-screen relative overflow-hidden">

      {/* Profile menu – always visible except during review */}
      {!isReviewView && (
        <ProfileMenu
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
          mode="floating"
          userName={currentUser.name}
          onRequestLogout={handleRequestLogout}
        />
      )}

      <ConfirmDialog
        isOpen={isLogoutDialogOpen}
        title="Sign out?"
        description="You will be returned to the login screen and need to sign in again to continue."
        confirmLabel="Sign out"
        cancelLabel="Cancel"
        onConfirm={handleLogout}
        onCancel={handleCancelLogout}
        confirmVariant="danger"
      />

      {!isReviewView && (
        <>
          <AddTaskFab onClick={handleOpenAddTask} />
          <AddTaskModal
            isOpen={isAddTaskModalOpen}
            onClose={handleCloseAddTask}
            onSaveTask={handleSaveTaskFromFlow}
          />
        </>
      )}

      {/* Content */}
      {isReviewView ? (
        <ReviewSession
          tasks={sessionTasks}
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
              "transition-[padding,opacity] duration-700 ease-out",
              isDesktopPanelOpen ? DESKTOP_SPLIT_CONTENT_RESERVE_CLASS : "pr-0",
            )}
          >
            <HomeView
              todayProgress={todayProgress}
              todayTotal={todayTotal}
              onStartSession={handleStartSession}
              isExiting={isTransitioningToReview}
              isStartDisabled={todayTasks.length === 0 || isTransitioningToReview}
              layout={isDesktopPanelOpen ? "split" : "full"}
            />
          </div>

          {/* Side panel: overlay on mobile/tablet, docked on desktop */}
          <SidePanel
            activePanel={activePanel}
            onClose={() => setActivePanel(null)}
            mode={isSplitDesktop ? "docked" : "overlay"}
            tasks={tasks}
            currentUser={currentUser}
          />
        </>
      )}
    </main>
  )
}
