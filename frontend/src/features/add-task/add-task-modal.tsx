import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Check, LeetCodeIcon, X } from "@/src/shared/resources/icons"
import { cn } from "@/lib/utils"
import {
  LeetCodeTaskUrlSchema,
  ManualTaskDetailsSchema,
  type LeetCodeTaskUrlFormData,
} from "@/src/shared/validation/schemas"
import type { Difficulty, ResolvedTaskDraft, ScheduleMode, TaskSource } from "@/src/shared/types"
import { resolveTaskDraft } from "@/src/shared/tasks/resolve-task"
import { searchTopicsForSource } from "@/src/shared/tasks/topic-search-provider"
import { TaskDifficultyPill } from "@/src/shared/components/task-difficulty-pill"
import { TaskTopicChip } from "@/src/shared/components/task-topic-chip"
import { FieldErrorMessage } from "@/src/shared/components/field-error-message"
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
const MANUAL_TOPIC_REMOVE_ANIMATION_MS = 300

type ContentTransitionDirection = "forward" | "backward"

interface TopicChipPosition {
  left: number
  top: number
}

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

const DIFFICULTY_OPTIONS: Difficulty[] = ["Easy", "Medium", "Hard"]

const DIFFICULTY_HOVER_CLASS: Record<Difficulty, string> = {
  Easy: "manual-difficulty-option--easy",
  Medium: "manual-difficulty-option--medium",
  Hard: "manual-difficulty-option--hard",
}

const DIFFICULTY_SELECTED_CLASS: Record<Difficulty, string> = {
  Easy: "manual-difficulty-option--selected-easy",
  Medium: "manual-difficulty-option--selected-medium",
  Hard: "manual-difficulty-option--selected-hard",
}

type ManualFieldName = "name" | "difficulty" | "topics"

function getManualFieldError(
  field: ManualFieldName,
  values: {
    name: string
    difficulty: Difficulty | null
    topics: string[]
  },
): string | undefined {
  const result = ManualTaskDetailsSchema.safeParse({
    name: values.name,
    difficulty: values.difficulty ?? undefined,
    topics: values.topics,
  })

  if (result.success) {
    return undefined
  }

  return result.error.issues.find((issue) => issue.path[0] === field)?.message
}

