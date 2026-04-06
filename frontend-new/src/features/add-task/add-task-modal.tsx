import { useCallback, useEffect, useReducer, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  LeetCodeTaskUrlSchema,
  type LeetCodeTaskUrlFormData,
} from "@/src/shared/validation/schemas"
import type { ScheduleMode } from "@/src/shared/types"
import type { ResolvedTaskDraft } from "@/src/shared/types"
import { resolveTaskDraft } from "@/src/shared/tasks/resolve-task"
import {
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
  const containerRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const prevFocusSelectorRef = useRef<string | null>(null)

  const handleClose = useCallback(() => {
    dispatch({ type: "RESET" })
    setIsSaving(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
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
        handleClose()
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
  }, [isOpen, handleClose])

  if (!isOpen) return null

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

  return createPortal(
    <div
      className="fixed inset-0 z-[95] bg-background/55 backdrop-blur-md animate-fade-in-fast"
      onClick={handleClose}
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
            "p-6 sm:p-7 flex flex-col gap-5 animate-scale-in",
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
              onClick={handleClose}
              className="w-10 h-10 rounded-full glass-subtle hover:glass-profile transition-all duration-200 flex items-center justify-center"
              aria-label="Close add task dialog"
            >
              <X className="w-4 h-4 text-foreground" />
            </button>
          </header>

          {state.step === "source-select" && (
            <section className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => dispatch({ type: "SELECT_SOURCE", source: "leetcode" })}
                className="text-left rounded-2xl border border-primary/25 bg-primary/[0.08] hover:bg-primary/[0.12] transition-colors p-4"
              >
                <p className="font-medium text-foreground">LeetCode</p>
                <p className="text-sm text-muted-foreground mt-1">Import by problem URL</p>
              </button>
              <button
                type="button"
                disabled
                className="text-left rounded-2xl border border-white/10 bg-white/[0.03] p-4 opacity-70 cursor-not-allowed"
              >
                <p className="font-medium text-foreground">Custom</p>
                <p className="text-sm text-muted-foreground mt-1">Coming soon</p>
              </button>
            </section>
          )}

          {state.step === "leetcode-url" && (
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
                  className="px-4 py-2.5 rounded-2xl glass-subtle text-foreground/90 hover:text-foreground hover:glass-profile transition-all duration-200"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-2xl font-medium border bg-primary/20 text-primary border-primary/35 hover:bg-primary/28 transition-all duration-200"
                >
                  Continue
                </button>
              </div>
            </form>
          )}

          {state.step === "loading" && (
            <section className="flex flex-col items-center justify-center py-8 gap-4">
              <OrbitalLoader />
              <p className="text-sm text-muted-foreground">Resolving task details…</p>
            </section>
          )}

          {state.step === "solved-check" && state.resolvedTaskDraft && (
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
                  className="px-4 py-3 rounded-2xl glass-subtle hover:glass-profile transition-all duration-200 disabled:opacity-60"
                >
                  Not yet
                </button>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "ANSWER_SOLVED" })}
                  disabled={isSaving}
                  className="px-4 py-3 rounded-2xl border bg-primary/20 text-primary border-primary/35 hover:bg-primary/28 transition-all duration-200 disabled:opacity-60"
                >
                  Solved
                </button>
              </div>
            </section>
          )}

          {state.step === "optional-note" && state.resolvedTaskDraft && (
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
                  className="px-4 py-2.5 rounded-2xl glass-subtle text-foreground/90 hover:text-foreground hover:glass-profile transition-all duration-200"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => saveWithMode("tomorrow")}
                  disabled={isSaving}
                  className="px-4 py-2.5 rounded-2xl font-medium border bg-primary/20 text-primary border-primary/35 hover:bg-primary/28 transition-all duration-200 disabled:opacity-60"
                >
                  Save for tomorrow
                </button>
              </div>
            </section>
          )}

          {state.step === "success" && (
            <section className="flex flex-col items-center text-center py-6 gap-3">
              <div className="w-11 h-11 rounded-full border border-primary/40 bg-primary/15 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Done</h3>
              <p className="text-sm text-muted-foreground">
                {state.successMessage ?? "Task has been saved successfully."}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
