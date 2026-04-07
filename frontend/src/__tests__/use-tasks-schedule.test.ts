import { describe, it, expect, beforeEach } from "vitest"
import { renderHook, act } from "@testing-library/react"
import { useTasks } from "@/src/shared/hooks/useTasks"

describe("useTasks scheduling", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("schedules unsolved task for today", () => {
    const { result } = renderHook(() => useTasks())
    let nextReviewMs = 0

    act(() => {
      const created = result.current.addTask({
        name: "Two Sum",
        url: "https://leetcode.com/problems/two-sum/",
        difficulty: "Easy",
        topics: "Array, Hash Table",
        notes: "",
        source: "leetcode",
        scheduleMode: "today",
      })
      nextReviewMs = new Date(created.nextReview).getTime()
    })

    const nowMs = Date.now()
    const oneHourMs = 60 * 60 * 1000
    expect(Math.abs(nextReviewMs - nowMs)).toBeLessThanOrEqual(oneHourMs)
  })

  it("schedules solved task for tomorrow", () => {
    const { result } = renderHook(() => useTasks())
    let createdAtMs = 0
    let nextReviewMs = 0

    act(() => {
      const created = result.current.addTask({
        name: "Binary Search",
        url: "https://leetcode.com/problems/binary-search/",
        difficulty: "Easy",
        topics: "Array, Binary Search",
        notes: "Solved with iterative approach",
        source: "leetcode",
        scheduleMode: "tomorrow",
      })
      createdAtMs = new Date(created.createdAt).getTime()
      nextReviewMs = new Date(created.nextReview).getTime()
    })

    const oneDayMs = 24 * 60 * 60 * 1000
    expect(nextReviewMs - createdAtMs).toBeGreaterThanOrEqual(oneDayMs - 60 * 1000)
  })

  it("keeps custom source payload for manual entry", () => {
    const { result } = renderHook(() => useTasks())
    let createdSource = ""
    let createdUrl = ""

    act(() => {
      const created = result.current.addTask({
        name: "Manual Graph Task",
        url: "custom://manual/manual-graph-task-abc123",
        difficulty: "Medium",
        topics: "Graph, BFS",
        notes: "Added manually",
        source: "custom",
        scheduleMode: "today",
      })
      createdSource = created.source
      createdUrl = created.url
    })

    expect(createdSource).toBe("custom")
    expect(createdUrl.startsWith("custom://manual/")).toBe(true)
  })
})
