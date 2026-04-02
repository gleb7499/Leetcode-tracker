"use client"

import { Play } from "lucide-react"
import { cn } from "@/lib/utils"

interface StartButtonProps {
  onClick: () => void
  disabled?: boolean
  className?: string
}

export function StartButton({ onClick, disabled = false, className }: StartButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative flex items-center gap-3 px-8 py-4 rounded-2xl",
        "bg-primary text-primary-foreground font-medium text-lg",
        "shadow-[0_0_40px_-8px] shadow-primary/50",
        "hover:shadow-[0_0_60px_-8px] hover:shadow-primary/60",
        "hover:scale-[1.02] active:scale-[0.98]",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-[0_0_40px_-8px]",
        "transition-all duration-500 ease-out",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className
      )}
    >
      <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 animate-pulse-soft" />
      
      <span className="relative flex items-center gap-3">
        <Play className="w-5 h-5 fill-current" />
        <span>Start Review</span>
      </span>
    </button>
  )
}
