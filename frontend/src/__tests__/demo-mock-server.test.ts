import { beforeEach, describe, expect, it } from "vitest"
import { DEMO_USER_EMAIL, DEMO_USER_NAME, DEMO_USER_PASSWORD, demoFetch, resetDemoData, setDemoLatency } from "@/src/demo/mock-server"
import { DEMO_DB_STORAGE_KEY, localDateString, shiftDateString, type DemoDb } from "@/src/demo/seed"
import type { AuthPayload } from "@/src/shared/api/auth"
import type { StatsSummary, RecallStats, DayWorkload } from "@/src/shared/api/stats"
import type { TaskDto } from "@/src/shared/api/tasks"
import type { UserSettings, ReviewPolicyPreset } from "@/src/shared/api/settings"

interface ApiResult<T> {
  status: number
  body: T
  headers: Headers
}

interface ErrorBody {
  code: string
  message: string
  requestId: string
}

async function request<T = unknown>(
  method: string,
  path: string,
  options: { body?: unknown; token?: string } = {},
): Promise<ApiResult<T>> {
  const headers: Record<string, string> = {}
  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json"
  }
  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`
  }
  const response = await demoFetch(`/api/v1${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })
  const text = await response.text()
  return { status: response.status, body: (text ? JSON.parse(text) : undefined) as T, headers: response.headers }
}

async function signIn(): Promise<string> {
  const result = await request<AuthPayload>("POST", "/auth/login", {
    body: { email: DEMO_USER_EMAIL, password: DEMO_USER_PASSWORD },
  })
  return result.body.accessToken
}

function today(): string {
  return localDateString(new Date())
}

