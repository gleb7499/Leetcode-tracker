import { tokenStorage } from "./tokens"

export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "INTERNAL_ERROR"
  | "NETWORK"

const STATUS_CODES: Record<number, ApiErrorCode> = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  404: "NOT_FOUND",
  409: "CONFLICT",
  422: "VALIDATION_ERROR",
  500: "INTERNAL_ERROR",
}

export class ApiError extends Error {
  readonly status: number
  readonly code: ApiErrorCode
  readonly requestId: string | null

  constructor(status: number, code: ApiErrorCode, message: string, requestId: string | null = null) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export const BASE_URL = (import.meta.env.VITE_API_URL ?? "/api").replace(/\/$/, "")

let onSessionExpired: (() => void) | null = null

/** Called by the auth layer when refresh fails; clears local session state. */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler
}

interface ContractErrorBody {
  code?: unknown
  message?: unknown
  requestId?: unknown
}

async function parseError(response: Response): Promise<ApiError> {
  let body: ContractErrorBody | null = null
  try {
    body = (await response.json()) as ContractErrorBody
  } catch {
    body = null
  }
  const code =
    typeof body?.code === "string" && body.code.length > 0
      ? (body.code as ApiErrorCode)
      : (STATUS_CODES[response.status] ?? "INTERNAL_ERROR")
  const message = typeof body?.message === "string" && body.message ? body.message : "Request failed"
  const requestId = typeof body?.requestId === "string" ? body.requestId : null
  return new ApiError(response.status, code, message, requestId)
}

let refreshInFlight: Promise<boolean> | null = null

async function performRefresh(): Promise<boolean> {
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) return false
  const generationAtStart = tokenStorage.getTokenGeneration()

  const response = await fetch(`${BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  })

  if (!response.ok) return false

  const body = (await response.json()) as {
    accessToken?: unknown
    refreshToken?: unknown
  }
  if (typeof body.accessToken !== "string" || typeof body.refreshToken !== "string") {
    return false
  }

  // A logout (or re-login) cleared the session while the refresh was in
  // flight: drop the rotated pair instead of resurrecting the old session.
  if (tokenStorage.getTokenGeneration() !== generationAtStart) {
    return false
  }

  tokenStorage.rotateTokens(body.accessToken, body.refreshToken)
  return true
}

/** Single-flight token refresh shared by all concurrent 401 retries. */
function refreshTokens(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

export interface ApiFetchOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE"
  body?: unknown
  /** Set false for unauthenticated endpoints (login/register/refresh). Default true. */
  auth?: boolean
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}, retried = false): Promise<T> {
  const { method = "GET", body, auth = true } = options

  const headers: Record<string, string> = {}
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth) {
    const accessToken = tokenStorage.getAccessToken()
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  }

  let response: Response
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, "NETWORK", "Could not reach the server. Check your connection.")
  }

  if (response.status === 401 && auth && !retried && path !== "/v1/auth/refresh") {
    const refreshed = await refreshTokens()
    if (refreshed) {
      return apiFetch<T>(path, options, true)
    }
    tokenStorage.clear()
    onSessionExpired?.()
  }

  if (!response.ok) {
    throw await parseError(response)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
