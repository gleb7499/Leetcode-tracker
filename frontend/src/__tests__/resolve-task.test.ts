import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { resolveTaskDraft } from "@/src/shared/tasks/resolve-task"

describe("resolveTaskDraft debug modes", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.LT_DEBUG = { leetcodeResolveMode: "auto" }
  })

  afterEach(() => {
    vi.useRealTimers()
    delete window.LT_DEBUG
    delete window.__LT_DEBUG__
  })

  it("routes to manual fallback when forced failure is enabled", async () => {
    window.LT_DEBUG = { leetcodeResolveMode: "failure" }

    const promise = resolveTaskDraft({
      source: "leetcode",
      rawInput: "https://leetcode.com/problems/two-sum/",
    })

    await vi.advanceTimersByTimeAsync(900)
    const resolved = await promise

    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.reason).toBe("not_found")
      expect(resolved.fallbackDraft?.name).toBe("Two Sum")
    }
  })

  it("keeps success flow when forced success is enabled", async () => {
    window.LT_DEBUG = { leetcodeResolveMode: "success" }

    const promise = resolveTaskDraft({
      source: "leetcode",
      rawInput: "https://leetcode.com/problems/non-catalog-problem/",
    })

    await vi.advanceTimersByTimeAsync(900)
    const resolved = await promise

    expect(resolved.ok).toBe(true)
    if (resolved.ok) {
      expect(resolved.draft.name).toBe("Non Catalog Problem")
    }
  })

  it("supports window.LT_DEBUG alias", async () => {
    delete window.__LT_DEBUG__
    window.LT_DEBUG = { leetcodeResolveMode: "failure" }

    const promise = resolveTaskDraft({
      source: "leetcode",
      rawInput: "https://leetcode.com/problems/two-sum/",
    })

    await vi.advanceTimersByTimeAsync(900)
    const resolved = await promise

    expect(resolved.ok).toBe(false)
    if (!resolved.ok) {
      expect(resolved.reason).toBe("not_found")
      expect(resolved.fallbackDraft?.name).toBe("Two Sum")
    }
  })
})
