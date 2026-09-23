import { Flame, Target, TrendingUp, Calendar } from "@/src/shared/resources/icons"
import { cn } from "@/lib/utils"
import { useStats } from "@/src/shared/hooks/useStats"

interface StatsPanelProps {
  className?: string
}

export function StatsPanel({ className }: StatsPanelProps) {
  const { stats, isLoading } = useStats(true)
  const maxWeek = Math.max(...stats.week.map((day) => day.count), 1)

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <h2 className="text-xl font-semibold text-foreground">Your Progress</h2>

      <div className="grid grid-cols-2 gap-4">
        <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-accent">
            <Flame className="w-5 h-5" />
            <span className="text-sm font-medium">Streak</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.streakDays}</p>
          <p className="text-xs text-muted-foreground">days in a row</p>
        </div>

        <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Target className="w-5 h-5" />
            <span className="text-sm font-medium">Mastered</span>
          </div>
          <p className="text-3xl font-bold text-foreground">{stats.mastered}</p>
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
          <span className="text-sm font-medium">Next 7 Days</span>
        </div>
        {isLoading || stats.week.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isLoading ? "Loading statistics…" : "No upcoming reviews scheduled."}
          </p>
        ) : (
          <div className="flex items-end justify-between gap-2 h-24">
            {stats.week.map((day) => (
              <div key={day.label + day.count} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-full rounded-lg bar-fill transition-all duration-500",
                    day.count > 0 ? "bg-gradient-to-t from-primary/60 to-primary" : "bg-secondary",
                  )}
                  style={{
                    "--bar-height": `${Math.max((day.count / maxWeek) * 100, 10)}%`,
                  } as React.CSSProperties}
                />
                <span className="text-xs text-muted-foreground">{day.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center mt-auto">
        {stats.streakDays >= 7
          ? "Amazing! Keep the momentum going."
          : "Every day of practice counts."}
      </p>
    </div>
  )
}
