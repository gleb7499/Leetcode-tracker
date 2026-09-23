import { act, render, renderHook, screen, waitFor } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AuthAwareFallbackRoute, AuthRouteGuard } from "@/src/shared/components/auth-route-guard"
import { AUTH_TEST_ENV } from "@/src/shared/config/auth-test-env"
import { authApi, type AuthPayload, type UserDto } from "@/src/shared/api/auth"
import {
  __resetSessionForTests,
  clearPendingVerification,
  clearSession,
} from "@/src/shared/api/session-store"
import { tokenStorage } from "@/src/shared/api/tokens"
import { ApiError } from "@/src/shared/api/client"
import { useAuth, type AuthActionResult } from "@/src/shared/hooks/useAuth"

vi.mock("@/src/shared/api/auth", () => ({
  authApi: {
    register: vi.fn(),
    requestEmailVerification: vi.fn(),
    confirmEmailVerification: vi.fn(),
    login: vi.fn(),
    fetchMe: vi.fn(),
    logout: vi.fn(),
  },
}))

const mockedAuthApi = vi.mocked(authApi)

const TEST_USER_NAME = "QA User"
const TEST_EMAIL = AUTH_TEST_ENV.email
const TEST_PASSWORD = AUTH_TEST_ENV.password
const TEST_CODE = AUTH_TEST_ENV.code

function assertTestEnvReady() {
  if (!TEST_EMAIL || !TEST_PASSWORD || !TEST_CODE) {
    throw new Error("VITE_AUTH_TEST_EMAIL, VITE_AUTH_TEST_PASSWORD and VITE_AUTH_TEST_CODE must be set")
  }
}

function makeUser(): UserDto {
  return { id: 7, email: TEST_EMAIL, name: TEST_USER_NAME, emailVerified: true }
}

function makeAuthPayload(): AuthPayload {
  return {
    success: true,
    message: "OK",
    user: makeUser(),
    accessToken: "access-token",
    refreshToken: "refresh-token",
  }
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

// Live test against a real backend; runs only when the QA env vars are set
// (locally via .env). In CI they are absent — skip, not fail.
const hasLiveTestEnv = Boolean(TEST_EMAIL && TEST_PASSWORD && TEST_CODE)

describe.skipIf(!hasLiveTestEnv)("auth verification flow against the API", () => {
  beforeEach(() => {
    assertTestEnvReady()
    vi.resetAllMocks()
    localStorage.clear()
    sessionStorage.clear()
    __resetSessionForTests()
    clearSession()
    clearPendingVerification()
    mockedAuthApi.fetchMe.mockRejectedValue(new Error("no session"))
  })

  afterEach(() => {
    clearSession()
    clearPendingVerification()
  })

  it("keeps account pending after register until the OTP is confirmed", async () => {
    mockedAuthApi.register.mockResolvedValue({
      success: true,
      message: "Registration successful. Check your email for the verification code.",
    })
    mockedAuthApi.confirmEmailVerification.mockResolvedValue(makeAuthPayload())

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })

    const registerResult: AuthActionResult = await runAuthAction(
      () => result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD),
    )

    expect(mockedAuthApi.register).toHaveBeenCalledWith(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD)
    expect(registerResult.success).toBe(true)
    expect(registerResult.nextRoute).toBe("/verify-email")
    expect(result.current.currentUser).toBeNull()
    expect(result.current.pendingVerification?.flow).toBe("register")

    const verifyResult: AuthActionResult = await runAuthAction(
      () => result.current.verifyEmailCode(TEST_CODE),
    )

    expect(mockedAuthApi.confirmEmailVerification).toHaveBeenCalledWith(TEST_EMAIL, TEST_CODE)
    expect(verifyResult.success).toBe(true)
    expect(verifyResult.nextRoute).toBe("/")
    expect(result.current.currentUser?.email).toBe(TEST_EMAIL)
    expect(tokenStorage.getAccessToken()).toBe("access-token")
  })

  it("signs in with valid credentials and surfaces API errors", async () => {
    mockedAuthApi.login
      .mockRejectedValueOnce(
        new ApiError(401, "UNAUTHORIZED", "Invalid email or password"),
      )
      .mockResolvedValueOnce(makeAuthPayload())

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })

    const failedResult: AuthActionResult = await runAuthAction(
      () => result.current.login(TEST_EMAIL, "wrong-password", false),
    )
    expect(failedResult.success).toBe(false)
    expect(failedResult.message).toBe("Invalid email or password")

    const successResult: AuthActionResult = await runAuthAction(
      () => result.current.login(TEST_EMAIL, TEST_PASSWORD, true),
    )
    expect(successResult.success).toBe(true)
    expect(successResult.nextRoute).toBe("/")
    expect(result.current.currentUser?.name).toBe(TEST_USER_NAME)
  })

  it("resends the verification code through the API", async () => {
    mockedAuthApi.register.mockResolvedValue({ success: true, message: "OK" })
    mockedAuthApi.requestEmailVerification.mockResolvedValue({
      success: true,
      message: "If the email is registered and unverified, a code has been sent",
    })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })

    await runAuthAction(() => result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD))

    const resendResult: AuthActionResult = await runAuthAction(
      () => result.current.resendEmailVerificationCode(),
    )

    expect(mockedAuthApi.requestEmailVerification).toHaveBeenCalledWith(TEST_EMAIL)
    expect(resendResult.success).toBe(true)
  })

  it("forces wildcard routes back to /verify-email while verification is pending", async () => {
    mockedAuthApi.register.mockResolvedValue({ success: true, message: "OK" })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })

    await runAuthAction(() => result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD))

    renderGuardHarness("/random-path")

    await waitFor(() => {
      expect(screen.getByText("Verify Screen")).toBeInTheDocument()
    })
  })

  it("allows returning to login only after canceling pending verification", async () => {
    mockedAuthApi.register.mockResolvedValue({ success: true, message: "OK" })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })

    await runAuthAction(() => result.current.register(TEST_USER_NAME, TEST_EMAIL, TEST_PASSWORD))

    act(() => {
      result.current.cancelPendingVerification()
    })

    expect(result.current.authStage).toBe("anonymous")

    renderGuardHarness("/verify-email")

    await waitFor(() => {
      expect(screen.getByText("Login Screen")).toBeInTheDocument()
    })
  })

  it("restores the session from stored tokens via /me", async () => {
    mockedAuthApi.fetchMe.mockResolvedValue({ user: makeUser() })
    tokenStorage.setTokens("access-token", "refresh-token", true)

    const { result } = renderHook(() => useAuth())

    await waitFor(() => {
      expect(result.current.authStage).toBe("authenticated")
    })
    expect(result.current.currentUser?.email).toBe(TEST_EMAIL)
  })

  it("logs out locally and revokes the refresh token on the server", async () => {
    mockedAuthApi.login.mockResolvedValue(makeAuthPayload())
    mockedAuthApi.logout.mockResolvedValue({ success: true, message: "Logout successful" })

    const { result } = renderHook(() => useAuth())
    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })

    await runAuthAction(() => result.current.login(TEST_EMAIL, TEST_PASSWORD, false))

    act(() => {
      result.current.logout()
    })

    await waitFor(() => {
      expect(result.current.authStage).toBe("anonymous")
    })
    expect(tokenStorage.getRefreshToken()).toBeNull()
    await waitFor(() => {
      expect(mockedAuthApi.logout).toHaveBeenCalledWith("refresh-token")
    })
  })
})
