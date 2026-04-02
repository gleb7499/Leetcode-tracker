"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

const STORAGE_KEY = "leetcode-tracker.daily-progress.v1"
const DEFAULT_DAILY_TARGET = 12

interface DailyProgressState {
  dayKey: string
  completed: number
  target: number
}

const toDayKey = (date: Date = new Date()): string => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}

const createDefaultState = (target: number = DEFAULT_DAILY_TARGET): DailyProgressState => ({
  dayKey: toDayKey(),
  completed: 0,
  target: Math.max(1, Math.floor(target)),
})

const clampState = (state: DailyProgressState): DailyProgressState => {
  const target = Math.max(1, Math.floor(state.target))
  const completed = Math.min(Math.max(0, Math.floor(state.completed)), target)

  return {
    dayKey: state.dayKey,
    completed,
    target,
  }
}

const normalizeForToday = (state: DailyProgressState, fallbackTarget: number): DailyProgressState => {
  const todayKey = toDayKey()

  if (state.dayKey === todayKey) {
    return clampState(state)
  }

  return {
    dayKey: todayKey,
    completed: 0,
    target: Math.max(1, Math.floor(state.target || fallbackTarget)),
  }
}

const parseStoredState = (raw: string | null, fallbackTarget: number): DailyProgressState => {
  if (!raw) {
    return createDefaultState(fallbackTarget)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<DailyProgressState>

    if (
      typeof parsed?.dayKey !== "string" ||
      typeof parsed?.completed !== "number" ||
      typeof parsed?.target !== "number"
    ) {
      return createDefaultState(fallbackTarget)
    }

    return normalizeForToday(
      {
        dayKey: parsed.dayKey,
        completed: parsed.completed,
        target: parsed.target,
      },
      fallbackTarget,
    )
  } catch {
    return createDefaultState(fallbackTarget)
  }
}

const msUntilNextDay = (now: Date = new Date()): number => {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return Math.max(1, next.getTime() - now.getTime())
}

export function useDailyProgress(defaultTarget: number = DEFAULT_DAILY_TARGET) {
  const [state, setState] = useState<DailyProgressState>(() => createDefaultState(defaultTarget))

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const stored = window.localStorage.getItem(STORAGE_KEY)
    setState(parseStoredState(stored, defaultTarget))
  }, [defaultTarget])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    let timerId: ReturnType<typeof setTimeout>

    const scheduleReset = () => {
      timerId = setTimeout(() => {
        setState((prev) => {
          const normalized = normalizeForToday(prev, defaultTarget)
          return {
            ...normalized,
            completed: 0,
          }
        })
        scheduleReset()
      }, msUntilNextDay())
    }

    scheduleReset()

    return () => {
      clearTimeout(timerId)
    }
  }, [defaultTarget])

  const incrementCompleted = useCallback(() => {
    setState((prev) => {
      const normalized = normalizeForToday(prev, defaultTarget)

      return {
        ...normalized,
        completed: Math.min(normalized.completed + 1, normalized.target),
      }
    })
  }, [defaultTarget])

  const removeTaskFromToday = useCallback(() => {
    setState((prev) => {
      const normalized = normalizeForToday(prev, defaultTarget)
      const nextTarget = Math.max(normalized.completed, normalized.target - 1)

      return {
        ...normalized,
        target: nextTarget,
      }
    })
  }, [defaultTarget])

  const resetToday = useCallback(() => {
    setState((prev) => {
      const normalized = normalizeForToday(prev, defaultTarget)
      return {
        ...normalized,
        completed: 0,
      }
    })
  }, [defaultTarget])

  const derived = useMemo(() => {
    const todayProgress = state.completed
    const todayTotal = state.target
    const todayRemaining = Math.max(todayTotal - todayProgress, 0)

    return {
      todayProgress,
      todayTotal,
      todayRemaining,
      isTodayComplete: todayRemaining === 0,
    }
  }, [state.completed, state.target])

  return {
    ...derived,
    incrementCompleted,
    removeTaskFromToday,
    resetToday,
  }
}
