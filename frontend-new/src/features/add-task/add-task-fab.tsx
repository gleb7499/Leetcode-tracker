import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

interface AddTaskFabProps {
  onClick: () => void
}

export function AddTaskFab({ onClick }: AddTaskFabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group fixed right-6 bottom-6 z-50",
        "h-11 w-11 hover:w-36",
        "rounded-full glass-profile",
        "transition-all duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        "flex items-center justify-center gap-2 px-3",
        "hover:scale-[1.02] active:scale-[0.98]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
      )}
      aria-label="Add task"
    >
      <Plus className="w-5 h-5 text-foreground shrink-0" />
      <span
        className={cn(
          "text-sm font-medium text-foreground whitespace-nowrap",
          "max-w-0 opacity-0 translate-x-1",
          "group-hover:max-w-20 group-hover:opacity-100 group-hover:translate-x-0",
          "transition-all duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
        )}
      >
        Add task
      </span>
    </button>
  )
}
