import { useState, useEffect, useCallback, useRef } from "react"
import { ExternalLink, Check, Minus, X } from "lucide-react"
import { REVIEW_FEEDBACK_OPTIONS, type ReviewFeedback } from "@/lib/review-feedback"
import type { Task } from "@/src/shared/types"
import { cn } from "@/lib/utils"
import { TaskDifficultyPill } from "@/src/shared/components/task-difficulty-pill"
import { TaskTopicChip } from "@/src/shared/components/task-topic-chip"

const CARD_EXIT_MS = 320
const SESSION_END_MS = 400

const feedbackButtonSurfaceStyles = [
  "glass-subtle",
  "group-hover:border-primary/35",
  "group-hover:bg-primary/[0.1]",
].join(" ")

const feedbackButtonContentStyles = "text-foreground/90 group-hover:text-primary"

const REVIEW_LAYOUT_MAX_WIDTH = "max-w-[960px]"

interface ReviewSessionProps {
  tasks: Task[]
  onReviewFeedback: (taskId: string, feedback: ReviewFeedback) => void
  onEnd: () => void
  currentProgress: number
  totalCards: number
}

export function ReviewSession({
  tasks,
  onReviewFeedback,
  onEnd,
  currentProgress,
  totalCards,
}: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [cardAnimation, setCardAnimation] = useState<"enter" | "exit">("enter")

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const currentTask = tasks[currentIndex]
  const normalizedProgress = Math.min(currentProgress, totalCards)
  const dailyProgressPercent = totalCards > 0 ? (normalizedProgress / totalCards) * 100 : 0

  const triggerEnd = useCallback(() => {
    setIsExiting(true)
    exitTimerRef.current = setTimeout(onEnd, SESSION_END_MS)
  }, [onEnd])

  const advanceToNextTask = useCallback(
    (feedback: ReviewFeedback) => {
      if (isAdvancing || !currentTask) return

      const isLastTask = currentIndex + 1 >= tasks.length

      setIsAdvancing(true)
      setCardAnimation("exit")

      advanceTimerRef.current = setTimeout(() => {
        onReviewFeedback(currentTask.id, feedback)

        if (isLastTask) {
          triggerEnd()
        } else {
          setCurrentIndex((prev) => prev + 1)
          setIsAdvancing(false)
          setCardAnimation("enter")
        }
      }, CARD_EXIT_MS)
    },
    [currentIndex, currentTask, isAdvancing, onReviewFeedback, tasks.length, triggerEnd],
  )

  const handleExit = useCallback(() => {
    triggerEnd()
  }, [triggerEnd])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Digit1") {
        e.preventDefault()
        advanceToNextTask("remember")
      } else if (e.code === "Digit2") {
        e.preventDefault()
        advanceToNextTask("partial")
      } else if (e.code === "Digit3") {
        e.preventDefault()
        advanceToNextTask("forgot")
      } else if (e.code === "Escape") {
        e.preventDefault()
        handleExit()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [advanceToNextTask, handleExit])

  useEffect(() => {
    return () => {
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current)
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current)
    }
  }, [])

  if (!currentTask) return null

  return (
    <div
      className={cn(
        "min-h-screen flex flex-col",
        isExiting ? "animate-slide-out-up" : "animate-slide-in-up",
      )}
    >
      {/* Minimal header */}
      <header className="p-6">
        <div className={cn("mx-auto flex w-full items-center gap-4", REVIEW_LAYOUT_MAX_WIDTH)}>
          <button
            onClick={handleExit}
            className="p-3 rounded-full glass text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Exit review session"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress indicator */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-1.5 flex-1 bg-foreground/10 rounded-full overflow-hidden">
              <div
                className="progress-fill h-full bg-primary transition-all duration-700 ease-out rounded-full"
                style={{ "--progress": `${dailyProgressPercent}%` } as React.CSSProperties}
              />
            </div>
            <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
              {normalizedProgress}/{totalCards}
            </span>
          </div>
        </div>
      </header>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 pb-0">
        <div
          className={cn(
            "w-full transition-all duration-500",
            REVIEW_LAYOUT_MAX_WIDTH,
            cardAnimation === "enter" && "animate-slide-in-up",
            cardAnimation === "exit" && "animate-slide-out-up",
          )}
        >
          <article
            className={cn(
              "relative glass rounded-3xl p-8 min-h-[320px]",
              "transition-all duration-500 ease-out",
              "border border-white/10",
              "shadow-[0_18px_50px_-32px_rgba(0,0,0,0.85)]",
            )}
            role="article"
            aria-label={`Task card: ${currentTask.name}`}
          >
            <header className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl md:text-3xl font-semibold text-foreground leading-snug text-balance">
                  <a
                    href={currentTask.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-md transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                    aria-label={`Open ${currentTask.name} on LeetCode`}
                  >
                    {currentTask.name}
                    <ExternalLink className="w-4 h-4 md:w-5 md:h-5 opacity-70" />
                  </a>
                </h2>
              </div>

              <TaskDifficultyPill
                difficulty={currentTask.difficulty}
                className="shrink-0"
                aria-label={`Difficulty: ${currentTask.difficulty}`}
              />
            </header>

            {currentTask.topics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2" role="list" aria-label="Task topics">
                {currentTask.topics.map((topic) => (
                  <TaskTopicChip
                    key={topic}
                    topic={topic}
                    role="listitem"
                  />
                ))}
              </div>
            )}

            {currentTask.notes && (
              <p className="mt-6 text-base md:text-lg text-foreground/90 leading-relaxed">
                {currentTask.notes}
              </p>
            )}

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {REVIEW_FEEDBACK_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => advanceToNextTask(option.value)}
                  disabled={isAdvancing}
                  className={cn(
                    "group relative min-h-[74px] rounded-2xl overflow-visible py-3.5 px-3",
                    "font-semibold text-center",
                    "disabled:opacity-60 disabled:cursor-not-allowed",
                    "transition-opacity duration-300",
                  )}
                  aria-label={`${option.label} for task ${currentTask.name}`}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute inset-0 rounded-2xl transition-all duration-300",
                      !isAdvancing && "group-hover:scale-[1.01] group-active:scale-[0.98]",
                      feedbackButtonSurfaceStyles,
                    )}
                  />

                  <span
                    className={cn(
                      "relative z-10 inline-flex items-center justify-center gap-1.5 subpixel-antialiased transition-colors duration-300",
                      feedbackButtonContentStyles,
                    )}
                  >
                    {option.value === "remember" && <Check className="w-4 h-4 shrink-0" />}
                    {option.value === "partial" && <Minus className="w-4 h-4 shrink-0" />}
                    {option.value === "forgot" && <X className="w-4 h-4 shrink-0" />}
                    <span className="max-w-full text-center leading-tight text-[clamp(0.82rem,1.7vw,0.95rem)] whitespace-normal break-words">
                      {option.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </article>
        </div>
      </div>

      <div className="pb-10" />
    </div>
  )
}
