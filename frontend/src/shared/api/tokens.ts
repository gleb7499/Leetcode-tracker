const ACCESS_KEY = "leetcode-tracker.access-token"
const REFRESH_KEY = "leetcode-tracker.refresh-token"
const REMEMBER_KEY = "leetcode-tracker.remember-session"

let generation = 0

function area(): Storage {
  if (typeof window === "undefined") {
    throw new Error("Token storage is only available in the browser")
  }
  return window.localStorage.getItem(REMEMBER_KEY) === "1"
    ? window.localStorage
    : window.sessionStorage
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return area().getItem(ACCESS_KEY)
  },
  getRefreshToken(): string | null {
    return area().getItem(REFRESH_KEY)
  },
  hasRefreshToken(): boolean {
    return area().getItem(REFRESH_KEY) !== null
  },
  setTokens(accessToken: string, refreshToken: string, remember: boolean): void {
    if (typeof window === "undefined") return
    window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0")
    // Drop stale copies from the other storage area so the pair never splits.
    const target = area()
    for (const store of [window.localStorage, window.sessionStorage]) {
      if (store === target) continue
      store.removeItem(ACCESS_KEY)
      store.removeItem(REFRESH_KEY)
    }
    target.setItem(ACCESS_KEY, accessToken)
    target.setItem(REFRESH_KEY, refreshToken)
  },
  /** Rotates the token pair in place, keeping the current remember-me area. */
  rotateTokens(accessToken: string, refreshToken: string): void {
    area().setItem(ACCESS_KEY, accessToken)
    area().setItem(REFRESH_KEY, refreshToken)
  },
  setAccessToken(accessToken: string): void {
    area().setItem(ACCESS_KEY, accessToken)
  },
  /** Bumped on every clear(); lets in-flight refreshes detect a concurrent logout. */
  getTokenGeneration(): number {
    return generation
  },
  clear(): void {
    if (typeof window === "undefined") return
    generation++
    for (const store of [window.localStorage, window.sessionStorage]) {
      store.removeItem(ACCESS_KEY)
      store.removeItem(REFRESH_KEY)
    }
  },
}
