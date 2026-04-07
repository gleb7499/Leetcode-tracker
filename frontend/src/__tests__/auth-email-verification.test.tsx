import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { AuthAwareFallbackRoute, AuthRouteGuard } from "@/src/shared/components/auth-route-guard"
import { AUTH_TEST_ENV } from "@/src/shared/config/auth-test-env"
import { useAuth, type AuthActionResult } from "@/src/shared/hooks/useAuth"

const STORAGE_KEY_PENDING_VERIFICATION = "leetcode-tracker-pending-verification"
const TEST_USER_NAME = "QA User"
const TEST_EMAIL = AUTH_TEST_ENV.email
const TEST_PASSWORD = AUTH_TEST_ENV.password
const TEST_CODE = AUTH_TEST_ENV.code

function assertTestEnvReady() {
  if (!TEST_EMAIL || !TEST_PASSWORD || !TEST_CODE) {
    throw new Error("VITE_AUTH_TEST_EMAIL, VITE_AUTH_TEST_PASSWORD and VITE_AUTH_TEST_CODE must be set")
  }
}

function seedPendingRegistration(email = TEST_EMAIL) {
  localStorage.setItem(
    STORAGE_KEY_PENDING_VERIFICATION,
    JSON.stringify({
      flow: "register",
      email,
      code: TEST_CODE,
      createdAt: Date.now(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      remember: true,
      registerDraft: {
        name: TEST_USER_NAME,
        passwordHash: "mock-hash",
        createdAt: new Date().toISOString(),
      },
    }),
  )
}

function renderGuardHarness(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/login"
          element={
            <AuthRouteGuard route="login">
              <div>Login Screen</div>
            </AuthRouteGuard>
          }
        />
        <Route
          path="/verify-email"
          element={
            <AuthRouteGuard route="verify-email">
              <div>Verify Screen</div>
            </AuthRouteGuard>
          }
        />
        <Route
          path="/"
          element={
            <AuthRouteGuard route="home">
              <div>Home Screen</div>
            </AuthRouteGuard>
          }
        />
        <Route path="*" element={<AuthAwareFallbackRoute />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function runAuthAction<T>(run: () => Promise<T>): Promise<T> {
  let action: Promise<T> | null = null

  await act(async () => {
    action = run()
    await action
  })

  if (!action) {
    throw new Error("auth action did not start")
  }

  return action
}

describe("auth verification security flow", () => {
  beforeEach(() => {
    assertTestEnvReady()
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("keeps account in pending state after register until email is verified", async () => {
    const { result } = renderHook(() => useAuth())

    const registerResult: AuthActionResult = await runAuthAction(
      () => result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD),
    )

    expect(registerResult.success).toBe(true)
    expect(registerResult.nextRoute).toBe("/verify-email")
    expect(result.current.currentUser).toBeNull()
    await waitFor(() => {
      expect(result.current.pendingVerification?.flow).toBe("register")
    })

    const verifyResult: AuthActionResult = await runAuthAction(
      () => result.current.verifyEmailCode(TEST_CODE),
    )

    expect(verifyResult.success).toBe(true)
    expect(verifyResult.nextRoute).toBe("/")

    expect(result.current.currentUser?.email).toBe(TEST_EMAIL)
  })

  it("requires verification on login only when the user enabled the setting", async () => {
    const { result } = renderHook(() => useAuth())

    await runAuthAction(() =>
      result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD),
    )

    await runAuthAction(() => result.current.verifyEmailCode(TEST_CODE))

    act(() => {
      result.current.updateSecuritySettings({ requireEmailCodeOnLogin: true })
      result.current.logout()
    })

    const loginResult: AuthActionResult = await runAuthAction(
      () => result.current.login(TEST_EMAIL, TEST_PASSWORD, false),
    )

    expect(loginResult.success).toBe(true)
    expect(loginResult.nextRoute).toBe("/verify-email")
    expect(result.current.currentUser).toBeNull()
    await waitFor(() => {
      expect(result.current.pendingVerification?.flow).toBe("login")
    })

    const loginVerifyResult: AuthActionResult = await runAuthAction(
      () => result.current.verifyEmailCode(TEST_CODE),
    )

    expect(loginVerifyResult.success).toBe(true)
    expect(loginVerifyResult.nextRoute).toBe("/")

    expect(result.current.currentUser?.email).toBe(TEST_EMAIL)
  })

  it("forces wildcard routes back to /verify-email while verification is pending", async () => {
    seedPendingRegistration()

    renderGuardHarness("/random-path")

    await waitFor(() => {
      expect(screen.getByText("Verify Screen")).toBeInTheDocument()
    })
  })

  it("allows returning to login only after canceling pending verification", async () => {
    const { result } = renderHook(() => useAuth())

    await runAuthAction(() =>
      result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD),
    )

    act(() => {
      result.current.cancelPendingVerification()
    })

    expect(result.current.authStage).toBe("anonymous")

    renderGuardHarness("/verify-email")

    await waitFor(() => {
      expect(screen.getByText("Login Screen")).toBeInTheDocument()
    })
  })
})
