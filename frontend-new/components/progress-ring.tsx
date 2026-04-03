import { cn } from "@/lib/utils"

interface ProgressRingProps {
  progress: number
  total: number
  size?: number
  className?: string
}

export function ProgressRing({ progress, total, size = 160, className }: ProgressRingProps) {
  const percentage = total > 0 ? (progress / total) * 100 : 0
  const strokeWidth = 4
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  const wrapperSize = size + 32

  return (
    <div
      className={cn("relative glass rounded-full p-4 progress-ring-wrapper", className)}
      style={{ "--ring-size": `${wrapperSize}px` } as React.CSSProperties}
    >
      {/* Inner glow */}
      <div className="absolute inset-4 rounded-full bg-primary/5 blur-xl animate-pulse-soft" />

      <svg
        width={size}
        height={size}
        className="transform -rotate-90 relative z-10"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-foreground/10"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="text-primary transition-all duration-1000 ease-out"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <span className="text-5xl font-light text-foreground tracking-tight">{progress}</span>
        <span className="text-sm text-muted-foreground mt-1">of {total} today</span>
      </div>
    </div>
  )
}
