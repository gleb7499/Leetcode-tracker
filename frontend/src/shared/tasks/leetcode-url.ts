export const LEETCODE_PROBLEM_PATH_REGEX = /^\/problems\/[^/]+\/?$/

export function isLeetCodeHost(hostname: string): boolean {
  return hostname === "leetcode.com" || hostname === "www.leetcode.com"
}
