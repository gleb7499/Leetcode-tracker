import { apiFetch } from "./client"
import { tokenStorage } from "./tokens"

export interface UserDto {
  id: number
  email: string
  name: string
  emailVerified: boolean
}

export interface AuthPayload {
  success: boolean
  message: string
  user: UserDto
  accessToken: string
  refreshToken: string
}

export interface MessagePayload {
  success: boolean
  message: string
}

export const authApi = {
  register(name: string, email: string, password: string): Promise<MessagePayload> {
    return apiFetch<MessagePayload>("/v1/auth/register", {
      method: "POST",
      auth: false,
      body: { name, email, password },
    })
  },

  requestEmailVerification(email: string): Promise<MessagePayload> {
    return apiFetch<MessagePayload>("/v1/auth/verify-email/request", {
      method: "POST",
      auth: false,
      body: { email },
    })
  },

  confirmEmailVerification(email: string, code: string): Promise<AuthPayload> {
    return apiFetch<AuthPayload>("/v1/auth/verify-email/confirm", {
      method: "POST",
      auth: false,
      body: { email, code },
    })
  },

  login(email: string, password: string): Promise<AuthPayload> {
    return apiFetch<AuthPayload>("/v1/auth/login", {
      method: "POST",
      auth: false,
      body: { email, password },
    })
  },

  fetchMe(): Promise<{ user: UserDto }> {
    return apiFetch<{ user: UserDto }>("/v1/auth/me")
  },

  logout(refreshToken: string | null): Promise<MessagePayload> {
    return apiFetch<MessagePayload>("/v1/auth/logout", {
      method: "POST",
      // Best effort: if the access token already expired, send the request
      // unauthenticated; the backend revokes the presented refresh token
      // for unauthenticated callers that still provide it.
      auth: Boolean(tokenStorage.getAccessToken()),
      body: refreshToken ? { refreshToken } : {},
    })
  },
}
