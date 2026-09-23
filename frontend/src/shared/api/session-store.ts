import { authApi, type UserDto } from "./auth"
import { setSessionExpiredHandler } from "./client"
import { tokenStorage } from "./tokens"
import type { CurrentUser, PendingVerification } from "../types"

const PENDING_KEY = "leetcode-tracker-pending-verification"

export interface SessionSnapshot {
  currentUser: CurrentUser | null
  pendingVerification: PendingVerification | null
  isInitializing: boolean
}

type Listener = () => void

const listeners = new Set<Listener>()

let currentUser: CurrentUser | null = null
let pendingVerification: PendingVerification | null = loadPending()
let isInitializing = true
let initPromise: Promise<void> | null = null

function loadPending(): PendingVerification | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingVerification
    if (!parsed || typeof parsed.email !== "string" || parsed.flow !== "register") {
      return null
    }
    return { flow: "register", email: parsed.email.toLowerCase() }
  } catch {
    return null
  }
}

function persistPending(pending: PendingVerification | null): void {
  if (typeof window === "undefined") return
  if (pending) {
    window.localStorage.setItem(PENDING_KEY, JSON.stringify(pending))
  } else {
    window.localStorage.removeItem(PENDING_KEY)
  }
}

function emit(): void {
  for (const listener of listeners) listener()
}

export function subscribeSession(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

let cachedSnapshot: SessionSnapshot | null = null

export function getSessionSnapshot(): SessionSnapshot {
  const next: SessionSnapshot = { currentUser, pendingVerification, isInitializing }
  if (
    cachedSnapshot &&
    cachedSnapshot.currentUser === next.currentUser &&
    cachedSnapshot.pendingVerification === next.pendingVerification &&
    cachedSnapshot.isInitializing === next.isInitializing
  ) {
    return cachedSnapshot
  }
  cachedSnapshot = next
  return next
}

function toCurrentUser(dto: UserDto): CurrentUser {
  return {
    id: String(dto.id),
    name: dto.name,
    email: dto.email.toLowerCase(),
    emailVerifiedAt: dto.emailVerified ? new Date().toISOString() : null,
  }
}

/** Restores the session from stored tokens on first call (shared across hook instances). */
export function initializeSession(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      setSessionExpiredHandler(() => {
        clearSession()
      })
      if (tokenStorage.getRefreshToken()) {
        try {
          const { user } = await authApi.fetchMe()
          currentUser = toCurrentUser(user)
        } catch {
          // Unreachable server or dead session: stay anonymous; the API
          // client already cleared tokens when refresh failed.
        }
      }
      isInitializing = false
      emit()
    })()
  }
  return initPromise
}

export function applySession(user: UserDto, tokens: { accessToken: string; refreshToken: string }, remember: boolean): void {
  tokenStorage.setTokens(tokens.accessToken, tokens.refreshToken, remember)
  currentUser = toCurrentUser(user)
  pendingVerification = null
  persistPending(null)
  emit()
}

export function setPendingVerification(pending: PendingVerification): void {
  pendingVerification = pending
  persistPending(pending)
  emit()
}

export function clearPendingVerification(): void {
  pendingVerification = null
  persistPending(null)
  emit()
}

export function clearSession(): void {
  tokenStorage.clear()
  currentUser = null
  emit()
}

/** Test-only reset of module-level session state. */
export function __resetSessionForTests(): void {
  initPromise = null
  isInitializing = true
  currentUser = null
  pendingVerification = null
  cachedSnapshot = null
}
