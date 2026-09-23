import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, act, waitFor } from "@testing-library/react"
import { useTasks } from "@/src/shared/hooks/useTasks"
import { tasksApi, type TaskDto } from "@/src/shared/api/tasks"

vi.mock("@/src/shared/api/tasks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/src/shared/api/tasks")>()
  return {
    tasksApi: {
      list: vi.fn(),
      today: vi.fn(),
      create: vi.fn(),
      remove: vi.fn(),
      review: vi.fn(),
    },
    mapTaskDto: actual.mapTaskDto,
  }
})

const mockedTasksApi = vi.mocked(tasksApi)

function makeTaskDto(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: 1,
    name: "Two Sum",
    url: "https://leetcode.com/problems/two-sum/",
    difficulty: "EASY",
    topics: ["Array", "Hash Table"],
    notes: "",
    source: "leetcode_url",
    sourceMeta: "https://leetcode.com/problems/two-sum/",
    scheduleMode: "spaced_repetition",
    createdAt: new Date().toISOString(),
    nextReview: new Date().toISOString().slice(0, 10),
    reviews: [],
    ...overrides,
  }
}

describe("useTasks against the API", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mockedTasksApi.list.mockResolvedValue([])
    mockedTasksApi.today.mockResolvedValue([])
  })

  it("loads the library and today's review queue from the API", async () => {
    mockedTasksApi.list.mockResolvedValue([makeTaskDto()])
    mockedTasksApi.today.mockResolvedValue([makeTaskDto()])

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(mockedTasksApi.list).toHaveBeenCalledTimes(1)
    expect(mockedTasksApi.today).toHaveBeenCalledTimes(1)
    expect(result.current.tasks).toHaveLength(1)
    expect(result.current.getTasksForToday()).toHaveLength(1)
    // Backend DTOs are mapped to frontend task shape.
    expect(result.current.tasks[0].difficulty).toBe("Easy")
    expect(result.current.tasks[0].source).toBe("leetcode")
    expect(result.current.tasks[0].id).toBe("1")
  })

  it("sends new tasks as spaced repetition and appends the returned task", async () => {
    mockedTasksApi.create.mockResolvedValue(makeTaskDto({ id: 2, name: "Binary Search" }))

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    let created: { id: string; name: string; nextReview: string } = {
      id: "",
      name: "",
      nextReview: "",
    }
    await act(async () => {
      created = await result.current.addTask({
        name: "Binary Search",
        url: "https://leetcode.com/problems/binary-search/",
        difficulty: "Easy",
        topics: "Array, Binary Search",
        notes: "",
        scheduleMode: "today",
      })
    })

    expect(mockedTasksApi.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Binary Search",
        scheduleMode: "spaced_repetition",
        topics: ["Array", "Binary Search"],
      }),
    )
    expect(created.id).toBe("2")
    expect(result.current.tasks.map((task) => task.id)).toContain("2")
    expect(result.current.getTasksForToday().map((task) => task.id)).toContain("2")
  })

  it("maps a duplicate add to the existing task instead of duplicating it", async () => {
    mockedTasksApi.create.mockResolvedValue(makeTaskDto({ id: 1 }))

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.addTask({
        name: "Two Sum",
        url: "https://leetcode.com/problems/two-sum/",
        difficulty: "Easy",
        topics: "Array",
        notes: "",
        scheduleMode: "today",
      })
    })

    expect(result.current.tasks.filter((task) => task.id === "1")).toHaveLength(1)
  })

  it("removes a task from the library and today's queue after delete", async () => {
    mockedTasksApi.list.mockResolvedValue([makeTaskDto()])
    mockedTasksApi.today.mockResolvedValue([makeTaskDto()])
    mockedTasksApi.remove.mockResolvedValue(undefined)

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.deleteTask("1")
    })

    expect(mockedTasksApi.remove).toHaveBeenCalledWith("1")
    expect(result.current.tasks).toHaveLength(0)
    expect(result.current.getTasksForToday()).toHaveLength(0)
  })

  it("records a review through the API and resyncs the queue", async () => {
    mockedTasksApi.list.mockResolvedValue([makeTaskDto()])
    mockedTasksApi.today
      .mockResolvedValueOnce([makeTaskDto()])
      .mockResolvedValue([]) // after the review the task leaves today's queue
    mockedTasksApi.review.mockResolvedValue(
      makeTaskDto({ reviews: [{ date: "2026-09-23", status: "remember" }] }),
    )

    const { result } = renderHook(() => useTasks())
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.recordReview("1", "remember")
    })

    expect(mockedTasksApi.review).toHaveBeenCalledWith("1", "remember")
    expect(result.current.tasks[0].reviews).toHaveLength(1)
    await waitFor(() => {
      expect(result.current.getTasksForToday()).toHaveLength(0)
    })
  })
})
