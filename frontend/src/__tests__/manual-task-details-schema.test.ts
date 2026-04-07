import { describe, it, expect } from "vitest"
import { ManualTaskDetailsSchema } from "@/src/shared/validation/schemas"

describe("ManualTaskDetailsSchema", () => {
  it("accepts valid manual task details", () => {
    const result = ManualTaskDetailsSchema.safeParse({
      name: "  Two Sum  ",
      difficulty: "Easy",
      topics: ["Array", "Hash Table"],
    })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("Two Sum")
    }
  })

  it("requires at least one selected topic", () => {
    const result = ManualTaskDetailsSchema.safeParse({
      name: "Binary Search",
      difficulty: "Easy",
      topics: [],
    })

    expect(result.success).toBe(false)
  })

  it("requires difficulty selection", () => {
    const result = ManualTaskDetailsSchema.safeParse({
      name: "Binary Search",
      difficulty: undefined,
      topics: ["Array"],
    })

    expect(result.success).toBe(false)
  })
})
