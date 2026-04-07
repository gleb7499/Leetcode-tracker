import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { renderHook, act } from "@testing-library/react"

// Freeze a reference date so day-key logic is deterministic.
const FIXED_DATE = new Date("2026-04-02T10:00:00.000Z")

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
  localStorage.clear()
})

afterEach(() => {
  vi.useRealTimers()
})

// Dynamic import so the hook picks up the frozen date.
async function getHook() {
  const mod = await import("@/hooks/use-daily-progress")
  return mod.useDailyProgress
}

describe("useDailyProgress", () => {
  it("initialises with zero completed and the supplied target", async () => {
    const useDailyProgress = await getHook()
    const { result } = renderHook(() => useDailyProgress(10))

    expect(result.current.todayProgress).toBe(0)
    expect(result.current.todayTotal).toBe(10)
    expect(result.current.todayRemaining).toBe(10)
    expect(result.current.isTodayComplete).toBe(false)
  })

  it("increments completed up to the target", async () => {
    const useDailyProgress = await getHook()
    const { result } = renderHook(() => useDailyProgress(3))

    act(() => result.current.incrementCompleted())
    expect(result.current.todayProgress).toBe(1)
    expect(result.current.todayRemaining).toBe(2)

    act(() => result.current.incrementCompleted())
    act(() => result.current.incrementCompleted())
    expect(result.current.todayProgress).toBe(3)
    expect(result.current.todayRemaining).toBe(0)
    expect(result.current.isTodayComplete).toBe(true)
  })

  it("does not exceed the daily target", async () => {
    const useDailyProgress = await getHook()
    const { result } = renderHook(() => useDailyProgress(2))

    act(() => result.current.incrementCompleted())
    act(() => result.current.incrementCompleted())
    act(() => result.current.incrementCompleted()) // beyond target
    expect(result.current.todayProgress).toBe(2)
  })

  it("resets completed to zero via resetToday", async () => {
    const useDailyProgress = await getHook()
    const { result } = renderHook(() => useDailyProgress(5))

    act(() => result.current.incrementCompleted())
    act(() => result.current.incrementCompleted())
    expect(result.current.todayProgress).toBe(2)

    act(() => result.current.resetToday())
    expect(result.current.todayProgress).toBe(0)
    expect(result.current.todayTotal).toBe(5)
  })

  it("persists progress to localStorage", async () => {
    const useDailyProgress = await getHook()
    const { result } = renderHook(() => useDailyProgress(5))

    act(() => result.current.incrementCompleted())

    const raw = localStorage.getItem("leetcode-tracker.daily-progress.v1")
    expect(raw).not.toBeNull()
    const stored = JSON.parse(raw as string) as { completed: number; target: number }
    expect(stored.completed).toBe(1)
    expect(stored.target).toBe(5)
  })

  it("resets to a new day when the day changes", async () => {
    const useDailyProgress = await getHook()
    const { result } = renderHook(() => useDailyProgress(5))

    act(() => result.current.incrementCompleted())
    expect(result.current.todayProgress).toBe(1)

    // Advance clock past midnight.
    act(() => {
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1000)
    })

    // After the midnight timer fires the state should reset.
    expect(result.current.todayProgress).toBe(0)
  })
})
