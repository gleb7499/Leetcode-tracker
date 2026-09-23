import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ApiError, apiFetch, setSessionExpiredHandler } from "@/src/shared/api/client"
import { tokenStorage } from "@/src/shared/api/tokens"

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    setSessionExpiredHandler(null)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    setSessionExpiredHandler(null)
  })

  it("attaches the access token to authenticated requests", async () => {
    tokenStorage.setTokens("access-1", "refresh-1", false)
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await apiFetch("/v1/me/tasks")

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe("/api/v1/me/tasks")
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer access-1")
  })

  it("does not attach a token to unauthenticated requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    await apiFetch("/v1/auth/login", { method: "POST", auth: false, body: {} })

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect("Authorization" in (init.headers as Record<string, string>)).toBe(false)
  })

  it("refreshes the token on 401 and retries the original request once", async () => {
    tokenStorage.setTokens("expired", "refresh-1", false)
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse(401, { code: "UNAUTHORIZED", message: "Missing or invalid session", requestId: "r1" }),
      )
      .mockResolvedValueOnce(
        jsonResponse(200, {
          success: true,
          message: "Token refreshed",
          user: { id: 1, email: "a@b.c", name: "A", emailVerified: true },
          accessToken: "access-2",
          refreshToken: "refresh-2",
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { ok: true }))
    vi.stubGlobal("fetch", fetchMock)

    const result = await apiFetch<{ ok: boolean }>("/v1/me/tasks")

    expect(result.ok).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    const [refreshUrl, refreshInit] = fetchMock.mock.calls[1] as unknown as [string, RequestInit]
    expect(refreshUrl).toBe("/api/v1/auth/refresh")
    expect(JSON.parse(refreshInit.body as string)).toEqual({ refreshToken: "refresh-1" })
    // Retried request carries the rotated access token.
    const [, retryInit] = fetchMock.mock.calls[2] as unknown as [string, RequestInit]
    expect((retryInit.headers as Record<string, string>).Authorization).toBe("Bearer access-2")
    expect(tokenStorage.getAccessToken()).toBe("access-2")
  })

  it("logs out when the refresh also fails with 401", async () => {
    tokenStorage.setTokens("expired", "dead-refresh", false)
    const expiredHandler = vi.fn()
    setSessionExpiredHandler(expiredHandler)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { code: "UNAUTHORIZED", message: "expired" }))
      .mockResolvedValueOnce(jsonResponse(401, { code: "UNAUTHORIZED", message: "invalid refresh" }))
    vi.stubGlobal("fetch", fetchMock)

    await expect(apiFetch("/v1/me/tasks")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      status: 401,
    })
    expect(fetchMock).toHaveBeenCalledTimes(2) // original + one refresh, no second retry
    expect(expiredHandler).toHaveBeenCalledTimes(1)
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it("maps contract error bodies to typed ApiError fields", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(422, { code: "VALIDATION_ERROR", message: "leetcode.com URL must point to a problem", requestId: "req-9" }),
    )
    vi.stubGlobal("fetch", fetchMock)

    const error = (await apiFetch("/v1/me/tasks", { method: "POST", body: {} }).catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(422)
    expect(error.code).toBe("VALIDATION_ERROR")
    expect(error.message).toBe("leetcode.com URL must point to a problem")
    expect(error.requestId).toBe("req-9")
  })

  it("does not store rotated tokens when a logout happened mid-refresh", async () => {
    tokenStorage.setTokens("expired", "refresh-1", false)
    let resolveRefresh: (value: Response) => void = () => {}
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(401, { code: "UNAUTHORIZED", message: "expired" }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveRefresh = resolve
          }),
      )
    vi.stubGlobal("fetch", fetchMock)

    const request = apiFetch("/v1/me/tasks")
    // Simulate a concurrent logout while the refresh request is in flight.
    await Promise.resolve()
    tokenStorage.clear()
    resolveRefresh(
      jsonResponse(200, {
        success: true,
        message: "Token refreshed",
        user: { id: 1, email: "a@b.c", name: "A", emailVerified: true },
        accessToken: "access-late",
        refreshToken: "refresh-late",
      }),
    )

    await expect(request).rejects.toMatchObject({ status: 401 })
    expect(tokenStorage.getAccessToken()).toBeNull()
    expect(tokenStorage.getRefreshToken()).toBeNull()
  })

  it("wraps network failures in a NETWORK ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")))

    const error = (await apiFetch("/v1/me/tasks").catch((e) => e)) as ApiError
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe("NETWORK")
    expect(error.status).toBe(0)
  })
})
