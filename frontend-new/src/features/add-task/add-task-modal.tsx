import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeetCodeIcon } from "@/src/shared/icons/leetcode-icon"
import {
  LeetCodeTaskUrlSchema,
  type LeetCodeTaskUrlFormData,
} from "@/src/shared/validation/schemas"
import type { ScheduleMode } from "@/src/shared/types"
import type { ResolvedTaskDraft } from "@/src/shared/types"
import { resolveTaskDraft } from "@/src/shared/tasks/resolve-task"
import {
  type AddTaskFlowStep,
  ADD_TASK_FLOW_STEP_ORDER,
  addTaskFlowReducer,
  initialAddTaskFlowState,
} from "./flow-reducer"
import { OrbitalLoader } from "./orbital-loader"

interface AddTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onSaveTask: (payload: {
    scheduleMode: ScheduleMode
    note?: string
    draft: ResolvedTaskDraft
  }) => void
}

const FOCUSABLE_SELECTOR = [
  "button:not([disabled])",
  "a[href]",
  "input:not([disabled])",
  "textarea:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",")

const MODAL_EXIT_ANIMATION_MS = 500
const CONTENT_SWITCH_ANIMATION_MS = 420

type ContentTransitionDirection = "forward" | "backward"

const STEP_ORDER_INDEX = new Map(
  ADD_TASK_FLOW_STEP_ORDER.map((step, index) => [step, index] as const),
)

function getStepTransitionDirection(
  fromStep: AddTaskFlowStep,
  toStep: AddTaskFlowStep,
): ContentTransitionDirection {
  const fromIndex = STEP_ORDER_INDEX.get(fromStep)
  const toIndex = STEP_ORDER_INDEX.get(toStep)

  if (typeof fromIndex !== "number" || typeof toIndex !== "number") {
    return "forward"
  }

  return toIndex < fromIndex ? "backward" : "forward"
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => !element.hasAttribute("disabled") && element.tabIndex !== -1,
  )
}

function getLeetCodeUrlError(value: string): string | undefined {
  const result = LeetCodeTaskUrlSchema.safeParse(value)
  if (result.success) return undefined
  return result.error.issues[0]?.message ?? "Enter a valid LeetCode problem URL"
}

