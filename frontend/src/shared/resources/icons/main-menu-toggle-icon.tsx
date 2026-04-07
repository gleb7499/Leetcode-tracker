import { cn } from "@/lib/utils"

interface MainMenuToggleIconProps {
  isOpen: boolean
  transitionDurationMs: number
}

const MENU_BAR_THICKNESS_PX = 1.5

export function MainMenuToggleIcon({ isOpen, transitionDurationMs }: MainMenuToggleIconProps) {
  return (
    <div className={cn("relative", isOpen ? "w-7 h-7" : "w-6 h-6")} aria-hidden="true">
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-full bg-foreground",
          "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "top-1/2 -translate-y-1/2 rotate-45 w-6" : "top-[4.3px] w-5",
        )}
        style={{ transitionDuration: `${transitionDurationMs}ms`, height: `${MENU_BAR_THICKNESS_PX}px` }}
      />
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-full bg-foreground",
          "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen
            ? "top-1/2 -translate-y-1/2 w-0 opacity-0"
            : "top-[11.3px] -translate-y-0 w-5 opacity-100",
        )}
        style={{ transitionDuration: `${transitionDurationMs}ms`, height: `${MENU_BAR_THICKNESS_PX}px` }}
      />
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 rounded-full bg-foreground",
          "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          isOpen ? "top-1/2 -translate-y-1/2 -rotate-45 w-6" : "top-[18.3px] w-5",
        )}
        style={{ transitionDuration: `${transitionDurationMs}ms`, height: `${MENU_BAR_THICKNESS_PX}px` }}
      />
    </div>
  )
}