import { Flame, Target, TrendingUp, Calendar } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Task } from "@/src/shared/types"

interface StatsPanelProps {
  className?: string
  tasks?: Task[]
}

function computeStats(tasks: Task[]) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Mastered = tasks with at least one review with status "remember"
  const totalMastered = tasks.filter((t) =>
    t.reviews.some((r) => r.status === "remember"),
  ).length

  // Total reviews
  const allReviews = tasks.flatMap((t) => t.reviews)
  const totalReviews = allReviews.length
  const rememberCount = allReviews.filter((r) => r.status === "remember").length
  const accuracyRate = totalReviews > 0 ? Math.round((rememberCount / totalReviews) * 100) : 0

  // Weekly activity: count reviews per day for last 7 days
  const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const thisWeek = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - (6 - i))
    const dayKey = d.toISOString().slice(0, 10)
    return allReviews.filter((r) => r.date.slice(0, 10) === dayKey).length
  })

  // Streak: count consecutive days with at least one review ending today
  let currentStreak = 0
  const checkDay = new Date(today)
  for (let i = 0; i < 365; i++) {
    const dayKey = checkDay.toISOString().slice(0, 10)
    const hasReview = allReviews.some((r) => r.date.slice(0, 10) === dayKey)
    if (hasReview) {
      currentStreak++
      checkDay.setDate(checkDay.getDate() - 1)
    } else {
      break
    }
  }

  return { currentStreak, totalMastered, accuracyRate, thisWeek, weekDays }
}

export function StatsPanel({ className, tasks = [] }: StatsPanelProps) {
  const stats = computeStats(tasks)
  const maxWeek = Math.max(...stats.thisWeek, 1)

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <h2 className="text-xl font-semibold text-foreground">Your Progress</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-accent">
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">Streak</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.currentStreak}</p>
          <p className="text-xs text-muted-foreground">days in a row</p>
        </div>

        <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-5 h-5" />
            <span className="text-sm font-medium">Mastered</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.totalMastered}</p>
          <p className="text-xs text-muted-foreground">algorithms</p>
        </div>
      </div>

      <div className="glass-subtle rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-chart-3">
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium">Accuracy Rate</span>
          </div>
          <span className="text-2xl font-bold text-foreground">{stats.accuracyRate}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="progress-fill h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-1000"
            style={{ "--progress": `${stats.accuracyRate}%` } as React.CSSProperties}
          />
        </div>
      </div>

      <div className="glass-subtle rounded-2xl p-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-4">
          <Calendar className="w-5 h-5" />
          <span className="text-sm font-medium">This Week</span>
        </div>
        <div className="flex items-end justify-between gap-2 h-24">
          {stats.thisWeek.map((count, i) => (
            <div key={stats.weekDays[i]} className="flex-1 flex flex-col items-center gap-2">
              <div
                className={cn(
                  "w-full rounded-lg bar-fill transition-all duration-500",
                  count > 0 ? "bg-gradient-to-t from-primary/60 to-primary" : "bg-secondary",
                )}
                style={{
                  "--bar-height": `${Math.max((count / maxWeek) * 100, 10)}%`,
                  "--bar-delay": `${i * 50}ms`,
                } as React.CSSProperties}
              />
              <span className="text-xs text-muted-foreground">{stats.weekDays[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground text-center mt-auto">
        {stats.currentStreak >= 7
          ? "Amazing! Keep the momentum going."
          : "Every day of practice counts."}
      </p>
    </div>
  )
}