export function AddTaskModal({ isOpen, onClose, onSaveTask }: AddTaskModalProps) {
  const [state, dispatch] = useReducer(addTaskFlowReducer, initialAddTaskFlowState)
  const [isSaving, setIsSaving] = useState(false)
  const [isMounted, setIsMounted] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)
  const [visibleStep, setVisibleStep] = useState<AddTaskFlowStep>(state.step)
  const [leavingStep, setLeavingStep] = useState<AddTaskFlowStep | null>(null)
  const [transitionDirection, setTransitionDirection] = useState<ContentTransitionDirection>("forward")
  const [contentViewportHeight, setContentViewportHeight] = useState<number | null>(null)
  const [isContentHeightAnimating, setIsContentHeightAnimating] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeStepRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const prevFocusSelectorRef = useRef<string | null>(null)
  const isOpenRef = useRef(isOpen)
  const isClosingRef = useRef(false)
  const stepTransitionTimerRef = useRef<number | null>(null)
  const stepHeightRafRef = useRef<number | null>(null)

  useEffect(() => {
    isOpenRef.current = isOpen
  }, [isOpen])

  useEffect(() => {
    isClosingRef.current = isClosing
  }, [isClosing])

  const requestClose = useCallback(() => {
    if (!isOpenRef.current || isClosingRef.current) return
    onClose()
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      setIsClosing(false)
      setLeavingStep(null)
      setIsContentHeightAnimating(false)
      setContentViewportHeight(null)
      return
    }
    if (!isMounted) return

    setIsClosing(true)
    const closeTimer = window.setTimeout(() => {
      setIsMounted(false)
      setIsClosing(false)
      dispatch({ type: "RESET" })
      setIsSaving(false)
    }, MODAL_EXIT_ANIMATION_MS)

    return () => window.clearTimeout(closeTimer)
  }, [isMounted, isOpen])

  useEffect(() => {
    if (state.step === visibleStep) return

    const currentStepHeight = activeStepRef.current?.getBoundingClientRect().height
    if (typeof currentStepHeight === "number" && currentStepHeight > 0) {
      setContentViewportHeight(currentStepHeight)
      setIsContentHeightAnimating(true)
    } else {
      setContentViewportHeight(null)
      setIsContentHeightAnimating(false)
    }

    const direction = getStepTransitionDirection(visibleStep, state.step)
    setTransitionDirection(direction)
    setLeavingStep(visibleStep)
    setVisibleStep(state.step)

    if (stepTransitionTimerRef.current) {
      window.clearTimeout(stepTransitionTimerRef.current)
    }

    stepTransitionTimerRef.current = window.setTimeout(() => {
      setLeavingStep(null)
      setIsContentHeightAnimating(false)
      setContentViewportHeight(null)
      stepTransitionTimerRef.current = null
    }, CONTENT_SWITCH_ANIMATION_MS)
  }, [state.step, visibleStep])

  useLayoutEffect(() => {
    if (!isContentHeightAnimating) return

    if (stepHeightRafRef.current) {
      window.cancelAnimationFrame(stepHeightRafRef.current)
    }

    stepHeightRafRef.current = window.requestAnimationFrame(() => {
      const nextStepHeight = activeStepRef.current?.getBoundingClientRect().height
      if (typeof nextStepHeight === "number" && nextStepHeight > 0) {
        setContentViewportHeight(nextStepHeight)
      }
      stepHeightRafRef.current = null
    })

    return () => {
      if (stepHeightRafRef.current) {
        window.cancelAnimationFrame(stepHeightRafRef.current)
        stepHeightRafRef.current = null
      }
    }
  }, [isContentHeightAnimating, visibleStep])

  useEffect(() => {
    return () => {
      if (stepTransitionTimerRef.current) {
        window.clearTimeout(stepTransitionTimerRef.current)
      }
      if (stepHeightRafRef.current) {
        window.cancelAnimationFrame(stepHeightRafRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!isMounted) return
    prevFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    if (prevFocusRef.current?.id) {
      prevFocusSelectorRef.current = `#${CSS.escape(prevFocusRef.current.id)}`
    } else {
      prevFocusSelectorRef.current = null
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const timer = setTimeout(() => closeButtonRef.current?.focus(), 0)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        requestClose()
        return
      }
      if (event.key === "Tab" && containerRef.current) {
        const focusable = getFocusable(containerRef.current)
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (event.shiftKey && active === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && active === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener("keydown", onKeyDown)
    return () => {
      clearTimeout(timer)
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = previousOverflow
      if (prevFocusRef.current && document.contains(prevFocusRef.current)) {
        prevFocusRef.current.focus()
      } else if (prevFocusSelectorRef.current) {
        const fallback = document.querySelector<HTMLElement>(prevFocusSelectorRef.current)
        fallback?.focus()
      }
    }
  }, [isMounted, requestClose])

  if (!isMounted) return null

  const handleSubmitLeetCodeUrl = async (event: React.FormEvent) => {
    event.preventDefault()
    const formData: LeetCodeTaskUrlFormData = { url: state.leetCodeUrl }
    const result = LeetCodeTaskUrlSchema.safeParse(formData.url)
    if (!result.success) {
      dispatch({ type: "SET_LEETCODE_URL_ERROR", error: result.error.issues[0]?.message })
      return
    }

    dispatch({ type: "SUBMIT_LEETCODE_URL" })
    const resolved = await resolveTaskDraft({ source: "leetcode", rawInput: result.data })
    if (!resolved.ok) {
      dispatch({ type: "RESOLVE_FAILURE", error: "Could not resolve this task yet. Please try another URL." })
      return
    }
    dispatch({ type: "RESOLVE_SUCCESS", draft: resolved.draft })
  }

  const saveWithMode = async (scheduleMode: ScheduleMode) => {
    if (!state.resolvedTaskDraft || isSaving) return
    setIsSaving(true)
    onSaveTask({
      scheduleMode,
      note: scheduleMode === "tomorrow" ? state.note : undefined,
      draft: state.resolvedTaskDraft,
    })
    dispatch({
      type: "SAVE_SUCCESS",
      message:
        scheduleMode === "today"
          ? "Task added to your list for today."
          : "Great job! Task is scheduled for tomorrow.",
    })
    setIsSaving(false)
  }

  const renderStepContent = (step: AddTaskFlowStep) => {
    switch (step) {
      case "source-select":
        return (
          <section className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3" role="group" aria-label="Task source options">
              <button
                type="button"
                onClick={() => dispatch({ type: "SELECT_SOURCE", source: "leetcode" })}
                className={cn(
                  "h-16 rounded-2xl bg-white/[0.03]",
                  "px-4 text-left transition-all duration-200",
                  "hover:bg-white/[0.06]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
                )}
              >
                <span className="flex items-center gap-2.5 font-medium text-foreground">
                  <LeetCodeIcon className="w-5 h-5 text-foreground/95 shrink-0" aria-hidden="true" />
                  <span>LeetCode</span>
                </span>
              </button>

              <button
                type="button"
                disabled
                className={cn(
                  "h-16 rounded-2xl bg-white/[0.03]",
                  "px-4 text-left opacity-70 cursor-not-allowed",
                )}
              >
                <span className="font-medium text-foreground">Custom</span>
              </button>
            </div>
          </section>
        )

      case "leetcode-url":
        return (
          <form onSubmit={handleSubmitLeetCodeUrl} noValidate className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-foreground/90 block mb-1.5">
                LeetCode URL
              </label>
              <input
                type="url"
                value={state.leetCodeUrl}
                onChange={(event) =>
                  dispatch({ type: "UPDATE_LEETCODE_URL", value: event.target.value })
                }
                onBlur={() =>
                  dispatch({
                    type: "SET_LEETCODE_URL_ERROR",
                    error: getLeetCodeUrlError(state.leetCodeUrl),
                  })
                }
                placeholder="https://leetcode.com/problems/two-sum/"
                className={cn(
                  "w-full px-4 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                  state.leetCodeUrlError ? "ring-2 ring-destructive/60" : "focus:ring-primary/50",
                )}
              />
              {state.leetCodeUrlError && (
                <p className="mt-1.5 text-xs text-destructive">{state.leetCodeUrlError}</p>
              )}
              {state.resolveError && (
                <p className="mt-1.5 text-xs text-destructive">{state.resolveError}</p>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: "BACK_TO_SOURCE_SELECT" })}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl text-foreground/90 hover:text-foreground hover:bg-white/[0.06] transition-all duration-200"
              >
                Back
              </button>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-2xl font-medium bg-primary/20 text-primary hover:bg-primary/28 transition-all duration-200"
              >
                Continue
              </button>
            </div>
          </form>
        )

      case "loading":
        return (
          <section className="flex flex-col items-center justify-center py-8 gap-4">
            <OrbitalLoader />
            <p className="text-sm text-muted-foreground">Resolving task details…</p>
          </section>
        )

      case "solved-check":
        if (!state.resolvedTaskDraft) return null
        return (
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-medium text-foreground">{state.resolvedTaskDraft.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{state.resolvedTaskDraft.url}</p>
            </div>
            <p className="text-sm text-foreground/90">Did you solve this task now?</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => saveWithMode("today")}
                disabled={isSaving}
                className="px-4 py-3 rounded-2xl bg-white/[0.03] backdrop-blur-xl hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-60"
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "ANSWER_SOLVED" })}
                disabled={isSaving}
                className="px-4 py-3 rounded-2xl bg-primary/20 text-primary hover:bg-primary/28 transition-all duration-200 disabled:opacity-60"
              >
                Solved
              </button>
            </div>
          </section>
        )

      case "optional-note":
        if (!state.resolvedTaskDraft) return null
        return (
          <section className="flex flex-col gap-4">
            <label className="text-sm font-medium text-foreground/90">
              Optional note
              <textarea
                value={state.note}
                onChange={(event) => dispatch({ type: "UPDATE_NOTE", value: event.target.value })}
                rows={4}
                placeholder="What insight helped you solve it?"
                className="mt-1.5 w-full px-4 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-none"
              />
            </label>
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: "BACK_TO_SOLVED_CHECK" })}
                className="px-4 py-2.5 rounded-2xl bg-white/[0.03] backdrop-blur-xl text-foreground/90 hover:text-foreground hover:bg-white/[0.06] transition-all duration-200"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => saveWithMode("tomorrow")}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-2xl font-medium bg-primary/20 text-primary hover:bg-primary/28 transition-all duration-200 disabled:opacity-60"
              >
                Save for tomorrow
              </button>
            </div>
          </section>
        )

      case "success":
        return (
          <section className="flex flex-col items-center text-center py-6 gap-3">
            <Check aria-hidden="true" className="w-[1.5625rem] h-[1.5625rem] text-white" />
            <h3 className="text-lg font-semibold text-foreground">Done</h3>
            <p className="text-sm text-muted-foreground">
              {state.successMessage ?? "Task has been saved successfully."}
            </p>
          </section>
        )

      default:
        return null
    }
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 z-[95] bg-background/55 backdrop-blur-md",
        isClosing ? "animate-fade-out-fast" : "animate-fade-in-fast",
      )}
      onClick={requestClose}
      role="presentation"
    >
      <div className="min-h-screen flex items-center justify-center p-4">
        <div
          ref={containerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Add task dialog"
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "w-[min(94vw,36rem)] rounded-3xl border border-white/12",
            "bg-card/60 backdrop-blur-2xl",
            "shadow-[0_22px_70px_-36px_rgba(0,0,0,0.9)]",
            "p-6 sm:p-7 flex flex-col gap-5",
            isClosing ? "animate-scale-out" : "animate-scale-in",
          )}
        >
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-foreground">Add task</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Build your practice queue with a quick source-based flow.
              </p>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={requestClose}
              className="w-10 h-10 rounded-full glass-subtle hover:glass-profile transition-all duration-200 flex items-center justify-center"
              aria-label="Close add task dialog"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </header>

          <section
            className="relative overflow-hidden modal-flow-viewport"
            aria-live="polite"
            style={
              isContentHeightAnimating && contentViewportHeight !== null
                ? { height: `${contentViewportHeight}px` }
                : undefined
            }
          >
            <div
              key={`active-${visibleStep}`}
              ref={activeStepRef}
              className={cn(
                "modal-flow-step modal-flow-step-safe-inset",
                leavingStep &&
                  (transitionDirection === "forward"
                    ? "animate-modal-step-enter-forward"
                    : "animate-modal-step-enter-backward"),
              )}
            >
              {renderStepContent(visibleStep)}
            </div>

            {leavingStep && (
              <div
                key={`leaving-${leavingStep}`}
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 modal-flow-step modal-flow-step-safe-inset",
                  transitionDirection === "forward"
                    ? "animate-modal-step-exit-forward"
                    : "animate-modal-step-exit-backward",
                )}
              >
                {renderStepContent(leavingStep)}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>,
    document.body,
  )
}
