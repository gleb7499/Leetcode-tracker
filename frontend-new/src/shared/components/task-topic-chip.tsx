import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface TaskTopicChipProps extends HTMLAttributes<HTMLSpanElement> {
  topic: string
}

export function TaskTopicChip({ topic, className, ...props }: TaskTopicChipProps) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center rounded-lg border border-white/15 bg-white/[0.04] px-3 py-1.5 text-sm text-foreground/90",
        className,
      )}
    >
      {topic}
    </span>
  )
}
