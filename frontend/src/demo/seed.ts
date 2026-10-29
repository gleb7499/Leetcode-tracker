// Domain rules and seed data of the GitHub Pages demo. The rules mirror the
// backend (TaskService, LeetCodeUrlParser, V1/V4 migrations); dates are local.

import { DEMO_EMAIL, DEMO_PASSWORD } from "./demo-config"

export type DemoDifficulty = "EASY" | "MEDIUM" | "HARD"
export type DemoReviewStatus = "forgot" | "partial" | "remember"
export type DemoScheduleMode = "spaced_repetition" | "disabled"
export type DemoSourceType = "leetcode_url" | "manual"

export const DEMO_USER_EMAIL = DEMO_EMAIL
export const DEMO_USER_PASSWORD = DEMO_PASSWORD
export const DEMO_USER_NAME = "Alex"
export const DEMO_DB_STORAGE_KEY = "leetcode-tracker.demo.db.v1"

export interface DemoUserRecord {
  id: number
  email: string
  name: string
  emailVerified: boolean
  createdAt: string
}

export interface DemoReviewRecord {
  reviewedAt: string
  /** Local calendar day of the review, YYYY-MM-DD. */
  date: string
  status: DemoReviewStatus
  intervalDays: number
  /** Next review day applied by this review, YYYY-MM-DD. */
  nextReview: string
}

export interface DemoTaskRecord {
  id: number
  /** Mirrors the backend identityKey: shared problem key, used for idempotent adds and backup import. */
  identityKey: string
  name: string
  url: string | null
  difficulty: DemoDifficulty
  topics: string[]
  notes: string | null
  sourceType: DemoSourceType
  sourceProblemId: string
  sourceMeta: string | null
  scheduleMode: DemoScheduleMode
  currentState: DemoReviewStatus
  createdAt: string
  lastReviewDate: string | null
  nextReviewDate: string
  reviews: DemoReviewRecord[]
}

export interface DemoSettingsRecord {
  reviewPolicyPresetId: number | null
  notificationsEnabled: boolean
  soundEffectsEnabled: boolean
  dailyGoal: number
  /** HH:mm:ss, as the backend serializes LocalTime. */
  reviewTime: string
  updatedAt: string
}

export interface DemoDb {
  version: 1
  /** Local day the seed dates were computed for; an older database is reseeded. */
  seededOn?: string
  user: DemoUserRecord
  nextTaskId: number
  tasks: DemoTaskRecord[]
  settings: DemoSettingsRecord
}

// ---------------------------------------------------------------------------
// Dates (local calendar days, YYYY-MM-DD)
// ---------------------------------------------------------------------------

const DAY_MS = 86_400_000

function pad2(value: number): string {
  return String(value).padStart(2, "0")
}

