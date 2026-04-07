import type { Difficulty, ResolvedTaskDraft, TaskSource } from "@/src/shared/types"
import { MOCK_REVIEW_TASKS } from "@/data/review-tasks"
import {
  extractLeetCodeProblemSlug,
  LEETCODE_PROBLEM_PATH_REGEX,
  isLeetCodeHost,
} from "@/src/shared/tasks/leetcode-url"

interface ResolveTaskInput {
  source: TaskSource
  rawInput: string
}

export type LeetCodeResolveMode = "auto" | "success" | "failure"

interface LeetCodeDebugConfig {
  leetcodeResolveMode?: LeetCodeResolveMode
}

export interface ResolveTaskSuccess {
  ok: true
  draft: ResolvedTaskDraft
}

export interface ResolveTaskFailure {
  ok: false
  reason: "invalid_input" | "not_found" | "unknown"
  fallbackDraft?: ResolvedTaskDraft
}

export type ResolveTaskResult = ResolveTaskSuccess | ResolveTaskFailure

export interface TaskSourceResolver {
  source: TaskSource
  resolve: (input: string) => Promise<ResolveTaskResult>
}

const LEETCODE_RESOLVE_SIMULATION_DELAY_MS = 900
const LEETCODE_FALLBACK_DIFFICULTY: Difficulty = "Medium"

declare global {
  interface Window {
    LT_DEBUG?: LeetCodeDebugConfig
    __LT_DEBUG__?: LeetCodeDebugConfig
  }
}

function ensureDebugConfig(): LeetCodeDebugConfig | null {
  if (typeof window === "undefined") return null

  const config = window.LT_DEBUG ?? window.__LT_DEBUG__ ?? {}
  window.LT_DEBUG = config
  window.__LT_DEBUG__ = config
  return config
}

if (typeof window !== "undefined") {
  ensureDebugConfig()
}

function getDebugConfig(): LeetCodeDebugConfig | null {
  return ensureDebugConfig()
}

function getLeetCodeResolveMode(): LeetCodeResolveMode {
  const mode = getDebugConfig()?.leetcodeResolveMode
  if (mode === "success" || mode === "failure") {
    return mode
  }
  return "auto"
}

function normalizeLeetCodeUrl(input: string): URL | null {
  try {
    const parsed = new URL(input.trim())
    const host = parsed.hostname.toLowerCase()
    if (!isLeetCodeHost(host)) return null
    if (!LEETCODE_PROBLEM_PATH_REGEX.test(parsed.pathname)) return null
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

function createDraftFromSlug(
  slug: string,
  mode: LeetCodeResolveMode,
): {
  fullUrl: string
  draft: ResolvedTaskDraft
  catalogHit: boolean
} {
  const fullUrl = `https://leetcode.com/problems/${slug}/`
  const catalogTask = MOCK_REVIEW_TASKS.find((task) => task.url === fullUrl)

  return {
    fullUrl,
    catalogHit: Boolean(catalogTask),
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
        resolveMode: mode,
      },
    },
  }
}

const leetCodeResolver: TaskSourceResolver = {
  source: "leetcode",
  async resolve(input: string): Promise<ResolveTaskResult> {
    const parsed = normalizeLeetCodeUrl(input)
    if (!parsed) {
      return { ok: false, reason: "invalid_input" }
    }

    await new Promise((resolve) => setTimeout(resolve, LEETCODE_RESOLVE_SIMULATION_DELAY_MS))

    const slug = extractLeetCodeProblemSlug(parsed.pathname) ?? ""
    if (!slug) {
      return { ok: false, reason: "invalid_input" }
    }

    const resolveMode = getLeetCodeResolveMode()
    const { draft, catalogHit } = createDraftFromSlug(slug, resolveMode)

    if (resolveMode === "failure" || (resolveMode === "auto" && !catalogHit)) {
      return {
        ok: false,
        reason: "not_found",
        fallbackDraft: {
          ...draft,
          sourceMeta: {
            ...draft.sourceMeta,
            forcedFailure: resolveMode === "failure",
          },
        },
      }
    }

    return {
      ok: true,
      draft,
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
