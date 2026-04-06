import { describe, it, expect } from "vitest"
import {
  addTaskFlowReducer,
  initialAddTaskFlowState,
} from "@/src/features/add-task/flow-reducer"

describe("add-task flow reducer", () => {
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
})
