"use client"

import { useState, useEffect, useCallback } from "react"
import { ExternalLink, Check, Minus, X } from "lucide-react"
import { REVIEW_FEEDBACK_OPTIONS, type ReviewFeedback } from "@/lib/review-feedback"
import { cn } from "@/lib/utils"

type Difficulty = "Easy" | "Medium" | "Hard"

interface ReviewTask {
  id: string
  name: string
  url: string
  difficulty: Difficulty
  topics: string[]
  notes: string
}

const reviewTasks: ReviewTask[] = [
  {
    id: "add-two-numbers",
    name: "Add Two Numbers",
    url: "https://leetcode.com/problems/add-two-numbers/",
    difficulty: "Medium",
    topics: ["Linked List", "Math", "Recursion"],
    notes: "Add two numbers represented in reverse order using linked lists.",
  },
  {
    id: "binary-search",
    name: "Binary Search",
    url: "https://leetcode.com/problems/binary-search/",
    difficulty: "Easy",
    topics: ["Array", "Binary Search"],
    notes: "Find the target index in a sorted array in logarithmic time.",
  },
  {
    id: "lru-cache",
    name: "LRU Cache",
    url: "https://leetcode.com/problems/lru-cache/",
    difficulty: "Medium",
    topics: ["Hash Table", "Linked List", "Design"],
    notes: "Design an O(1) cache with get and put operations using LRU eviction.",
  },
  {
    id: "merge-k-sorted-lists",
    name: "Merge K Sorted Lists",
    url: "https://leetcode.com/problems/merge-k-sorted-lists/",
    difficulty: "Hard",
    topics: ["Linked List", "Divide and Conquer", "Heap"],
    notes: "Merge multiple sorted lists into one list with efficient complexity.",
  },
]

const difficultyStyles: Record<Difficulty, string> = {
  Easy: "text-primary border-primary/30 bg-primary/12",
  Medium: "text-accent border-accent/30 bg-accent/12",
  Hard: "text-destructive border-destructive/30 bg-destructive/12",
}

interface ReviewSessionProps {
  onReviewFeedback: (feedback: ReviewFeedback) => void
  onEnd: () => void
  currentProgress: number
  totalCards: number
}

const feedbackButtonStyles: Record<ReviewFeedback, string> = {
  remember: [
    "bg-primary text-primary-foreground",
    "shadow-[0_0_30px_-8px] shadow-primary/50",
    "hover:shadow-[0_0_40px_-8px] hover:shadow-primary/65",
  ].join(" "),
  partial: [
    "glass-subtle text-foreground/90",
    "hover:border-accent/35 hover:bg-accent/[0.1] hover:text-accent",
  ].join(" "),
  forgot: [
    "glass-subtle text-foreground/90",
    "hover:text-destructive hover:border-destructive/35 hover:bg-destructive/[0.1]",
  ].join(" "),
}

const REVIEW_LAYOUT_MAX_WIDTH = "max-w-[960px]"

export function ReviewSession({ onReviewFeedback, onEnd, currentProgress, totalCards }: ReviewSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isExiting, setIsExiting] = useState(false)
  const [isAdvancing, setIsAdvancing] = useState(false)
  const [cardAnimation, setCardAnimation] = useState<"enter" | "exit">("enter")

  const currentTask = reviewTasks[currentIndex % reviewTasks.length]
  const normalizedProgress = Math.min(currentProgress, totalCards)
  const dailyProgressPercent = totalCards > 0 ? (normalizedProgress / totalCards) * 100 : 0

  const advanceToNextTask = useCallback((feedback: ReviewFeedback) => {
    if (isAdvancing) {
      return
    }

    const nextProgress = Math.min(currentProgress + 1, totalCards)
    const willFinishDay = totalCards === 0 || nextProgress >= totalCards

    setIsAdvancing(true)
    setCardAnimation("exit")

    setTimeout(() => {
      onReviewFeedback(feedback)

      if (willFinishDay) {
        setIsExiting(true)
        setTimeout(onEnd, 400)
      } else {
        setCurrentIndex((prev) => prev + 1)
        setIsAdvancing(false)
        setCardAnimation("enter")
      }
    }, 320)
  }, [currentProgress, isAdvancing, onEnd, onReviewFeedback, totalCards])

  const handleExit = useCallback(() => {
    setIsExiting(true)
    setTimeout(onEnd, 400)
  }, [onEnd])

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

  const handleFeedbackClick = useCallback((feedback: ReviewFeedback) => {
    advanceToNextTask(feedback)
  }, [advanceToNextTask])

  if (!currentTask) {
    return null
  }

  return (
    <div 
      className={cn(
        "min-h-screen flex flex-col",
        isExiting ? "animate-slide-out-up" : "animate-slide-in-up"
      )}
    >
      {/* Minimal header */}
      <header className="p-6">
        <div className={cn("mx-auto flex w-full items-center gap-4", REVIEW_LAYOUT_MAX_WIDTH)}>
          <button 
            onClick={handleExit}
            className="p-3 rounded-full glass text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Progress indicator */}
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-1.5 flex-1 bg-foreground/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700 ease-out rounded-full"
                style={{ width: `${dailyProgressPercent}%` }}
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
            cardAnimation === "exit" && "animate-slide-out-up"
          )}
        >
          <article
            className={cn(
              "relative glass rounded-3xl p-8 min-h-[320px]",
              "transition-all duration-500 ease-out",
              "border border-white/10",
              "shadow-[0_18px_50px_-32px_rgba(0,0,0,0.85)]"
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

              <span
                className={cn(
                  "shrink-0 rounded-xl px-4 py-2 text-sm font-semibold border",
                  difficultyStyles[currentTask.difficulty]
                )}
                aria-label={`Difficulty: ${currentTask.difficulty}`}
              >
                {currentTask.difficulty}
              </span>
            </header>

            {currentTask.topics.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2" role="list" aria-label="Task topics">
                {currentTask.topics.map((topic) => (
                  <span
                    key={topic}
                    role="listitem"
                    className="rounded-lg px-3 py-1.5 text-sm text-foreground/90 border border-white/15 bg-white/[0.04]"
                  >
                    {topic}
                  </span>
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
                  onClick={() => handleFeedbackClick(option.value)}
                  disabled={isAdvancing}
                  className={cn(
                    "flex min-h-[74px] items-center justify-center gap-1.5 py-3.5 px-3 rounded-2xl",
                    "font-semibold text-center",
                    "hover:scale-[1.01] active:scale-[0.98]",
                    "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100",
                    "transition-all duration-300",
                    feedbackButtonStyles[option.value]
                  )}
                  aria-label={`${option.label} for task ${currentTask.name}`}
                >
                  {option.value === "remember" && <Check className="w-4 h-4 shrink-0" />}
                  {option.value === "partial" && <Minus className="w-4 h-4 shrink-0" />}
                  {option.value === "forgot" && <X className="w-4 h-4 shrink-0" />}
                  <span className="max-w-full text-center leading-tight text-[clamp(0.82rem,1.7vw,0.95rem)] whitespace-normal break-words">
                    {option.label}
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
