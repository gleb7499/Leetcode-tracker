import { useState, useEffect } from "react"
import { statsApi, type RecallStats, type StatsSummary, type DayWorkload } from "../api/stats"

export interface WeekDay {
  label: string
  count: number
}

export interface StatsData {
  streakDays: number
  mastered: number
  accuracyRate: number
  totalReviews: number
  week: WeekDay[]
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function toStatsData(summary: StatsSummary, recall: RecallStats, workload: DayWorkload[]): StatsData {
  const accuracyRate =
    recall.total > 0 ? Math.round((recall.remember / recall.total) * 100) : 0

  return {
    streakDays: summary.streakDays,
    // The backend tracks recall outcomes, not a distinct "mastered" set;
    // the remember-outcome count is the closest available metric.
    mastered: recall.remember,
    accuracyRate,
    totalReviews: summary.totalReviews,
    week: workload.map((day) => {
      const date = new Date(`${day.date}T00:00:00`)
      return { label: WEEKDAY_LABELS[date.getDay()] ?? day.date, count: day.count }
    }),
  }
}

const EMPTY_STATS: StatsData = {
  streakDays: 0,
  mastered: 0,
  accuracyRate: 0,
  totalReviews: 0,
  week: [],
}

export function useStats(enabled: boolean) {
  const [stats, setStats] = useState<StatsData>(EMPTY_STATS)
  const [isLoading, setIsLoading] = useState(enabled)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    Promise.all([statsApi.summary(), statsApi.recall(), statsApi.workload(7)])
      .then(([summary, recall, workload]) => {
        if (!cancelled) setStats(toStatsData(summary, recall, workload))
      })
      .catch(() => {
        if (!cancelled) setStats(EMPTY_STATS)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [enabled])

  return { stats, isLoading }
}
