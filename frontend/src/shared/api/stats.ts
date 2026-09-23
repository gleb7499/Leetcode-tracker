import { apiFetch } from "./client"

export interface StatsSummary {
  totalTasks: number
  activeTasks: number
  reviewedTasks: number
  totalReviews: number
  streakDays: number
}

export interface RecallStats {
  forgot: number
  partial: number
  remember: number
  total: number
}

export interface DayWorkload {
  date: string
  count: number
}

export const statsApi = {
  summary(): Promise<StatsSummary> {
    return apiFetch<StatsSummary>("/v1/me/stats")
  },

  recall(): Promise<RecallStats> {
    return apiFetch<RecallStats>("/v1/me/stats/recall")
  },

  workload(days = 7): Promise<DayWorkload[]> {
    return apiFetch<DayWorkload[]>(`/v1/me/stats/workload?days=${days}`)
  },
}
