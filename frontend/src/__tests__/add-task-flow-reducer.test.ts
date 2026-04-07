import { describe, it, expect } from "vitest"
import {
  addTaskFlowReducer,
  initialAddTaskFlowState,
} from "@/src/features/add-task/flow-reducer"

describe("add-task flow reducer", () => {
  it("moves from source-select to manual-details when custom source selected", () => {
    const next = addTaskFlowReducer(initialAddTaskFlowState, {
      type: "SELECT_SOURCE",
      source: "custom",
    })
    expect(next.step).toBe("manual-details")
    expect(next.source).toBe("custom")
  })

  it("moves from source-select to leetcode-url when leetcode source selected", () => {
    const next = addTaskFlowReducer(initialAddTaskFlowState, {
      type: "SELECT_SOURCE",
      source: "leetcode",
    })
    expect(next.step).toBe("leetcode-url")
    expect(next.source).toBe("leetcode")
  })

  it("moves to loading on URL submit", () => {
    const selected = addTaskFlowReducer(initialAddTaskFlowState, {
      type: "SELECT_SOURCE",
      source: "leetcode",
    })
    const next = addTaskFlowReducer(selected, { type: "SUBMIT_LEETCODE_URL" })
    expect(next.step).toBe("loading")
  })

  it("supports solved branch to optional-note and back", () => {
    const withDraft = {
      ...initialAddTaskFlowState,
      step: "solved-check" as const,
      resolvedTaskDraft: {
        source: "leetcode" as const,
        name: "Two Sum",
        url: "https://leetcode.com/problems/two-sum/",
        difficulty: "Easy" as const,
        topics: [],
      },
    }
    const toNote = addTaskFlowReducer(withDraft, { type: "ANSWER_SOLVED" })
    expect(toNote.step).toBe("optional-note")
    const back = addTaskFlowReducer(toNote, { type: "BACK_TO_SOLVED_CHECK" })
    expect(back.step).toBe("solved-check")
  })

  it("routes leetcode resolve failure with fallback draft to manual-details", () => {
    const loadingState = {
      ...initialAddTaskFlowState,
      step: "loading" as const,
      source: "leetcode" as const,
      leetCodeUrl: "https://leetcode.com/problems/unknown-problem/",
    }

    const next = addTaskFlowReducer(loadingState, {
      type: "RESOLVE_FAILURE",
      error: "Could not resolve this task automatically. Fill in details manually to continue.",
      fallbackDraft: {
        source: "leetcode",
        name: "Unknown Problem",
        url: "https://leetcode.com/problems/unknown-problem/",
        difficulty: "Medium",
        topics: [],
        sourceMeta: {
          slug: "unknown-problem",
          catalogHit: false,
        },
      },
    })

    expect(next.step).toBe("manual-details")
    expect(next.manualDetails.name).toBe("Unknown Problem")
    expect(next.manualDetails.difficulty).toBeNull()
  })

  it("returns to source-select when back from custom manual step", () => {
    const customManual = addTaskFlowReducer(initialAddTaskFlowState, {
      type: "SELECT_SOURCE",
      source: "custom",
    })

    const back = addTaskFlowReducer(customManual, {
      type: "BACK_FROM_MANUAL_DETAILS",
    })

    expect(back.step).toBe("source-select")
    expect(back.source).toBeNull()
  })

  it("returns to leetcode-url when back from fallback manual step", () => {
    const fallbackManual = {
      ...initialAddTaskFlowState,
      source: "leetcode" as const,
      step: "manual-details" as const,
      leetCodeUrl: "https://leetcode.com/problems/unknown-problem/",
    }

    const back = addTaskFlowReducer(fallbackManual, {
      type: "BACK_FROM_MANUAL_DETAILS",
    })

    expect(back.step).toBe("leetcode-url")
    expect(back.source).toBe("leetcode")
  })
})
