const LEETCODE_PROBLEM_PATH_WITH_SLUG_REGEX = /^\/problems\/([^/]+)(?:\/.*)?$/

export const LEETCODE_PROBLEM_PATH_REGEX = LEETCODE_PROBLEM_PATH_WITH_SLUG_REGEX

export function isLeetCodeHost(hostname: string): boolean {
  return hostname === "leetcode.com" || hostname === "www.leetcode.com"
}

export function extractLeetCodeProblemSlug(pathname: string): string | null {
  const match = LEETCODE_PROBLEM_PATH_WITH_SLUG_REGEX.exec(pathname)
  return match?.[1] ?? null
}