describe("demo mock server", () => {
  beforeEach(() => {
    setDemoLatency(0, 0)
    localStorage.clear()
    resetDemoData()
  })

  it("signs in with any credentials and rotates tokens on refresh", async () => {
    const login = await request<AuthPayload>("POST", "/auth/login", {
      body: { email: "Reader@Example.com", password: "anything-goes" },
    })
    expect(login.status).toBe(200)
    expect(login.body.user.email).toBe("reader@example.com")
    expect(login.body.user.name).toBe(DEMO_USER_NAME)
    expect(login.body.accessToken).not.toBe("")

    const me = await request<{ user: { email: string } }>("GET", "/auth/me", { token: login.body.accessToken })
    expect(me.status).toBe(200)
    expect(me.body.user.email).toBe("reader@example.com")

    const refreshed = await request<AuthPayload>("POST", "/auth/refresh", {
      body: { refreshToken: login.body.refreshToken },
    })
    expect(refreshed.status).toBe(200)
    expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken)
    expect(refreshed.body.accessToken).not.toBe(login.body.accessToken)
  })

  it("accepts only the demo one-time code and applies the registered name", async () => {
    const registered = await request<{ user: { name: string } }>("POST", "/auth/register", {
      body: { name: "Ivan Petrov", email: "ivan@example.com", password: "Passw0rd!" },
    })
    expect(registered.status).toBe(201)

    const wrong = await request<ErrorBody>("POST", "/auth/verify-email/confirm", {
      body: { email: "ivan@example.com", code: "123456" },
    })
    expect(wrong.status).toBe(400)
    expect(wrong.body.message).toBe("Invalid or expired code")

    const confirmed = await request<AuthPayload>("POST", "/auth/verify-email/confirm", {
      body: { email: "ivan@example.com", code: "000000" },
    })
    expect(confirmed.status).toBe(200)
    expect(confirmed.body.user).toMatchObject({ email: "ivan@example.com", name: "Ivan Petrov" })
  })

  it("derives a name from the email when signing in without registering", async () => {
    const confirmed = await request<AuthPayload>("POST", "/auth/verify-email/confirm", {
      body: { email: "maria.sidorova@example.com", code: "000000" },
    })
    expect(confirmed.body.user.name).toBe("Maria Sidorova")
  })

  it("keeps the signed-in account across a data reset", async () => {
    await request("POST", "/auth/register", {
      body: { name: "Ivan Petrov", email: "ivan@example.com", password: "Passw0rd!" },
    })
    const confirmed = await request<AuthPayload>("POST", "/auth/verify-email/confirm", {
      body: { email: "ivan@example.com", code: "000000" },
    })
    resetDemoData()
    const me = await request<{ user: { email: string; name: string } }>("GET", "/auth/me", {
      token: confirmed.body.accessToken,
    })
    expect(me.body.user).toMatchObject({ email: "ivan@example.com", name: "Ivan Petrov" })
  })

  it("rejects /me requests without a bearer token with the contract error body", async () => {
    const result = await request<ErrorBody>("GET", "/me/tasks")
    expect(result.status).toBe(401)
    expect(result.body.code).toBe("UNAUTHORIZED")
    expect(typeof result.body.message).toBe("string")
    expect(typeof result.body.requestId).toBe("string")
    expect(result.headers.get("X-Request-Id")).toBe(result.body.requestId)
  })

  it("returns 404 with the error body for unknown routes", async () => {
    const token = await signIn()
    const result = await request<ErrorBody>("GET", "/me/unknown", { token })
    expect(result.status).toBe(404)
    expect(result.body.code).toBe("NOT_FOUND")
  })

  it("lists tasks by due date and keeps today's queue within the seeded range", async () => {
    const token = await signIn()
    const list = await request<TaskDto[]>("GET", "/me/tasks", { token })
    expect(list.status).toBe(200)
    const dates = list.body.map((task) => task.nextReview)
    expect([...dates].sort()).toEqual(dates)

    const queue = await request<TaskDto[]>("GET", "/me/tasks/today", { token })
    expect(queue.body.length).toBeGreaterThanOrEqual(5)
    expect(queue.body.length).toBeLessThanOrEqual(7)
    for (const task of queue.body) {
      expect(task.nextReview <= today()).toBe(true)
      expect(task.scheduleMode).toBe("spaced_repetition")
    }
  })

  it("creates LeetCode tasks idempotently and derives the source from the URL", async () => {
    const token = await signIn()
    const url = "https://leetcode.com/problems/house-robber/"
    const body = {
      name: "House Robber",
      url,
      difficulty: "MEDIUM",
      topics: ["Array", " array ", "Dynamic Programming"],
      notes: "",
      scheduleMode: "spaced_repetition",
    }

    const first = await request<TaskDto>("POST", "/me/tasks", { token, body })
    expect(first.status).toBe(201)
    expect(first.body).toMatchObject({
      name: "House Robber",
      url,
      difficulty: "MEDIUM",
      topics: ["Array", "Dynamic Programming"],
      source: "leetcode_url",
      sourceMeta: url,
      nextReview: today(),
      reviews: [],
    })

    const before = await request<TaskDto[]>("GET", "/me/tasks", { token })
    const second = await request<TaskDto>("POST", "/me/tasks", { token, body })
    const after = await request<TaskDto[]>("GET", "/me/tasks", { token })
    expect(second.body.id).toBe(first.body.id)
    expect(after.body.length).toBe(before.body.length)
  })

  it("creates manual tasks without a URL", async () => {
    const token = await signIn()
    const created = await request<TaskDto>("POST", "/me/tasks", {
      token,
      body: { name: "Notes on segment trees", difficulty: "HARD", topics: [], notes: "Lazy propagation" },
    })
    expect(created.status).toBe(201)
    expect(created.body).toMatchObject({ url: null, source: "manual", sourceMeta: null, notes: "Lazy propagation" })
  })

  it("rejects invalid task input with VALIDATION_ERROR", async () => {
    const token = await signIn()
    const cases: unknown[] = [
      { name: "Problemset link", url: "https://leetcode.com/problemset/all/", difficulty: "EASY" },
      { name: "Not a link", url: "not a link", difficulty: "EASY" },
      { name: "Bad difficulty", difficulty: "IMPOSSIBLE" },
      { difficulty: "EASY" },
    ]
    for (const body of cases) {
      const result = await request<ErrorBody>("POST", "/me/tasks", { token, body })
      expect(result.status).toBe(422)
      expect(result.body.code).toBe("VALIDATION_ERROR")
    }
  })

  it("records reviews and reschedules them according to the policy", async () => {
    const token = await signIn()
    const created = await request<TaskDto>("POST", "/me/tasks", {
      token,
      body: { name: "Scratch task", difficulty: "EASY", topics: [], notes: "" },
    })
    const id = created.body.id
    const base = today()
    const review = (status: string) => request<TaskDto>("POST", `/me/tasks/${id}/reviews`, { token, body: { status } })

    const remembered = await review("remember")
    expect(remembered.body.nextReview).toBe(shiftDateString(base, 2))
    expect(remembered.body.reviews).toHaveLength(1)

    const rememberedAgain = await review("remember")
    expect(rememberedAgain.body.nextReview).toBe(shiftDateString(base, 4))

    const partial = await review("partial")
    expect(partial.body.nextReview).toBe(shiftDateString(base, 4))

    const forgot = await review("forgot")
    expect(forgot.body.nextReview).toBe(shiftDateString(base, 1))
    expect(forgot.body.reviews.map((entry) => entry.status)).toEqual(["remember", "remember", "partial", "forgot"])
    expect(forgot.body.reviews.every((entry) => entry.date === base)).toBe(true)
  })

  it("rejects unknown review statuses", async () => {
    const token = await signIn()
    const result = await request<ErrorBody>("POST", "/me/tasks/1/reviews", { token, body: { status: "easy" } })
    expect(result.status).toBe(422)
    expect(result.body.code).toBe("VALIDATION_ERROR")
  })

  it("deletes tasks idempotently and reports unknown tasks as NOT_FOUND", async () => {
    const token = await signIn()
    const created = await request<TaskDto>("POST", "/me/tasks", {
      token,
      body: { name: "Temporary", difficulty: "EASY", topics: [] },
    })
    const id = created.body.id

    const removed = await request("DELETE", `/me/tasks/${id}`, { token })
    expect(removed.status).toBe(204)
    const list = await request<TaskDto[]>("GET", "/me/tasks", { token })
    expect(list.body.some((task) => task.id === id)).toBe(false)

    const again = await request("DELETE", `/me/tasks/${id}`, { token })
    expect(again.status).toBe(204)

    const missing = await request<ErrorBody>("GET", "/me/tasks/999999", { token })
    expect(missing.status).toBe(404)
    expect(missing.body.code).toBe("NOT_FOUND")
  })

  it("keeps statistics consistent with the stored tasks and reviews", async () => {
    const token = await signIn()
    const tasks = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body
    const summary = (await request<StatsSummary>("GET", "/me/stats", { token })).body
    const recall = (await request<RecallStats>("GET", "/me/stats/recall", { token })).body
    const difficulty = (await request<{ difficulty: string; count: number }[]>("GET", "/me/stats/difficulty", { token })).body
    const sources = (await request<{ source: string; count: number }[]>("GET", "/me/stats/sources", { token })).body

    const totalReviews = tasks.reduce((sum, task) => sum + task.reviews.length, 0)
    expect(summary.totalTasks).toBe(tasks.length)
    expect(summary.activeTasks).toBe(tasks.filter((task) => task.scheduleMode === "spaced_repetition").length)
    expect(summary.reviewedTasks).toBe(tasks.filter((task) => task.reviews.length > 0).length)
    expect(summary.totalReviews).toBe(totalReviews)
    expect(recall.total).toBe(totalReviews)
    expect(recall.forgot + recall.partial + recall.remember).toBe(totalReviews)
    expect(recall.remember).toBeGreaterThan(recall.forgot + recall.partial)

    expect(difficulty.map((entry) => entry.difficulty)).toEqual(["EASY", "MEDIUM", "HARD"])
    expect(difficulty.reduce((sum, entry) => sum + entry.count, 0)).toBe(tasks.length)
    expect(sources.reduce((sum, entry) => sum + entry.count, 0)).toBe(tasks.length)
  })

  it("computes workload per day from today and validates the window", async () => {
    const token = await signIn()
    const tasks = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body
    const weekly = (await request<DayWorkload[]>("GET", "/me/stats/workload?days=7", { token })).body
    expect(weekly).toHaveLength(7)
    expect(weekly[0].date).toBe(today())
    expect(weekly[6].date).toBe(shiftDateString(today(), 6))
    for (const day of weekly) {
      const expected = tasks.filter(
        (task) => task.scheduleMode === "spaced_repetition" && task.nextReview === day.date,
      ).length
      expect(day.count).toBe(expected)
    }

    const defaults = (await request<DayWorkload[]>("GET", "/me/stats/workload", { token })).body
    expect(defaults).toHaveLength(7)

    const monthly = (await request<DayWorkload[]>("GET", "/me/stats/workload?days=90", { token })).body
    expect(monthly).toHaveLength(90)

    for (const days of ["0", "91"]) {
      const invalid = await request<ErrorBody>("GET", `/me/stats/workload?days=${days}`, { token })
      expect(invalid.status).toBe(422)
    }
  })

  it("counts the streak back from yesterday when today has no review", async () => {
    const token = await signIn()
    const summary = (await request<StatsSummary>("GET", "/me/stats", { token })).body
    expect(summary.streakDays).toBeGreaterThanOrEqual(5)
  })

  it("updates settings partially and validates the patch", async () => {
    const token = await signIn()
    const initial = (await request<UserSettings>("GET", "/me/settings", { token })).body
    expect(initial.reviewPolicyPresetId).toBeNull()
    expect(initial.dailyGoal).toBe(10)
    expect(initial.reviewTime).toBe("09:00:00")

    const patched = await request<UserSettings>("PATCH", "/me/settings", {
      token,
      body: { reviewPolicyPresetId: 2, dailyGoal: 20, reviewTime: "08:30" },
    })
    expect(patched.status).toBe(200)
    expect(patched.body).toMatchObject({
      reviewPolicyPresetId: 2,
      dailyGoal: 20,
      reviewTime: "08:30:00",
      notificationsEnabled: true,
    })

    const reset = await request<UserSettings>("PATCH", "/me/settings", { token, body: { reviewPolicyPresetId: 0 } })
    expect(reset.body.reviewPolicyPresetId).toBeNull()
    expect(reset.body.dailyGoal).toBe(20)

    const badGoal = await request<ErrorBody>("PATCH", "/me/settings", { token, body: { dailyGoal: 0 } })
    expect(badGoal.status).toBe(422)
    const badPreset = await request<ErrorBody>("PATCH", "/me/settings", { token, body: { reviewPolicyPresetId: 99 } })
    expect(badPreset.status).toBe(422)
    const unchanged = (await request<UserSettings>("GET", "/me/settings", { token })).body
    expect(unchanged.dailyGoal).toBe(20)
  })

  it("lists the built-in review policy presets with per-outcome values", async () => {
    const presets = await request<ReviewPolicyPreset[]>("GET", "/review-policies")
    expect(presets.status).toBe(200)
    expect(presets.body.map((preset) => preset.code)).toEqual(["standard", "gentle", "intense"])
    const standard = presets.body.find((preset) => preset.code === "standard")
    expect(standard?.values.find((value) => value.state === "REMEMBER")).toEqual({
      state: "REMEMBER",
      baseIntervalDays: 2,
      growthFactor: 2,
      maxIntervalDays: 90,
    })
  })

  it("applies the chosen preset to the review interval", async () => {
    const token = await signIn()
    await request("PATCH", "/me/settings", { token, body: { reviewPolicyPresetId: 3 } })
    const created = await request<TaskDto>("POST", "/me/tasks", {
      token,
      body: { name: "Preset probe", difficulty: "EASY", topics: [] },
    })
    const base = today()
    const first = await request<TaskDto>("POST", `/me/tasks/${created.body.id}/reviews`, {
      token,
      body: { status: "remember" },
    })
    expect(first.body.nextReview).toBe(shiftDateString(base, 3))

    const second = await request<TaskDto>("POST", `/me/tasks/${created.body.id}/reviews`, {
      token,
      body: { status: "remember" },
    })
    expect(second.body.nextReview).toBe(shiftDateString(base, 8))
  })

  it("exports a backup and imports it back without duplicates", async () => {
    const token = await signIn()
    const exported = await request<{ format: string; version: number; tasks: unknown[] }>("GET", "/me/backup", { token })
    expect(exported.status).toBe(200)
    expect(exported.headers.get("Content-Type")).toContain("application/json")
    expect(exported.headers.get("Content-Disposition")).toContain("leetcode-tracker-backup.json")
    expect(exported.body.format).toBe("leetcode-tracker-backup")
    expect(exported.body.version).toBe(1)

    const before = (await request<StatsSummary>("GET", "/me/stats", { token })).body
    const imported = await request<{ success: boolean; message: string }>("POST", "/me/backup", {
      token,
      body: exported.body,
    })
    expect(imported.status).toBe(200)
    const after = (await request<StatsSummary>("GET", "/me/stats", { token })).body
    expect(after.totalTasks).toBe(before.totalTasks)
    expect(after.totalReviews).toBe(before.totalReviews)
  })

  it("imports new tasks from a backup file", async () => {
    const token = await signIn()
    const countBefore = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body.length
    const backup = {
      format: "leetcode-tracker-backup",
      version: 1,
      exportedAt: new Date().toISOString(),
      user: { email: DEMO_USER_EMAIL, name: DEMO_USER_NAME, createdAt: new Date().toISOString() },
      settings: null,
      tasks: [
        {
          identityKey: "manual:imported note",
          title: "Imported note",
          link: null,
          sourceType: "manual",
          sourceProblemId: "manual:imported note",
          sourceMeta: null,
          difficulty: "EASY",
          topics: ["Design"],
          notes: "from file",
          scheduleMode: "spaced_repetition",
          currentState: "REMEMBER",
          lastReviewDate: null,
          nextReviewDate: today(),
          createdAt: new Date().toISOString(),
          reviews: [],
        },
      ],
    }
    const imported = await request("POST", "/me/backup", { token, body: backup })
    expect(imported.status).toBe(200)
    const tasks = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body
    expect(tasks).toHaveLength(countBefore + 1)
    expect(tasks.find((task) => task.name === "Imported note")).toMatchObject({ notes: "from file", topics: ["Design"] })
  })

  it("rejects backup files with the wrong format or malformed tasks", async () => {
    const token = await signIn()
    const wrongFormat = await request<ErrorBody>("POST", "/me/backup", {
      token,
      body: { format: "something-else", version: 1, tasks: [] },
    })
    expect(wrongFormat.status).toBe(422)

    const malformedTask = await request<ErrorBody>("POST", "/me/backup", {
      token,
      body: { format: "leetcode-tracker-backup", version: 1, tasks: [{ identityKey: "", title: "", difficulty: "EASY" }] },
    })
    expect(malformedTask.status).toBe(422)
    expect(malformedTask.body.code).toBe("VALIDATION_ERROR")
  })

  it("requires the current password to change it and a password to delete the account", async () => {
    const token = await signIn()
    const emptyCurrent = await request<ErrorBody>("POST", "/me/change-password", {
      token,
      body: { currentPassword: "", newPassword: "New-password-1" },
    })
    expect(emptyCurrent.status).toBe(422)

    const changed = await request<{ success: boolean }>("POST", "/me/change-password", {
      token,
      body: { currentPassword: DEMO_USER_PASSWORD, newPassword: "New-password-1" },
    })
    expect(changed.status).toBe(200)
    expect(changed.body.success).toBe(true)

    const noPassword = await request<ErrorBody>("DELETE", "/me", { token, body: { password: "" } })
    expect(noPassword.status).toBe(422)

    const created = await request<TaskDto>("POST", "/me/tasks", {
      token,
      body: { name: "Doomed task", difficulty: "EASY", topics: [] },
    })
    const deleted = await request("DELETE", "/me", { token, body: { password: DEMO_USER_PASSWORD } })
    expect(deleted.status).toBe(204)
    const tasks = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body
    expect(tasks.some((task) => task.id === created.body.id)).toBe(false)
  })

  it("restores the seed data with resetDemoData after edits", async () => {
    const token = await signIn()
    const tasks = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body
    const victim = tasks[0]
    await request("DELETE", `/me/tasks/${victim.id}`, { token })
    expect((await request<TaskDto[]>("GET", "/me/tasks", { token })).body.some((task) => task.id === victim.id)).toBe(
      false,
    )

    resetDemoData()
    const restored = (await request<TaskDto[]>("GET", "/me/tasks", { token })).body
    expect(restored.some((task) => task.id === victim.id)).toBe(true)
    expect(restored).toHaveLength(tasks.length)
  })

  it("recovers from corrupted data in localStorage", async () => {
    const token = await signIn()
    localStorage.setItem(DEMO_DB_STORAGE_KEY, "{not valid json")

    const list = await request<TaskDto[]>("GET", "/me/tasks", { token })
    expect(list.status).toBe(200)
    expect(list.body.length).toBeGreaterThan(0)

    const stored = localStorage.getItem(DEMO_DB_STORAGE_KEY)
    expect(() => JSON.parse(stored ?? "null")).not.toThrow()
  })

  it("seeds reviews in the past that agree with the stored schedule", async () => {
    const raw = localStorage.getItem(DEMO_DB_STORAGE_KEY)
    expect(raw).not.toBeNull()
    const db = JSON.parse(raw ?? "null") as DemoDb
    const todayDate = today()

    for (const task of db.tasks) {
      expect(task.nextReviewDate >= todayDate).toBe(true)
      task.reviews.forEach((review, index) => {
        expect(review.date < todayDate).toBe(true)
        expect(review.nextReview).toBe(shiftDateString(review.date, review.intervalDays))
        const next = task.reviews[index + 1]
        if (next) {
          expect(next.date).toBe(review.nextReview)
        }
      })
      const last = task.reviews.at(-1)
      if (last) {
        expect(task.lastReviewDate).toBe(last.date)
        expect(task.nextReviewDate).toBe(last.nextReview)
      }
    }
  })

  it("keeps the review streak at five days or more before today", async () => {
    const raw = localStorage.getItem(DEMO_DB_STORAGE_KEY)
    const db = JSON.parse(raw ?? "null") as DemoDb
    const reviewDays = new Set(db.tasks.flatMap((task) => task.reviews.map((review) => review.date)))
    for (let offset = 1; offset <= 5; offset += 1) {
      expect(reviewDays.has(shiftDateString(today(), -offset))).toBe(true)
    }
  })
})
