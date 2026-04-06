import type { Difficulty, ResolvedTaskDraft, TaskSource } from "@/src/shared/types"
import { MOCK_REVIEW_TASKS } from "@/data/review-tasks"

interface ResolveTaskInput {
  source: TaskSource
  rawInput: string
}

export interface ResolveTaskSuccess {
  ok: true
  draft: ResolvedTaskDraft
}

export interface ResolveTaskFailure {
  ok: false
  reason: "invalid_input" | "not_found" | "unknown"
}

export type ResolveTaskResult = ResolveTaskSuccess | ResolveTaskFailure

export interface TaskSourceResolver {
  source: TaskSource
  resolve: (input: string) => Promise<ResolveTaskResult>
}

const MOCK_LEETCODE_RESOLVE_DELAY_MS = 900
const LEETCODE_FALLBACK_DIFFICULTY: Difficulty = "Medium"

function normalizeLeetCodeUrl(input: string): URL | null {
  try {
    const parsed = new URL(input.trim())
    const host = parsed.hostname.toLowerCase()
    if (host !== "leetcode.com" && host !== "www.leetcode.com") return null
    if (!/^\/problems\/[^/]+\/?$/.test(parsed.pathname)) return null
    return parsed
  } catch {
    return null
  }
}

function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

const leetCodeResolver: TaskSourceResolver = {
  source: "leetcode",
  async resolve(input: string): Promise<ResolveTaskResult> {
    const parsed = normalizeLeetCodeUrl(input)
    if (!parsed) {
      return { ok: false, reason: "invalid_input" }
    }

    await new Promise((resolve) => setTimeout(resolve, MOCK_LEETCODE_RESOLVE_DELAY_MS))

    const match = /^\/problems\/([^/]+)\/?$/.exec(parsed.pathname)
    const slug = match?.[1] ?? ""
    if (!slug) {
      return { ok: false, reason: "invalid_input" }
    }

    const fullUrl = `https://leetcode.com/problems/${slug}/`
    const catalogTask = MOCK_REVIEW_TASKS.find((task) => task.url === fullUrl)
    return {
      ok: true,
      draft: {
        source: "leetcode",
        name: catalogTask?.name ?? titleFromSlug(slug),
        url: fullUrl,
        difficulty: catalogTask?.difficulty ?? LEETCODE_FALLBACK_DIFFICULTY,
        topics: catalogTask?.topics ?? [],
        notes: catalogTask?.notes ?? "",
        sourceMeta: {
          slug,
          sourceTaskId: catalogTask?.id,
          catalogHit: Boolean(catalogTask),
        },
      },
    }
  },
}

const resolvers = new Map<TaskSource, TaskSourceResolver>([["leetcode", leetCodeResolver]])

export async function resolveTaskDraft(input: ResolveTaskInput): Promise<ResolveTaskResult> {
  const resolver = resolvers.get(input.source)
  if (!resolver) {
    return { ok: false, reason: "unknown" }
  }

  return resolver.resolve(input.rawInput)
}
