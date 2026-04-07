
import { Play } from "@/src/shared/resources/icons"
import { cn } from "@/lib/utils"

interface StartButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function StartButton({ onClick, disabled = false, className }: StartButtonProps) {
  const shouldAnimateSurface = !disabled

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative inline-flex items-center gap-3 px-8 py-4 rounded-2xl",
        "text-primary-foreground font-medium text-lg",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0",
          shouldAnimateSurface && "animate-start-review-breathe animate-delay-100",
        )}
      >
        <span
          className={cn(
            "absolute inset-0 rounded-2xl",
            shouldAnimateSurface && "animate-start-review-glow animate-delay-100",
          )}
        />

        <span
          className={cn(
            "absolute inset-0 rounded-2xl bg-primary",
            "shadow-[0_0_40px_-8px] shadow-primary/50",
            "transition-all duration-500 ease-out",
            shouldAnimateSurface && "group-hover:scale-[1.02] group-hover:shadow-[0_0_60px_-8px] group-hover:shadow-primary/60",
            shouldAnimateSurface && "group-active:scale-[0.98]",
          )}
        />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-white/10 to-primary/0",
          shouldAnimateSurface && "animate-start-review-sheen animate-delay-100",
        )}
      />
      
      <span className="relative z-10 flex items-center gap-3 subpixel-antialiased">
        <Play className="w-5 h-5 fill-current" />
        <span>Start Review</span>
      </span>
    </button>
  )
}
