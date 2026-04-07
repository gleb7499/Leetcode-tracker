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
        "fixed right-6 bottom-6 z-50",
        "h-11 w-11 rounded-full px-3",
        "flex items-center justify-center",
        "glass-profile add-task-fab",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55",
      )}
      aria-label="Add task"
    >
      <Plus className="add-task-fab__icon w-5 h-5 text-foreground shrink-0" />
      <span
        className={cn(
          "add-task-fab__label text-sm font-medium text-foreground whitespace-nowrap",
        )}
      >
        Add task
      </span>
    </button>
  )
}