export function localDateString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`
}

/** Pure calendar arithmetic on YYYY-MM-DD strings; independent of the time zone and DST. */
export function shiftDateString(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

export function daysBetweenDateStrings(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS)
}

function localIsoAt(date: string, hour: number): string {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(year, month - 1, day, hour, 0, 0, 0).toISOString()
}

// ---------------------------------------------------------------------------
// Review policies (V1 global values == "standard" preset from V4)
// ---------------------------------------------------------------------------

export interface DemoPolicyValue {
  state: "FORGOT" | "PARTIAL" | "REMEMBER"
  baseIntervalDays: number
  growthFactor: number
  maxIntervalDays: number
}

export interface DemoReviewPolicyPreset {
  id: number
  code: string
  name: string
  description: string
  builtIn: boolean
  values: DemoPolicyValue[]
}

export const DEMO_REVIEW_POLICY_PRESETS: DemoReviewPolicyPreset[] = [
  {
    id: 1,
    code: "standard",
    name: "Standard",
    description: "Balanced intervals for steady retention.",
    builtIn: true,
    values: [
      { state: "FORGOT", baseIntervalDays: 1, growthFactor: 1.0, maxIntervalDays: 1 },
      { state: "PARTIAL", baseIntervalDays: 1, growthFactor: 1.0, maxIntervalDays: 30 },
      { state: "REMEMBER", baseIntervalDays: 2, growthFactor: 2.0, maxIntervalDays: 90 },
    ],
  },
  {
    id: 2,
    code: "gentle",
    name: "Gentle",
    description: "Shorter intervals and lower caps — more frequent reviews.",
    builtIn: true,
    values: [
      { state: "FORGOT", baseIntervalDays: 1, growthFactor: 1.0, maxIntervalDays: 2 },
      { state: "PARTIAL", baseIntervalDays: 1, growthFactor: 1.0, maxIntervalDays: 14 },
      { state: "REMEMBER", baseIntervalDays: 1, growthFactor: 1.5, maxIntervalDays: 45 },
    ],
  },
  {
    id: 3,
    code: "intense",
    name: "Intense",
    description: "Longer intervals and aggressive growth — fewer reviews once remembered.",
    builtIn: true,
    values: [
      { state: "FORGOT", baseIntervalDays: 1, growthFactor: 1.0, maxIntervalDays: 1 },
      { state: "PARTIAL", baseIntervalDays: 2, growthFactor: 1.0, maxIntervalDays: 45 },
      { state: "REMEMBER", baseIntervalDays: 3, growthFactor: 2.5, maxIntervalDays: 180 },
    ],
  },
]

export interface PolicyValues {
  baseIntervalDays: number
  growthFactor: number
  maxIntervalDays: number
}

const STATE_CODE_BY_STATUS: Record<DemoReviewStatus, DemoPolicyValue["state"]> = {
  forgot: "FORGOT",
  partial: "PARTIAL",
  remember: "REMEMBER",
}

/** Values for an outcome: the user's preset, or the global (standard) policy when no preset is chosen. */
export function resolvePolicyValues(presetId: number | null, status: DemoReviewStatus): PolicyValues {
  const preset = DEMO_REVIEW_POLICY_PRESETS.find((item) => item.id === presetId) ?? DEMO_REVIEW_POLICY_PRESETS[0]
  const value = preset.values.find((item) => item.state === STATE_CODE_BY_STATUS[status])
  if (!value) {
    throw new Error(`Preset ${preset.code} has no values for ${status}`)
  }
  return {
    baseIntervalDays: value.baseIntervalDays,
    growthFactor: value.growthFactor,
    maxIntervalDays: value.maxIntervalDays,
  }
}

/** Mirrors TaskService.nextInterval: remember grows, partial keeps, forgot resets; clamped to [1, max]. */
export function computeReviewInterval(status: DemoReviewStatus, policy: PolicyValues, currentInterval: number): number {
  if (currentInterval <= 0) {
    return policy.baseIntervalDays
  }
  let next: number
  if (status === "remember") {
    next = Math.round(currentInterval * policy.growthFactor)
  } else if (status === "partial") {
    next = currentInterval
  } else {
    next = policy.baseIntervalDays
  }
  return Math.min(Math.max(next, 1), policy.maxIntervalDays)
}

// ---------------------------------------------------------------------------
// Task source (mirrors LeetCodeUrlParser and TaskService identity rules)
// ---------------------------------------------------------------------------

const LEETCODE_PROBLEM_PATTERN = /^https?:\/\/(?:www\.)?leetcode\.com\/problems\/([a-z0-9][a-z0-9-]*)(\/.*)?$/i
const LEETCODE_HOST_PATTERN = /^https?:\/\/(?:www\.)?leetcode\.com(\/.*)?$/i
const ABSOLUTE_HTTP_PATTERN = /^https?:\/\/[^\s/$.?#].\S*$/

export interface ResolvedTaskSource {
  url: string | null
  sourceType: DemoSourceType
  sourceProblemId: string
  identityKey: string
  sourceMeta: string | null
}

export type TaskSourceResult = { ok: true; value: ResolvedTaskSource } | { ok: false; message: string }

/** Derives source, identity and sourceMeta from the task URL; an empty URL makes a manual task. */
export function resolveTaskSource(rawUrl: string | null, name: string): TaskSourceResult {
  const url = rawUrl?.trim() ?? ""
  if (url === "") {
    const identityKey = `manual:${name.trim().toLowerCase()}`
    return {
      ok: true,
      value: { url: null, sourceType: "manual", sourceProblemId: identityKey, identityKey, sourceMeta: null },
    }
  }
  const problem = LEETCODE_PROBLEM_PATTERN.exec(url)
  if (problem) {
    const slug = problem[1].toLowerCase()
    return {
      ok: true,
      value: {
        url,
        sourceType: "leetcode_url",
        sourceProblemId: slug,
        identityKey: `leetcode:${slug}`,
        sourceMeta: url,
      },
    }
  }
  if (LEETCODE_HOST_PATTERN.test(url)) {
    return { ok: false, message: "URL must point to a LeetCode problem: https://leetcode.com/problems/<slug>/" }
  }
  if (!ABSOLUTE_HTTP_PATTERN.test(url)) {
    return { ok: false, message: "URL must be a valid absolute http(s) link" }
  }
  return {
    ok: true,
    value: { url, sourceType: "manual", sourceProblemId: `link:${url}`, identityKey: `link:${url}`, sourceMeta: url },
  }
}

// ---------------------------------------------------------------------------
// Seed data
// ---------------------------------------------------------------------------

interface SeedTaskSpec {
  name: string
  url: string | null
  difficulty: DemoDifficulty
  topics: string[]
  notes: string | null
  /** Review outcomes from the first one onwards: R = remember, P = partial, F = forgot. */
  history: string
  /** Days from today until the next review; 0 means due today. */
  dueIn: number
  scheduleMode?: DemoScheduleMode
}

const SEED_TASKS: SeedTaskSpec[] = [
  { name: "Valid Parentheses", url: "https://leetcode.com/problems/valid-parentheses/", difficulty: "EASY", topics: ["String", "Stack"], notes: "Watch the empty-stack edge case.", history: "RRFPPPP", dueIn: 0 },
  { name: "Two Sum", url: "https://leetcode.com/problems/two-sum/", difficulty: "EASY", topics: ["Array", "Hash Table"], notes: "One pass with a hash map of complements.", history: "RRRPR", dueIn: 0 },
  { name: "Merge Two Sorted Lists", url: "https://leetcode.com/problems/merge-two-sorted-lists/", difficulty: "EASY", topics: ["Linked List", "Recursion"], notes: null, history: "RRPR", dueIn: 0 },
  { name: "Number of Islands", url: "https://leetcode.com/problems/number-of-islands/", difficulty: "MEDIUM", topics: ["Array", "Depth-First Search", "Breadth-First Search", "Union Find", "Matrix"], notes: null, history: "RRR", dueIn: 0 },
  { name: "LRU Cache", url: "https://leetcode.com/problems/lru-cache/", difficulty: "MEDIUM", topics: ["Hash Table", "Linked List", "Design", "Doubly-Linked List"], notes: "Hash map plus doubly-linked list: O(1) for both operations.", history: "RPRR", dueIn: 0 },
  { name: "Coin Change", url: "https://leetcode.com/problems/coin-change/", difficulty: "MEDIUM", topics: ["Array", "Dynamic Programming", "Breadth-First Search"], notes: "Bottom-up DP; amount 0 is the base case.", history: "RRRRF", dueIn: 0 },
  { name: "Maximum Subarray", url: "https://leetcode.com/problems/maximum-subarray/", difficulty: "MEDIUM", topics: ["Array", "Divide and Conquer", "Dynamic Programming"], notes: null, history: "", dueIn: 0 },
  { name: "Best Time to Buy and Sell Stock", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/", difficulty: "EASY", topics: ["Array", "Dynamic Programming"], notes: null, history: "RRRR", dueIn: 1 },
  { name: "Binary Search", url: "https://leetcode.com/problems/binary-search/", difficulty: "EASY", topics: ["Array", "Binary Search"], notes: "Known well; excluded from the review queue.", history: "RRRP", dueIn: 2, scheduleMode: "disabled" },
  { name: "Container With Most Water", url: "https://leetcode.com/problems/container-with-most-water/", difficulty: "MEDIUM", topics: ["Array", "Two Pointers", "Greedy"], notes: null, history: "RRRP", dueIn: 3 },
  { name: "3Sum", url: "https://leetcode.com/problems/3sum/", difficulty: "MEDIUM", topics: ["Array", "Two Pointers", "Sorting"], notes: "Sort, then fix one index and run two pointers.", history: "RRPR", dueIn: 2 },
  { name: "Longest Substring Without Repeating Characters", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/", difficulty: "MEDIUM", topics: ["Hash Table", "String", "Sliding Window"], notes: null, history: "RRFR", dueIn: 1 },
  { name: "Binary Tree Level Order Traversal", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/", difficulty: "MEDIUM", topics: ["Tree", "Breadth-First Search"], notes: null, history: "RRRPR", dueIn: 6 },
  { name: "Clone Graph", url: "https://leetcode.com/problems/clone-graph/", difficulty: "MEDIUM", topics: ["Hash Table", "Depth-First Search", "Breadth-First Search", "Graph"], notes: null, history: "RRRR", dueIn: 9 },
  { name: "Merge Intervals", url: "https://leetcode.com/problems/merge-intervals/", difficulty: "MEDIUM", topics: ["Array", "Sorting"], notes: null, history: "RPRRR", dueIn: 11 },
  { name: "Course Schedule", url: "https://leetcode.com/problems/course-schedule/", difficulty: "MEDIUM", topics: ["Depth-First Search", "Breadth-First Search", "Graph", "Topological Sort"], notes: null, history: "FRRR", dueIn: 2 },
  { name: "Word Break", url: "https://leetcode.com/problems/word-break/", difficulty: "MEDIUM", topics: ["Array", "Hash Table", "String", "Dynamic Programming", "Trie", "Memoization"], notes: null, history: "RRRR", dueIn: 14 },
  { name: "Median of Two Sorted Arrays", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/", difficulty: "HARD", topics: ["Array", "Binary Search", "Divide and Conquer"], notes: "Binary search on the partition index.", history: "RRRRR", dueIn: 20 },
  { name: "Trapping Rain Water", url: "https://leetcode.com/problems/trapping-rain-water/", difficulty: "HARD", topics: ["Array", "Two Pointers", "Dynamic Programming", "Stack", "Monotonic Stack"], notes: "Two pointers tracking the left and right maxima.", history: "RRRPR", dueIn: 15 },
  { name: "Climbing Stairs", url: "https://leetcode.com/problems/climbing-stairs/", difficulty: "EASY", topics: ["Math", "Dynamic Programming", "Memoization"], notes: null, history: "RRR", dueIn: 6 },
  { name: "Reverse Linked List", url: "https://leetcode.com/problems/reverse-linked-list/", difficulty: "EASY", topics: ["Linked List", "Recursion"], notes: null, history: "PR", dueIn: 1 },
  { name: "Min Stack", url: "https://leetcode.com/problems/min-stack/", difficulty: "MEDIUM", topics: ["Stack", "Design"], notes: null, history: "RRRPR", dueIn: 4 },
  { name: "Validate Binary Search Tree", url: "https://leetcode.com/problems/validate-binary-search-tree/", difficulty: "MEDIUM", topics: ["Tree", "Depth-First Search", "Binary Search Tree"], notes: null, history: "RRPRR", dueIn: 9 },
  { name: "Serialize and Deserialize Binary Tree", url: "https://leetcode.com/problems/serialize-and-deserialize-binary-tree/", difficulty: "HARD", topics: ["String", "Tree", "Depth-First Search", "Breadth-First Search", "Design"], notes: null, history: "RRFRRR", dueIn: 3 },
  { name: "Sliding Window Maximum", url: "https://leetcode.com/problems/sliding-window-maximum/", difficulty: "HARD", topics: ["Array", "Queue", "Sliding Window", "Heap (Priority Queue)", "Monotonic Queue"], notes: null, history: "RRRRP", dueIn: 12 },
  { name: "System design: rate limiter sketch", url: null, difficulty: "MEDIUM", topics: ["Design"], notes: "Token bucket vs sliding window log: compare memory use.", history: "RPR", dueIn: 3 },
  { name: "Dutch national flag (Sort Colors)", url: "https://en.wikipedia.org/wiki/Dutch_national_flag_problem", difficulty: "MEDIUM", topics: ["Array", "Two Pointers", "Sorting"], notes: "Three-way partition in a single pass.", history: "RRP", dueIn: 3 },
]

const HISTORY_CODES: Record<string, DemoReviewStatus> = { R: "remember", P: "partial", F: "forgot" }

function parseHistory(history: string): DemoReviewStatus[] {
  return [...history].map((code) => {
    const status = HISTORY_CODES[code]
    if (!status) {
      throw new Error(`Unknown history code: ${code}`)
    }
    return status
  })
}

/**
 * Builds a task whose review history was produced by the real interval policy:
 * the creation day is chosen so that the schedule ends exactly `dueIn` days from today.
 */
function buildSeedTask(spec: SeedTaskSpec, id: number, today: string, now: Date): DemoTaskRecord {
  const source = resolveTaskSource(spec.url, spec.name)
  if (!source.ok) {
    throw new Error(`Invalid seed URL for ${spec.name}: ${source.message}`)
  }
  const statuses = parseHistory(spec.history)

  const intervals: number[] = []
  let current = 0
  for (const status of statuses) {
    const interval = computeReviewInterval(status, resolvePolicyValues(null, status), current)
    intervals.push(interval)
    current = interval
  }
  const totalDays = intervals.reduce((sum, interval) => sum + interval, 0)
  const createdDate = shiftDateString(today, spec.dueIn - totalDays)

  const reviews: DemoReviewRecord[] = []
  let reviewDate = createdDate
  statuses.forEach((status, index) => {
    const interval = intervals[index]
    const nextReview = shiftDateString(reviewDate, interval)
    reviews.push({
      reviewedAt: localIsoAt(reviewDate, 18),
      date: reviewDate,
      status,
      intervalDays: interval,
      nextReview,
    })
    reviewDate = nextReview
  })

  const createdAt = new Date(localIsoAt(createdDate, 10))
  return {
    id,
    identityKey: source.value.identityKey,
    name: spec.name,
    url: source.value.url,
    difficulty: spec.difficulty,
    topics: [...spec.topics],
    notes: spec.notes,
    sourceType: source.value.sourceType,
    sourceProblemId: source.value.sourceProblemId,
    sourceMeta: source.value.sourceMeta,
    scheduleMode: spec.scheduleMode ?? "spaced_repetition",
    currentState: statuses.at(-1) ?? "remember",
    createdAt: (createdAt > now ? now : createdAt).toISOString(),
    lastReviewDate: reviews.at(-1)?.date ?? null,
    nextReviewDate: reviewDate,
    reviews,
  }
}

const DIFFICULTY_LABELS: Record<DemoDifficulty, "Easy" | "Medium" | "Hard"> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
}

/** Looks a LeetCode problem up among the seed tasks (used to pre-fill the add-task flow). */
export function findSeedProblem(
  slug: string,
): { name: string; difficulty: "Easy" | "Medium" | "Hard"; topics: string[]; notes?: string } | null {
  const url = `https://leetcode.com/problems/${slug}/`
  const spec = SEED_TASKS.find((task) => task.url === url)
  if (!spec) return null
  return {
    name: spec.name,
    difficulty: DIFFICULTY_LABELS[spec.difficulty],
    topics: spec.topics,
    notes: spec.notes ?? undefined,
  }
}

export function createSeedDb(now: Date = new Date()): DemoDb {
  const today = localDateString(now)
  const tasks = SEED_TASKS.map((spec, index) => buildSeedTask(spec, index + 1, today, now))
  return {
    version: 1,
    seededOn: today,
    user: {
      id: 1,
      email: DEMO_USER_EMAIL,
      name: DEMO_USER_NAME,
      emailVerified: true,
      createdAt: localIsoAt(shiftDateString(today, -60), 9),
    },
    nextTaskId: tasks.length + 1,
    tasks,
    settings: {
      reviewPolicyPresetId: null,
      notificationsEnabled: true,
      soundEffectsEnabled: true,
      dailyGoal: 10,
      reviewTime: "09:00:00",
      updatedAt: now.toISOString(),
    },
  }
}
