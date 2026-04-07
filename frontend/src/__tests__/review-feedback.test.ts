import { describe, it, expect } from "vitest"
import { REVIEW_FEEDBACK_OPTIONS, type ReviewFeedback } from "@/lib/review-feedback"

describe("review-feedback", () => {
  it("exports exactly three feedback options", () => {
    expect(REVIEW_FEEDBACK_OPTIONS).toHaveLength(3)
  })

  it("contains the required feedback values", () => {
    const values = REVIEW_FEEDBACK_OPTIONS.map((o) => o.value)
    expect(values).toContain("remember")
    expect(values).toContain("partial")
    expect(values).toContain("forgot")
  })

  it("every option has a non-empty label", () => {
    for (const option of REVIEW_FEEDBACK_OPTIONS) {
      expect(option.label.trim().length).toBeGreaterThan(0)
    }
  })

  it("ReviewFeedback type matches option values", () => {
    const validValues: ReviewFeedback[] = ["remember", "partial", "forgot"]
    const actualValues = REVIEW_FEEDBACK_OPTIONS.map((o) => o.value)
    expect(actualValues).toEqual(validValues)
  })
})