function slugifyForCustomUrl(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function buildManualTaskUrl(source: TaskSource, taskName: string, fallbackUrl: string): string {
  if (source === "leetcode") {
    return fallbackUrl
  }

  const slug = slugifyForCustomUrl(taskName)
  const timestamp = Date.now().toString(36)
  return `custom://manual/${slug || "task"}-${timestamp}`
}

function getResolveFailureMessage(reason: string): string {
  if (reason === "invalid_input") {
    return "Could not parse this URL. Please check it and try again."
  }

  return "Could not resolve this task automatically. Fill in details manually to continue."
}

const TOPIC_SUGGESTIONS_LISTBOX_ID = "manual-topic-suggestions-listbox"

function getTopicSuggestionOptionId(topic: string): string {
  return `manual-topic-suggestion-${slugifyForCustomUrl(topic) || "topic"}`
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
  const [activeTopicSuggestionTopic, setActiveTopicSuggestionTopic] = useState<string | null>(null)
  const [removingManualTopics, setRemovingManualTopics] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement | null>(null)
  const contentViewportRef = useRef<HTMLElement | null>(null)
  const activeStepRef = useRef<HTMLDivElement | null>(null)
  const topicSuggestionItemRefs = useRef(new Map<string, HTMLButtonElement>())
  const topicSuggestionOffsetsRef = useRef(new Map<string, number>())
  const manualTopicListViewportRef = useRef<HTMLDivElement | null>(null)
  const manualTopicListContentRef = useRef<HTMLDivElement | null>(null)
  const manualTopicItemRefs = useRef(new Map<string, HTMLSpanElement>())
  const manualTopicPositionsRef = useRef(new Map<string, TopicChipPosition>())
  const manualTopicRemovalTimersRef = useRef(new Map<string, number>())
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)
  const prevFocusRef = useRef<HTMLElement | null>(null)
  const prevFocusSelectorRef = useRef<string | null>(null)
  const isOpenRef = useRef(isOpen)
  const isClosingRef = useRef(false)
  const stepTransitionTimerRef = useRef<number | null>(null)
  const stepHeightRafRef = useRef<number | null>(null)
  const contentResizeTimerRef = useRef<number | null>(null)

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

  const topicSuggestions = useMemo(() => {
    if (state.step !== "manual-details" || !state.source) {
      return []
    }

    const query = state.manualDetails.topicQuery.trim()
    if (!query) {
      return []
    }

    return searchTopicsForSource(state.source, query).filter(
      (topic) => !state.manualDetails.topics.includes(topic),
    )
  }, [
    state.manualDetails.topicQuery,
    state.manualDetails.topics,
    state.source,
    state.step,
  ])

  const hasTopicQuery = state.manualDetails.topicQuery.trim().length > 0

  const setTopicSuggestionRef = useCallback((topic: string, element: HTMLButtonElement | null) => {
    if (element) {
      topicSuggestionItemRefs.current.set(topic, element)
      return
    }
    topicSuggestionItemRefs.current.delete(topic)
  }, [])

  const setManualTopicItemRef = useCallback((topic: string, element: HTMLSpanElement | null) => {
    if (element) {
      manualTopicItemRefs.current.set(topic, element)
      return
    }
    manualTopicItemRefs.current.delete(topic)
  }, [])

  const activeTopicSuggestionIndex = useMemo(() => {
    if (topicSuggestions.length === 0) return -1
    if (!activeTopicSuggestionTopic) return 0

    const topicIndex = topicSuggestions.indexOf(activeTopicSuggestionTopic)
    return topicIndex >= 0 ? topicIndex : 0
  }, [activeTopicSuggestionTopic, topicSuggestions])

  const activeTopicSuggestion =
    activeTopicSuggestionIndex >= 0 ? topicSuggestions[activeTopicSuggestionIndex] : undefined

  useEffect(() => {
    const activeTopic = activeTopicSuggestion
    if (!activeTopic) return

    const activeElement = topicSuggestionItemRefs.current.get(activeTopic)
    activeElement?.scrollIntoView({ block: "nearest" })
  }, [activeTopicSuggestion])

  useLayoutEffect(() => {
    if (state.step !== "manual-details") {
      topicSuggestionOffsetsRef.current.clear()
      return
    }

    const previousOffsets = topicSuggestionOffsetsRef.current
    const nextOffsets = new Map<string, number>()
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    for (const topic of topicSuggestions) {
      const element = topicSuggestionItemRefs.current.get(topic)
      if (!element) continue

      const nextTop = element.offsetTop
      nextOffsets.set(topic, nextTop)

      if (prefersReducedMotion) continue

      const previousTop = previousOffsets.get(topic)
      if (typeof previousTop !== "number") {
        element.animate(
          [
            { opacity: 0, transform: "translateY(8px)" },
            { opacity: 1, transform: "translateY(0)" },
          ],
          { duration: 300, easing: "ease-in-out" },
        )
        continue
      }

      const deltaY = previousTop - nextTop
      if (Math.abs(deltaY) < 1) continue

      element.animate(
        [
          { transform: `translateY(${deltaY}px)` },
          { transform: "translateY(0)" },
        ],
        { duration: 340, easing: "ease-in-out" },
      )
    }

    topicSuggestionOffsetsRef.current = nextOffsets
  }, [state.step, topicSuggestions])

  useLayoutEffect(() => {
    if (state.step !== "manual-details") {
      manualTopicPositionsRef.current.clear()
      return
    }

    const listContent = manualTopicListContentRef.current
    if (!listContent) {
      manualTopicPositionsRef.current.clear()
      return
    }

    const previousPositions = manualTopicPositionsRef.current
    const nextPositions = new Map<string, TopicChipPosition>()
    const listContentRect = listContent.getBoundingClientRect()
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    for (const topic of state.manualDetails.topics) {
      const element = manualTopicItemRefs.current.get(topic)
      if (!element) continue

      const elementRect = element.getBoundingClientRect()

      const nextPosition = {
        left: elementRect.left - listContentRect.left,
        top: elementRect.top - listContentRect.top,
      }
      nextPositions.set(topic, nextPosition)

      if (prefersReducedMotion) continue

      for (const animation of element.getAnimations()) {
        animation.cancel()
      }

      const previousPosition = previousPositions.get(topic)
      if (!previousPosition) {
        element.animate(
          [
            { opacity: 0, transform: "translateY(8px) scale(0.96)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 260, easing: "ease-in-out" },
        )
        continue
      }

      const deltaX = previousPosition.left - nextPosition.left
      const deltaY = previousPosition.top - nextPosition.top

      if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) continue

      element.animate(
        [
          { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
          { transform: "translate3d(0, 0, 0)" },
        ],
        { duration: 320, easing: "ease-in-out" },
      )
    }

    manualTopicPositionsRef.current = nextPositions
  }, [state.manualDetails.topics, state.step])

  useLayoutEffect(() => {
    if (state.step !== "manual-details" || state.manualDetails.topics.length === 0) {
      const viewport = manualTopicListViewportRef.current
      if (viewport) {
        viewport.style.height = ""
        viewport.style.overflow = ""
      }
      return
    }

    const viewport = manualTopicListViewportRef.current
    const content = manualTopicListContentRef.current
    if (!viewport || !content || typeof ResizeObserver === "undefined") {
      return
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let previousHeight = content.getBoundingClientRect().height
    viewport.style.overflow = "hidden"
    viewport.style.height = `${previousHeight}px`

    const observer = new ResizeObserver((entries) => {
      const nextHeight = entries[0]?.contentRect.height
      if (typeof nextHeight !== "number") return
      if (Math.abs(nextHeight - previousHeight) < 1) return

      if (!prefersReducedMotion) {
        viewport.animate(
          [
            { height: `${previousHeight}px` },
            { height: `${nextHeight}px` },
          ],
          { duration: 320, easing: "ease-in-out" },
        )
      }

      viewport.style.height = `${nextHeight}px`
      previousHeight = nextHeight
    })

    observer.observe(content)

    return () => {
      observer.disconnect()
      viewport.style.height = ""
      viewport.style.overflow = ""
    }
  }, [state.manualDetails.topics.length, state.step])

  // This effect mirrors external open/close control into local animation lifecycle state.
  // The transitions are intentional and run in a bounded sequence with timer cleanup.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true)
      setIsClosing(false)
      setLeavingStep(null)
      setIsContentHeightAnimating(false)
      setContentViewportHeight(null)
      setRemovingManualTopics(new Set())
      return
    }
    if (!isMounted) return

    setIsClosing(true)
    const closeTimer = window.setTimeout(() => {
      setIsMounted(false)
      setIsClosing(false)
      dispatch({ type: "RESET" })
      setIsSaving(false)
      setRemovingManualTopics(new Set())
    }, MODAL_EXIT_ANIMATION_MS)

    return () => window.clearTimeout(closeTimer)
  }, [isMounted, isOpen])
  /* eslint-enable react-hooks/set-state-in-effect */

  // This effect coordinates animated step transitions and temporary viewport sizing.
  // State updates are required to orchestrate enter/exit phases and are cleared by timers.
  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

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

  useLayoutEffect(() => {
    if (!isMounted || leavingStep) return
    if (typeof ResizeObserver === "undefined") return

    const viewport = contentViewportRef.current
    const activeStep = activeStepRef.current
    if (!viewport || !activeStep) return

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    let rafId: number | null = null

    const observer = new ResizeObserver((entries) => {
      if (prefersReducedMotion) return

      const nextHeight = entries[0]?.contentRect.height
      if (typeof nextHeight !== "number" || nextHeight <= 0) return

      const currentHeight = viewport.getBoundingClientRect().height
      if (Math.abs(nextHeight - currentHeight) < 1) return

      setIsContentHeightAnimating(true)
      setContentViewportHeight(currentHeight)

      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }

      rafId = window.requestAnimationFrame(() => {
        setContentViewportHeight(nextHeight)

        if (contentResizeTimerRef.current) {
          window.clearTimeout(contentResizeTimerRef.current)
        }

        contentResizeTimerRef.current = window.setTimeout(() => {
          if (!stepTransitionTimerRef.current) {
            setIsContentHeightAnimating(false)
            setContentViewportHeight(null)
          }
          contentResizeTimerRef.current = null
        }, 280)

        rafId = null
      })
    })

    observer.observe(activeStep)

    return () => {
      observer.disconnect()
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId)
      }
    }
  }, [isMounted, leavingStep, visibleStep])

  useEffect(() => {
    const manualTopicRemovalTimers = manualTopicRemovalTimersRef.current

    return () => {
      if (stepTransitionTimerRef.current) {
        window.clearTimeout(stepTransitionTimerRef.current)
      }
      if (stepHeightRafRef.current) {
        window.cancelAnimationFrame(stepHeightRafRef.current)
      }
      if (contentResizeTimerRef.current) {
        window.clearTimeout(contentResizeTimerRef.current)
      }
      for (const timerId of manualTopicRemovalTimers.values()) {
        window.clearTimeout(timerId)
      }
      manualTopicRemovalTimers.clear()
    }
  }, [])

  useEffect(() => {
    if (state.step !== "manual-details") {
      manualTopicPositionsRef.current.clear()
      for (const timerId of manualTopicRemovalTimersRef.current.values()) {
        window.clearTimeout(timerId)
      }
      manualTopicRemovalTimersRef.current.clear()
    }
  }, [state.step])

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
      if (event.ctrlKey || event.metaKey || event.altKey) {
        return
      }

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
      dispatch({
        type: "RESOLVE_FAILURE",
        error: getResolveFailureMessage(resolved.reason),
        fallbackDraft: resolved.fallbackDraft,
      })
      return
    }
    dispatch({ type: "RESOLVE_SUCCESS", draft: resolved.draft })
  }

  const handleManualTopicPick = (topic: string) => {
    setRemovingManualTopics((previous) => {
      if (!previous.has(topic)) return previous
      const next = new Set(previous)
      next.delete(topic)
      return next
    })
    dispatch({ type: "ADD_MANUAL_TOPIC", topic })
    setActiveTopicSuggestionTopic(null)
  }

  const handleManualTopicRemove = (topic: string) => {
    if (removingManualTopics.has(topic)) {
      return
    }

    setRemovingManualTopics((previous) => {
      const next = new Set(previous)
      next.add(topic)
      return next
    })

    const existingTimer = manualTopicRemovalTimersRef.current.get(topic)
    if (existingTimer) {
      window.clearTimeout(existingTimer)
    }

    const timer = window.setTimeout(() => {
      dispatch({ type: "REMOVE_MANUAL_TOPIC", topic })
      setRemovingManualTopics((previous) => {
        if (!previous.has(topic)) return previous
        const next = new Set(previous)
        next.delete(topic)
        return next
      })
      manualTopicRemovalTimersRef.current.delete(topic)
    }, MANUAL_TOPIC_REMOVE_ANIMATION_MS)

    manualTopicRemovalTimersRef.current.set(topic, timer)
  }

  const clearManualTopicRemovalState = () => {
    for (const timerId of manualTopicRemovalTimersRef.current.values()) {
      window.clearTimeout(timerId)
    }
    manualTopicRemovalTimersRef.current.clear()
    setRemovingManualTopics(new Set())
  }

  const handleBackFromManualDetails = () => {
    clearManualTopicRemovalState()
    dispatch({ type: "BACK_FROM_MANUAL_DETAILS" })
  }

  const handleSubmitManualDetails = (event: React.FormEvent) => {
    event.preventDefault()

    const candidate = {
      name: state.manualDetails.name,
      difficulty: state.manualDetails.difficulty ?? undefined,
      topics: state.manualDetails.topics,
    }

    const result = ManualTaskDetailsSchema.safeParse(candidate)
    if (!result.success) {
      dispatch({
        type: "SET_MANUAL_FIELD_ERROR",
        field: "name",
        error: getManualFieldError("name", state.manualDetails),
      })
      dispatch({
        type: "SET_MANUAL_FIELD_ERROR",
        field: "difficulty",
        error: getManualFieldError("difficulty", state.manualDetails),
      })
      dispatch({
        type: "SET_MANUAL_FIELD_ERROR",
        field: "topics",
        error: getManualFieldError("topics", state.manualDetails),
      })
      return
    }

    const source = state.source ?? "custom"
    const draft: ResolvedTaskDraft = {
      source,
      name: result.data.name,
      url: buildManualTaskUrl(source, result.data.name, state.manualDetails.url),
      difficulty: result.data.difficulty,
      topics: result.data.topics,
      sourceMeta:
        source === "leetcode"
          ? {
              ...state.manualDetails.sourceMeta,
              manualFallback: true,
            }
          : {
              entryMode: "manual",
              sourceTaskId: undefined,
            },
    }

    clearManualTopicRemovalState()
    dispatch({ type: "SUBMIT_MANUAL_DETAILS", draft })
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
                onClick={() => dispatch({ type: "SELECT_SOURCE", source: "custom" })}
                className={cn(
                  "h-16 rounded-2xl bg-white/[0.03]",
                  "px-4 text-left transition-all duration-200",
                  "hover:bg-white/[0.06]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
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
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={state.leetCodeUrl}
                onChange={(event) =>
                  dispatch({ type: "UPDATE_LEETCODE_URL", value: event.target.value })
                }
                onBlur={(event) =>
                  dispatch({
                    type: "SET_LEETCODE_URL_ERROR",
                    error: getLeetCodeUrlError(event.currentTarget.value),
                  })
                }
                placeholder="https://leetcode.com/problems/two-sum/"
                className={cn(
                  "w-full px-4 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                  state.leetCodeUrlError ? "ring-2 ring-destructive/60" : "focus:ring-primary/50",
                )}
              />
                <FieldErrorMessage message={state.leetCodeUrlError} />
                <FieldErrorMessage message={state.resolveError} />
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

      case "manual-details":
        return (
          <form onSubmit={handleSubmitManualDetails} noValidate className="flex flex-col gap-4">
            {state.resolveError && state.source === "leetcode" && (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
                {state.resolveError}
              </p>
            )}

            <div>
              <label className="text-sm font-medium text-foreground/90 block mb-1.5">Task title</label>
              <input
                type="text"
                value={state.manualDetails.name}
                onChange={(event) =>
                  dispatch({ type: "UPDATE_MANUAL_NAME", value: event.target.value })
                }
                onBlur={() =>
                  dispatch({
                    type: "SET_MANUAL_FIELD_ERROR",
                    field: "name",
                    error: getManualFieldError("name", state.manualDetails),
                  })
                }
                placeholder="Two Sum"
                className={cn(
                  "w-full px-4 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                  state.manualDetails.errors.name
                    ? "ring-2 ring-destructive/60"
                    : "focus:ring-primary/50",
                )}
              />
              <FieldErrorMessage message={state.manualDetails.errors.name} />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground/90 mb-1.5">Difficulty</p>
              <div className="manual-difficulty-glow-safe-inset">
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Task difficulty">
                  {DIFFICULTY_OPTIONS.map((difficulty) => {
                    const isSelected = state.manualDetails.difficulty === difficulty
                    const isDimmed = state.manualDetails.difficulty !== null && !isSelected
                    return (
                      <button
                        key={difficulty}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => dispatch({ type: "UPDATE_MANUAL_DIFFICULTY", value: difficulty })}
                        className={cn(
                          "manual-difficulty-option rounded-xl",
                          DIFFICULTY_HOVER_CLASS[difficulty],
                          isDimmed && "manual-difficulty-option--muted",
                          isSelected && DIFFICULTY_SELECTED_CLASS[difficulty],
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
                        )}
                      >
                        <TaskDifficultyPill
                          difficulty={difficulty}
                          className={cn(
                            "manual-difficulty-option__pill w-full",
                            isSelected && "manual-difficulty-option__pill--active",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
              <FieldErrorMessage message={state.manualDetails.errors.difficulty} />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground/90 block mb-1.5">Topics</label>
              <input
                type="text"
                value={state.manualDetails.topicQuery}
                onChange={(event) => {
                  dispatch({ type: "UPDATE_MANUAL_TOPIC_QUERY", value: event.target.value })
                  setActiveTopicSuggestionTopic(null)
                }}
                onBlur={() =>
                  dispatch({
                    type: "SET_MANUAL_FIELD_ERROR",
                    field: "topics",
                    error: getManualFieldError("topics", state.manualDetails),
                  })
                }
                onKeyDown={(event) => {
                  if (event.ctrlKey || event.metaKey || event.altKey) {
                    return
                  }

                  if (topicSuggestions.length === 0 && event.key !== "Enter") return

                  if (event.key === "ArrowDown") {
                    event.preventDefault()
                    const nextIndex =
                      activeTopicSuggestionIndex < topicSuggestions.length - 1
                        ? activeTopicSuggestionIndex + 1
                        : 0
                    setActiveTopicSuggestionTopic(topicSuggestions[nextIndex] ?? null)
                    return
                  }

                  if (event.key === "ArrowUp") {
                    event.preventDefault()
                    const previousIndex =
                      activeTopicSuggestionIndex > 0
                        ? activeTopicSuggestionIndex - 1
                        : topicSuggestions.length - 1
                    setActiveTopicSuggestionTopic(topicSuggestions[previousIndex] ?? null)
                    return
                  }

                  if (event.key === "Enter") {
                    event.preventDefault()
                    if (topicSuggestions.length === 0) {
                      // No catalog match: free-form entry — the backend accepts
                      // arbitrary topic names, so add the typed query as-is.
                      const query = state.manualDetails.topicQuery.trim()
                      if (query) {
                        handleManualTopicPick(query)
                      }
                      return
                    }
                    const selectedTopic = activeTopicSuggestion ?? topicSuggestions[0]
                    if (selectedTopic) {
                      handleManualTopicPick(selectedTopic)
                    }
                  }
                }}
                placeholder="Search topics"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={hasTopicQuery}
                aria-controls={TOPIC_SUGGESTIONS_LISTBOX_ID}
                aria-activedescendant={
                  activeTopicSuggestion ? getTopicSuggestionOptionId(activeTopicSuggestion) : undefined
                }
                className={cn(
                  "w-full px-4 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
                  state.manualDetails.errors.topics
                    ? "ring-2 ring-destructive/60"
                    : "focus:ring-primary/50",
                )}
              />

              <div
                className={cn(
                  "topic-suggestion-panel",
                  hasTopicQuery && "topic-suggestion-panel--open",
                )}
              >
                <div
                  id={TOPIC_SUGGESTIONS_LISTBOX_ID}
                  role="listbox"
                  aria-label="Topic suggestions"
                  className="topic-suggestion-list app-scrollbar"
                >
                  {topicSuggestions.length > 0 ? (
                    topicSuggestions.map((topic, index) => (
                      <button
                        key={topic}
                        id={getTopicSuggestionOptionId(topic)}
                        ref={(element) => setTopicSuggestionRef(topic, element)}
                        type="button"
                        role="option"
                        aria-selected={index === activeTopicSuggestionIndex}
                        onClick={() => handleManualTopicPick(topic)}
                        onMouseEnter={() => setActiveTopicSuggestionTopic(topic)}
                        className={cn(
                          "topic-suggestion-item",
                          index === activeTopicSuggestionIndex && "topic-suggestion-item--active",
                        )}
                      >
                        {topic}
                      </button>
                    ))
                  ) : (
                    <p className="topic-suggestion-empty" role="status" aria-live="polite">
                      {state.manualDetails.topicQuery.trim()
                        ? `No suggestions — press Enter to add "${state.manualDetails.topicQuery.trim()}"`
                        : "No topics found"}
                    </p>
                  )}
                </div>
              </div>

              <FieldErrorMessage message={state.manualDetails.errors.topics} />

              {state.manualDetails.topics.length > 0 && (
                <div ref={manualTopicListViewportRef} className="manual-topics-list-viewport mt-3">
                  <div ref={manualTopicListContentRef} className="flex flex-wrap gap-2" role="list" aria-label="Selected topics">
                    {state.manualDetails.topics.map((topic) => (
                      <span
                        key={topic}
                        ref={(element) => setManualTopicItemRef(topic, element)}
                        role="listitem"
                        className={cn(
                          "manual-topic-chip-item inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/[0.04] pr-1",
                          removingManualTopics.has(topic) && "manual-topic-chip-item--removing",
                        )}
                      >
                        <TaskTopicChip
                          topic={topic}
                          className="border-0 bg-transparent pr-1"
                        />
                        <button
                          type="button"
                          onClick={() => handleManualTopicRemove(topic)}
                          className="manual-topic-remove-button flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground"
                          disabled={removingManualTopics.has(topic)}
                          aria-label={`Remove topic ${topic}`}
                        >
                          <X className="manual-topic-remove-icon h-3.5 w-3.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleBackFromManualDetails}
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

      case "solved-check":
        if (!state.resolvedTaskDraft) return null
        return (
          <section className="flex flex-col gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="font-medium text-foreground">{state.resolvedTaskDraft.name}</p>
              {/^https?:\/\//.test(state.resolvedTaskDraft.url) ? (
                <p className="text-sm text-muted-foreground mt-1">{state.resolvedTaskDraft.url}</p>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">Custom source</p>
              )}

              <div className="mt-3">
                <TaskDifficultyPill
                  difficulty={state.resolvedTaskDraft.difficulty}
                  aria-label={`Difficulty: ${state.resolvedTaskDraft.difficulty}`}
                />
              </div>

              {state.resolvedTaskDraft.topics.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" role="list" aria-label="Task topics">
                  {state.resolvedTaskDraft.topics.map((topic) => (
                    <TaskTopicChip key={topic} topic={topic} role="listitem" />
                  ))}
                </div>
              )}
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
            ref={contentViewportRef}
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
