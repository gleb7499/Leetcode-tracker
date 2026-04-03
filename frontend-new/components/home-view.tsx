import { ProgressRing } from "@/components/progress-ring"
import { StartButton } from "@/components/start-button"
import { cn } from "@/lib/utils"

interface HomeViewProps {
  todayProgress: number
  todayTotal: number
  onStartSession: () => void
  isExiting: boolean
  layout?: "full" | "split"
}

function getMessage(progress: number, percentage: number) {
  if (progress === 0) {
    return { title: "Ready to practice?", subtitle: "Your brain is primed for learning" }
  }
  if (percentage < 50) {
    return { title: "Great momentum!", subtitle: "Keep the flow going" }
  }
  if (percentage < 100) {
    return { title: "Almost there!", subtitle: "You're crushing it today" }
  }
  return { title: "Day complete!", subtitle: "Your future self thanks you" }
}

export function HomeView({
  todayProgress,
  todayTotal,
  onStartSession,
  isExiting,
  layout = "full",
}: HomeViewProps) {
  const isSplitLayout = layout === "split"
  const percentage = todayTotal > 0 ? (todayProgress / todayTotal) * 100 : 0
  const { title, subtitle } = getMessage(todayProgress, percentage)

  return (
    <div
      className={cn(
        isSplitLayout
          ? "min-h-screen flex flex-col items-center justify-center px-6 py-6"
          : "min-h-screen flex flex-col items-center justify-center p-6",
        isExiting ? "animate-slide-out-up" : "animate-fade-up",
      )}
    >
      <div className="flex flex-col gap-8 w-full max-w-sm items-center">
        <div className="animate-float animate-delay-100">
          <ProgressRing progress={todayProgress} total={todayTotal} size={160} />
        </div>

        <div className="text-center space-y-2 animate-delay-200">
          <h1 className="text-2xl font-semibold text-foreground text-balance">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>

        <div className="animate-delay-300">
          <StartButton
            onClick={onStartSession}
            disabled={todayTotal - todayProgress <= 0}
          />
        </div>

        <p className="text-muted-foreground/60 text-sm text-center animate-delay-400">
          {todayProgress === 0
            ? "Your algorithms are waiting. Just press start."
            : `${todayTotal - todayProgress} cards left. You're doing great.`}
        </p>
      </div>
    </div>
  )
}
