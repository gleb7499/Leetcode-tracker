import { tokenStorage } from "@/src/shared/api/tokens"

const AUTOLOGIN_KEY = "leetcode-tracker.demo.autologin"

/**
 * Signs the visitor in as the demo user on the first visit of a browser tab,
 * so the prototype opens straight into the app. After an explicit sign-out the
 * login screen stays reachable until the tab is closed.
 */
export function prepareDemoSession(): void {
  try {
    if (window.sessionStorage.getItem(AUTOLOGIN_KEY)) return
    window.sessionStorage.setItem(AUTOLOGIN_KEY, "1")
    if (!tokenStorage.hasRefreshToken()) {
      tokenStorage.setTokens("demo-access-token", "demo-refresh-token", true)
    }
  } catch {
    // Storage is blocked: the visitor can still sign in from the login screen.
  }
}
