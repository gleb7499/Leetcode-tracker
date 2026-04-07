import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"
import type { Difficulty } from "@/src/shared/types"

const difficultyClasses: Record<Difficulty, string> = {
  Easy: "text-primary bg-primary/12",
  Medium: "text-accent bg-accent/12",
  Hard: "text-destructive bg-destructive/12",
}

interface TaskDifficultyPillProps extends HTMLAttributes<HTMLSpanElement> {
  difficulty: Difficulty
}

export function TaskDifficultyPill({ difficulty, className, ...props }: TaskDifficultyPillProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold",
        difficultyClasses[difficulty],
        className,
      )}
    >
      {difficulty}
    </span>
  )
}
