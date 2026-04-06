import { describe, it, expect } from "vitest"
import { LeetCodeTaskUrlSchema } from "@/src/shared/validation/schemas"

describe("LeetCodeTaskUrlSchema", () => {
  it("accepts valid LeetCode problem URL", () => {
    const result = LeetCodeTaskUrlSchema.safeParse("https://leetcode.com/problems/two-sum/")
    expect(result.success).toBe(true)
  })

  it("rejects non-LeetCode host", () => {
    const result = LeetCodeTaskUrlSchema.safeParse("https://example.com/problems/two-sum/")
    expect(result.success).toBe(false)
  })

  it("rejects non-problem LeetCode URL", () => {
    const result = LeetCodeTaskUrlSchema.safeParse("https://leetcode.com/problemset/")
    expect(result.success).toBe(false)
  })
})
