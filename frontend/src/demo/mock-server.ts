// In-browser stand-in for the backend, used by the GitHub Pages demo.
// The API client calls demoFetch instead of fetch; state lives in localStorage.

import type { AuthPayload, UserDto } from "@/src/shared/api/auth"
import type { RecallStats, StatsSummary, DayWorkload } from "@/src/shared/api/stats"
import type { ReviewPolicyPreset, SettingsPatch, UserSettings } from "@/src/shared/api/settings"
import type { TaskDto } from "@/src/shared/api/tasks"
import {
  DEMO_DB_STORAGE_KEY,
  DEMO_USER_NAME,
  DEMO_VERIFICATION_CODE,
  DEMO_REVIEW_POLICY_PRESETS,
  computeReviewInterval,
  createSeedDb,
  daysBetweenDateStrings,
  localDateString,
  resolvePolicyValues,
  resolveTaskSource,
  shiftDateString,
  type DemoDb,
  type DemoDifficulty,
  type DemoReviewRecord,
  type DemoReviewStatus,
  type DemoScheduleMode,
  type DemoSettingsRecord,
  type DemoTaskRecord,
  type DemoUserRecord,
} from "./seed"

export { DEMO_USER_EMAIL, DEMO_USER_NAME, DEMO_USER_PASSWORD } from "./seed"

const BACKUP_FORMAT = "leetcode-tracker-backup"
const BACKUP_VERSION = 1
const DIFFICULTIES: readonly DemoDifficulty[] = ["EASY", "MEDIUM", "HARD"]
const REVIEW_STATUSES: readonly DemoReviewStatus[] = ["forgot", "partial", "remember"]
const SCHEDULE_MODES: readonly DemoScheduleMode[] = ["spaced_repetition", "disabled"]
const SOURCE_TYPES = ["leetcode_url", "manual"] as const
const MAX_WORKLOAD_DAYS = 90

// ---------------------------------------------------------------------------
// Latency
// ---------------------------------------------------------------------------

let latencyMinMs = 150
let latencyMaxMs = 350

/** Sets the artificial response delay; tests pass (0, 0). */
export function setDemoLatency(minMs: number, maxMs: number): void {
  latencyMaxMs = Math.max(0, maxMs)
  latencyMinMs = Math.min(Math.max(0, minMs), latencyMaxMs)
}

function waitForLatency(): Promise<void> {
  const delayMs = latencyMinMs + Math.random() * (latencyMaxMs - latencyMinMs)
  if (delayMs <= 0) {
    return Promise.resolve()
  }
  return new Promise((resolve) => setTimeout(resolve, delayMs))
}

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------

let memoryDb: DemoDb | null = null

function getStorage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage
  } catch {
    return null
  }
}

function loadDb(): DemoDb {
  const storage = getStorage()
  if (!storage) {
    memoryDb ??= createSeedDb()
    return memoryDb
  }
  let raw: string | null
  try {
    raw = storage.getItem(DEMO_DB_STORAGE_KEY)
  } catch {
    memoryDb ??= createSeedDb()
    return memoryDb
  }
  const parsed = raw === null ? null : parseStoredDb(raw)
  // Seed dates are relative to the day of creation; refresh them so the review queue is never empty.
  if (parsed && parsed.seededOn === localDateString(new Date())) {
    memoryDb = parsed
    return parsed
  }
  const seed = createSeedDb()
  if (parsed) {
    keepAccount(seed, parsed)
  }
  saveDb(seed)
  return seed
}

/** A reseed refreshes the data, not who is signed in. */
function keepAccount(seed: DemoDb, previous: DemoDb): void {
  seed.user.email = previous.user.email
  seed.user.name = previous.user.name
}

function saveDb(db: DemoDb): void {
  memoryDb = db
  const storage = getStorage()
  if (!storage) {
    return
  }
  try {
    storage.setItem(DEMO_DB_STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Storage is full or blocked: the demo keeps working from memory.
  }
}

/** Test and reset hook: restores the seed database. */
export function resetDemoData(): void {
  const seed = createSeedDb()
  keepAccount(seed, loadDb())
  saveDb(seed)
}

function parseStoredDb(raw: string): DemoDb | null {
  try {
    const value: unknown = JSON.parse(raw)
    return isDemoDb(value) ? value : null
  } catch {
    return null
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isDemoDb(value: unknown): value is DemoDb {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.user) || !isRecord(value.settings)) {
    return false
  }
  const { user, settings } = value
  return (
    typeof user.id === "number" &&
    typeof user.email === "string" &&
    typeof user.name === "string" &&
    typeof value.nextTaskId === "number" &&
    typeof settings.dailyGoal === "number" &&
    typeof settings.reviewTime === "string" &&
    Array.isArray(value.tasks) &&
    value.tasks.every(isDemoTask)
  )
}

function isDemoTask(value: unknown): value is DemoTaskRecord {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    typeof value.identityKey === "string" &&
    typeof value.name === "string" &&
    typeof value.nextReviewDate === "string" &&
    Array.isArray(value.topics) &&
    Array.isArray(value.reviews) &&
    value.reviews.every((review) => isRecord(review) && typeof review.date === "string" && typeof review.status === "string")
  )
}

// ---------------------------------------------------------------------------
// Errors and responses
// ---------------------------------------------------------------------------

class DemoHttpError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = "DemoHttpError"
    this.status = status
    this.code = code
  }
}

function badRequest(message: string): never {
  throw new DemoHttpError(400, "BAD_REQUEST", message)
}

function unauthorized(): never {
  throw new DemoHttpError(401, "UNAUTHORIZED", "Missing or invalid session")
}

function notFound(message: string): never {
  throw new DemoHttpError(404, "NOT_FOUND", message)
}

function validation(message: string): never {
  throw new DemoHttpError(422, "VALIDATION_ERROR", message)
}

function createRequestId(): string {
  return `demo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

function jsonResponse(status: number, body: unknown, requestId: string, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-Request-Id": requestId,
      ...extraHeaders,
    },
  })
}

function noContentResponse(requestId: string): Response {
  return new Response(null, { status: 204, headers: { "X-Request-Id": requestId } })
}

function errorResponse(status: number, code: string, message: string, requestId: string): Response {
  return jsonResponse(status, { code, message, requestId }, requestId)
}

// ---------------------------------------------------------------------------
// Request parsing
// ---------------------------------------------------------------------------

interface RequestContext {
  method: string
  path: string
  query: URLSearchParams
  body: unknown
  authorization: string | null
  requestId: string
}

function splitApiUrl(url: string): { path: string; query: URLSearchParams } | null {
  const start = url.indexOf("/v1/")
  if (start === -1) {
    return null
  }
  const rest = url.slice(start).split("#")[0]
  const queryStart = rest.indexOf("?")
  const path = queryStart === -1 ? rest : rest.slice(0, queryStart)
  const search = queryStart === -1 ? "" : rest.slice(queryStart + 1)
  return { path: path.replace(/\/+$/, ""), query: new URLSearchParams(search) }
}

function readHeader(headers: HeadersInit | undefined, name: string): string | null {
  if (!headers) {
    return null
  }
  const wanted = name.toLowerCase()
  if (headers instanceof Headers) {
    return headers.get(name)
  }
  if (Array.isArray(headers)) {
    const entry = headers.find(([key]) => key.toLowerCase() === wanted)
    return entry ? entry[1] : null
  }
  const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === wanted)
  return entry ? entry[1] : null
}

function readJsonBody(init: RequestInit): unknown {
  const raw = init.body
  if (raw === undefined || raw === null || raw === "") {
    return undefined
  }
  if (typeof raw !== "string") {
    badRequest("Malformed or invalid request body")
  }
  try {
    return JSON.parse(raw) as unknown
  } catch {
    badRequest("Malformed or invalid request body")
  }
}

function requireObject(body: unknown): Record<string, unknown> {
  if (!isRecord(body)) {
    badRequest("Malformed or invalid request body")
  }
  return body
}

function requiredText(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    validation(message)
  }
  return value
}

function optionalText(value: unknown, field: string): string | null {
  if (value === undefined || value === null) {
    return null
  }
  if (typeof value !== "string") {
    validation(`${field} must be a string`)
  }
  return value
}

function optionalBoolean(value: unknown, field: string): boolean | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  if (typeof value !== "boolean") {
    validation(`${field} must be a boolean`)
  }
  return value
}

function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value)
}

function parseDifficulty(value: unknown): DemoDifficulty {
  const text = requiredText(value, "Difficulty is required").trim().toUpperCase()
  if (!isOneOf(DIFFICULTIES, text)) {
    validation("Difficulty must be one of: EASY, MEDIUM, HARD")
  }
  return text
}

function parseTopics(value: unknown): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value)) {
    validation("Topics must be a list of strings")
  }
  const seen = new Set<string>()
  const topics: string[] = []
  for (const raw of value) {
    if (raw === null || raw === undefined) {
      continue
    }
    if (typeof raw !== "string") {
      validation("Topics must be a list of strings")
    }
    const topic = raw.trim()
    if (topic.length > 128) {
      validation("Topic must be at most 128 characters")
    }
    if (topic === "" || seen.has(topic.toLowerCase())) {
      continue
    }
    seen.add(topic.toLowerCase())
    topics.push(topic)
  }
  return topics
}

function parseScheduleMode(value: unknown): DemoScheduleMode {
  if (value === undefined || value === null) {
    return "spaced_repetition"
  }
  if (typeof value !== "string") {
    validation("Schedule mode must be one of: spaced_repetition, disabled")
  }
  const mode = value.trim()
  if (mode === "") {
    return "spaced_repetition"
  }
  if (!isOneOf(SCHEDULE_MODES, mode)) {
    validation("Schedule mode must be one of: spaced_repetition, disabled")
  }
  return mode
}

function parseReviewStatus(value: unknown): DemoReviewStatus {
  const text = requiredText(value, "Status is required").trim().toLowerCase()
  if (!isOneOf(REVIEW_STATUSES, text)) {
    validation("Status must be one of: forgot, partial, remember")
  }
  return text
}

function parseTaskId(raw: string): number {
  if (!/^\d+$/.test(raw)) {
    notFound("Task not found")
  }
  return Number(raw)
}

function findTask(db: DemoDb, id: number): DemoTaskRecord {
  const task = db.tasks.find((item) => item.id === id)
  if (!task) {
    notFound("Task not found")
  }
  return task
}

// ---------------------------------------------------------------------------
// DTO mapping
// ---------------------------------------------------------------------------

function toUserDto(user: DemoUserRecord): UserDto {
  return { id: user.id, email: user.email, name: user.name, emailVerified: user.emailVerified }
}

function toTaskDto(task: DemoTaskRecord): TaskDto {
  return {
    id: task.id,
    name: task.name,
    url: task.url,
    difficulty: task.difficulty,
    topics: [...task.topics],
    notes: task.notes,
    source: task.sourceType,
    sourceMeta: task.sourceMeta,
    scheduleMode: task.scheduleMode,
    createdAt: task.createdAt,
    nextReview: task.nextReviewDate,
    reviews: task.reviews.map((review) => ({ date: review.date, status: review.status })),
  }
}

function toSettingsDto(db: DemoDb): UserSettings {
  const settings = db.settings
  return {
    userId: db.user.id,
    reviewPolicyPresetId: settings.reviewPolicyPresetId,
    notificationsEnabled: settings.notificationsEnabled,
    soundEffectsEnabled: settings.soundEffectsEnabled,
    dailyGoal: settings.dailyGoal,
    reviewTime: settings.reviewTime,
    updatedAt: settings.updatedAt,
  }
}

function sortByNextReview(tasks: DemoTaskRecord[]): DemoTaskRecord[] {
  return [...tasks].sort((a, b) => a.nextReviewDate.localeCompare(b.nextReviewDate) || a.id - b.id)
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

/** Entry point with the fetch signature. Accepts the same URLs the API client builds. */
export async function demoFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const requestId = createRequestId()
  await waitForLatency()
  try {
    return dispatch(url, init, requestId)
  } catch (error) {
    if (error instanceof DemoHttpError) {
      return errorResponse(error.status, error.code, error.message, requestId)
    }
    return errorResponse(500, "INTERNAL_ERROR", "Unexpected demo failure", requestId)
  }
}

function dispatch(url: string, init: RequestInit, requestId: string): Response {
  const api = splitApiUrl(url)
  if (!api) {
    notFound("Route not found")
  }
  const ctx: RequestContext = {
    method: (init.method ?? "GET").toUpperCase(),
    path: api.path,
    query: api.query,
    body: readJsonBody(init),
    authorization: readHeader(init.headers, "Authorization"),
    requestId,
  }
  const { method, path } = ctx

  if (path.startsWith("/v1/auth/")) {
    return dispatchAuth(ctx)
  }
  if (path === "/v1/review-policies" && method === "GET") {
    return jsonResponse(200, DEMO_REVIEW_POLICY_PRESETS satisfies ReviewPolicyPreset[], requestId)
  }
  if (path === "/v1/me" || path.startsWith("/v1/me/")) {
    requireSession(ctx)
    return dispatchMe(ctx)
  }
  return notFound("Route not found")
}

function requireSession(ctx: RequestContext): void {
  if (!ctx.authorization || !/^Bearer\s+\S+$/i.test(ctx.authorization)) {
    unauthorized()
  }
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

function createOpaqueToken(prefix: string): string {
  return `demo-${prefix}-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`
}

/** Signs the demo user in; the requested email becomes the account email (any email is accepted). */
function sessionResponse(ctx: RequestContext, email: string, message: string): Response {
  const db = loadDb()
  db.user.email = email
  db.user.emailVerified = true
  saveDb(db)
  const payload: AuthPayload = {
    success: true,
    message,
    user: toUserDto(db.user),
    accessToken: createOpaqueToken("access"),
    refreshToken: createOpaqueToken("refresh"),
  }
  return jsonResponse(200, payload, ctx.requestId)
}

/** "alex.smith+demo@mail.com" -> "Alex Smith"; used when signing in without registering. */
function nameFromEmail(email: string): string {
  const words = (email.split("@")[0] ?? "").split(/[^a-z]+/i).filter(Boolean)
  return words.length > 0 ? words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") : DEMO_USER_NAME
}

/** Registration name wins; otherwise a new email gets a name derived from it. */
function applyAccountName(email: string): void {
  const db = loadDb()
  if (db.pendingName?.email === email) {
    db.user.name = db.pendingName.name
  } else if (db.user.email !== email) {
    db.user.name = nameFromEmail(email)
  }
  delete db.pendingName
  saveDb(db)
}

function neutralMessage(ctx: RequestContext, message: string): Response {
  return jsonResponse(200, { success: true, message }, ctx.requestId)
}

function dispatchAuth(ctx: RequestContext): Response {
  const { method, path, requestId } = ctx
  const subpath = path.slice("/v1/auth/".length)

  if (subpath === "me" && method === "GET") {
    requireSession(ctx)
    return jsonResponse(200, { success: true, message: "ok", user: toUserDto(loadDb().user) }, requestId)
  }

  if (method !== "POST") {
    return notFound("Route not found")
  }

  switch (subpath) {
    case "login": {
      const body = requireObject(ctx.body)
      const email = requiredText(body.email, "Email is required").trim().toLowerCase()
      requiredText(body.password, "Password is required")
      return sessionResponse(ctx, email, "Signed in")
    }
    case "register": {
      const body = requireObject(ctx.body)
      const name = requiredText(body.name, "Name is required").trim()
      if (name.length > 128) {
        validation("Name must be between 1 and 128 characters")
      }
      const email = requiredText(body.email, "Email is required").trim().toLowerCase()
      const password = requiredText(body.password, "Password is required")
      if (password.length < 8 || password.length > 128) {
        validation("Password must be between 8 and 128 characters")
      }
      const db = loadDb()
      db.pendingName = { email, name }
      saveDb(db)
      const user: UserDto = { id: db.user.id, email, name, emailVerified: false }
      return jsonResponse(
        201,
        { success: true, message: "Account created. Enter the verification code sent to your email.", user },
        requestId,
      )
    }
    case "verify-email/request": {
      const body = requireObject(ctx.body)
      requiredText(body.email, "Email is required")
      return neutralMessage(ctx, "If the address is registered, a verification code has been sent.")
    }
    case "verify-email/confirm": {
      const body = requireObject(ctx.body)
      const email = requiredText(body.email, "Email is required").trim().toLowerCase()
      const code = requiredText(body.code, "Verification code is required").trim()
      if (code !== DEMO_VERIFICATION_CODE) {
        badRequest("Invalid or expired code")
      }
      applyAccountName(email)
      return sessionResponse(ctx, email, "Email verified")
    }
    case "refresh": {
      const body = requireObject(ctx.body)
      requiredText(body.refreshToken, "Refresh token is required")
      const db = loadDb()
      const payload: AuthPayload = {
        success: true,
        message: "Token refreshed",
        user: toUserDto(db.user),
        accessToken: createOpaqueToken("access"),
        refreshToken: createOpaqueToken("refresh"),
      }
      return jsonResponse(200, payload, requestId)
    }
    case "logout":
      return neutralMessage(ctx, "Signed out")
    case "forgot-password": {
      const body = requireObject(ctx.body)
      requiredText(body.email, "Email is required")
      return neutralMessage(ctx, "If the address is registered, a reset code has been sent.")
    }
    case "reset-password": {
      const body = requireObject(ctx.body)
      requiredText(body.email, "Email is required")
      requiredText(body.code, "Reset code is required")
      const password = requiredText(body.newPassword, "New password is required")
      if (password.length < 8 || password.length > 128) {
        validation("Password must be between 8 and 128 characters")
      }
      return neutralMessage(ctx, "Password has been reset")
    }
    default:
      return notFound("Route not found")
  }
}

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

function listTasks(ctx: RequestContext): Response {
  const db = loadDb()
  return jsonResponse(200, sortByNextReview(db.tasks).map(toTaskDto), ctx.requestId)
}

function todayTasks(ctx: RequestContext): Response {
  const db = loadDb()
  const today = localDateString(new Date())
  const due = db.tasks.filter(
    (task) => task.scheduleMode === "spaced_repetition" && task.nextReviewDate <= today,
  )
  return jsonResponse(200, sortByNextReview(due).map(toTaskDto), ctx.requestId)
}

function createTask(ctx: RequestContext): Response {
  const body = requireObject(ctx.body)
  const name = requiredText(body.name, "Name is required").trim()
  if (name.length > 512) {
    validation("Name must be at most 512 characters")
  }
  const difficulty = parseDifficulty(body.difficulty)
  const topics = parseTopics(body.topics)
  const notes = optionalText(body.notes, "Notes")
  const scheduleMode = parseScheduleMode(body.scheduleMode)
  const rawUrl = optionalText(body.url, "URL")
  if (rawUrl !== null && rawUrl.length > 1024) {
    validation("URL must be at most 1024 characters")
  }
  const source = resolveTaskSource(rawUrl, name)
  if (!source.ok) {
    validation(source.message)
  }

  const db = loadDb()
  const existing = db.tasks.find((task) => task.identityKey === source.value.identityKey)
  if (existing) {
    return jsonResponse(201, toTaskDto(existing), ctx.requestId)
  }

  const now = new Date()
  const task: DemoTaskRecord = {
    id: db.nextTaskId,
    identityKey: source.value.identityKey,
    name,
    url: source.value.url,
    difficulty,
    topics,
    notes,
    sourceType: source.value.sourceType,
    sourceProblemId: source.value.sourceProblemId,
    sourceMeta: source.value.sourceMeta,
    scheduleMode,
    currentState: "remember",
    createdAt: now.toISOString(),
    lastReviewDate: null,
    nextReviewDate: localDateString(now),
    reviews: [],
  }
  db.nextTaskId += 1
  db.tasks.push(task)
  saveDb(db)
  return jsonResponse(201, toTaskDto(task), ctx.requestId)
}

function updateTask(ctx: RequestContext, taskId: number): Response {
  // As in the backend, null or absent fields leave the stored value unchanged.
  const body = requireObject(ctx.body)
  let notes: string | undefined
  if (body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") {
      validation("Notes must be a string")
    }
    notes = body.notes
  }
  const scheduleMode = body.scheduleMode === undefined || body.scheduleMode === null
    ? undefined
    : parseScheduleMode(body.scheduleMode)

  const db = loadDb()
  const task = findTask(db, taskId)
  if (notes !== undefined) {
    task.notes = notes
  }
  if (scheduleMode !== undefined) {
    task.scheduleMode = scheduleMode
  }
  saveDb(db)
  return jsonResponse(200, toTaskDto(task), ctx.requestId)
}

function recordReview(ctx: RequestContext, taskId: number): Response {
  const body = requireObject(ctx.body)
  const status = parseReviewStatus(body.status)

  const db = loadDb()
  const task = findTask(db, taskId)
  const today = localDateString(new Date())
  const policy = resolvePolicyValues(db.settings.reviewPolicyPresetId, status)
  const currentInterval = task.lastReviewDate && task.nextReviewDate
    ? daysBetweenDateStrings(task.lastReviewDate, task.nextReviewDate)
    : 0
  const interval = computeReviewInterval(status, policy, currentInterval)
  const nextReview = shiftDateString(today, interval)

  task.currentState = status
  task.lastReviewDate = today
  task.nextReviewDate = nextReview
  task.reviews.push({
    reviewedAt: new Date().toISOString(),
    date: today,
    status,
    intervalDays: interval,
    nextReview,
  })
  saveDb(db)
  return jsonResponse(200, toTaskDto(task), ctx.requestId)
}

function deleteTask(ctx: RequestContext, taskId: number): Response {
  const db = loadDb()
  const remaining = db.tasks.filter((task) => task.id !== taskId)
  if (remaining.length !== db.tasks.length) {
    db.tasks = remaining
    saveDb(db)
  }
  return noContentResponse(ctx.requestId)
}

function dispatchTasks(ctx: RequestContext, rest: string): Response {
  const { method, requestId } = ctx
  if (rest === "") {
    if (method === "GET") return listTasks(ctx)
    if (method === "POST") return createTask(ctx)
    return notFound("Route not found")
  }
  if (rest === "today" && method === "GET") {
    return todayTasks(ctx)
  }
  const reviewMatch = /^([^/]+)\/reviews$/.exec(rest)
  if (reviewMatch && method === "POST") {
    return recordReview(ctx, parseTaskId(reviewMatch[1]))
  }
  if (/^[^/]+$/.test(rest)) {
    const taskId = parseTaskId(rest)
    if (method === "GET") {
      return jsonResponse(200, toTaskDto(findTask(loadDb(), taskId)), requestId)
    }
    if (method === "PUT") return updateTask(ctx, taskId)
    if (method === "DELETE") return deleteTask(ctx, taskId)
  }
  return notFound("Route not found")
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

function computeStreakDays(db: DemoDb, today: string): number {
  const reviewDays = new Set<string>()
  for (const task of db.tasks) {
    for (const review of task.reviews) {
      reviewDays.add(review.date)
    }
  }
  if (reviewDays.size === 0) {
    return 0
  }
  let cursor = reviewDays.has(today) ? today : shiftDateString(today, -1)
  let streak = 0
  while (reviewDays.has(cursor)) {
    streak += 1
    cursor = shiftDateString(cursor, -1)
  }
  return streak
}

function allReviews(db: DemoDb): DemoReviewRecord[] {
  return db.tasks.flatMap((task) => task.reviews)
}

function parseWorkloadDays(raw: string | null): number {
  if (raw === null) {
    return 7
  }
  const days = Number(raw)
  if (!/^\d+$/.test(raw) || days < 1 || days > MAX_WORKLOAD_DAYS) {
    validation(`days must be between 1 and ${MAX_WORKLOAD_DAYS}`)
  }
  return days
}

function dispatchStats(ctx: RequestContext, rest: string): Response {
  const { method, requestId } = ctx
  if (method !== "GET") {
    return notFound("Route not found")
  }
  const db = loadDb()
  const today = localDateString(new Date())

  if (rest === "") {
    const summary: StatsSummary = {
      totalTasks: db.tasks.length,
      activeTasks: db.tasks.filter((task) => task.scheduleMode === "spaced_repetition").length,
      reviewedTasks: db.tasks.filter((task) => task.reviews.length > 0).length,
      totalReviews: allReviews(db).length,
      streakDays: computeStreakDays(db, today),
    }
    return jsonResponse(200, summary, requestId)
  }
  if (rest === "difficulty") {
    const counts = DIFFICULTIES.map((difficulty) => ({
      difficulty,
      count: db.tasks.filter((task) => task.difficulty === difficulty).length,
    }))
    return jsonResponse(200, counts, requestId)
  }
  if (rest === "sources") {
    const counts = new Map<string, number>()
    for (const task of db.tasks) {
      counts.set(task.sourceType, (counts.get(task.sourceType) ?? 0) + 1)
    }
    const sources = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([source, count]) => ({ source, count }))
    return jsonResponse(200, sources, requestId)
  }
  if (rest === "recall") {
    const reviews = allReviews(db)
    const count = (status: DemoReviewStatus): number => reviews.filter((review) => review.status === status).length
    const recall: RecallStats = {
      forgot: count("forgot"),
      partial: count("partial"),
      remember: count("remember"),
      total: reviews.length,
    }
    return jsonResponse(200, recall, requestId)
  }
  if (rest === "workload") {
    const days = parseWorkloadDays(ctx.query.get("days"))
    const workload: DayWorkload[] = []
    for (let offset = 0; offset < days; offset += 1) {
      const date = shiftDateString(today, offset)
      workload.push({
        date,
        count: db.tasks.filter(
          (task) => task.scheduleMode === "spaced_repetition" && task.nextReviewDate === date,
        ).length,
      })
    }
    return jsonResponse(200, workload, requestId)
  }
  return notFound("Route not found")
}

// ---------------------------------------------------------------------------
// Settings, account and backup
// ---------------------------------------------------------------------------

function patchSettings(ctx: RequestContext): Response {
  const body = requireObject(ctx.body)
  const patch = readSettingsPatch(body)
  const db = loadDb()
  applySettingsPatch(db.settings, patch)
  saveDb(db)
  return jsonResponse(200, toSettingsDto(db), ctx.requestId)
}

/** Validates the whole patch before anything is applied. */
function readSettingsPatch(body: Record<string, unknown>): SettingsPatch {
  const patch: SettingsPatch = {}
  const presetValue = body.reviewPolicyPresetId
  if (presetValue !== undefined && presetValue !== null) {
    if (typeof presetValue !== "number" || !Number.isInteger(presetValue)) {
      validation("Review policy preset id must be an integer")
    }
    if (presetValue !== 0 && !DEMO_REVIEW_POLICY_PRESETS.some((preset) => preset.id === presetValue)) {
      validation("Unknown review policy preset")
    }
    patch.reviewPolicyPresetId = presetValue
  }
  const notificationsEnabled = optionalBoolean(body.notificationsEnabled, "notificationsEnabled")
  const soundEffectsEnabled = optionalBoolean(body.soundEffectsEnabled, "soundEffectsEnabled")
  if (notificationsEnabled !== undefined) patch.notificationsEnabled = notificationsEnabled
  if (soundEffectsEnabled !== undefined) patch.soundEffectsEnabled = soundEffectsEnabled
  const dailyGoal = body.dailyGoal
  if (dailyGoal !== undefined && dailyGoal !== null) {
    if (typeof dailyGoal !== "number" || !Number.isInteger(dailyGoal) || dailyGoal < 1 || dailyGoal > 100) {
      validation("Daily goal must be between 1 and 100")
    }
    patch.dailyGoal = dailyGoal
  }
  const reviewTime = body.reviewTime
  if (reviewTime !== undefined && reviewTime !== null) {
    if (typeof reviewTime !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(reviewTime)) {
      validation("Review time must be in HH:mm format")
    }
    patch.reviewTime = reviewTime
  }
  return patch
}

function applySettingsPatch(settings: DemoSettingsRecord, patch: SettingsPatch): void {
  if (patch.reviewPolicyPresetId !== undefined) {
    settings.reviewPolicyPresetId = patch.reviewPolicyPresetId === 0 ? null : patch.reviewPolicyPresetId
  }
  if (patch.notificationsEnabled !== undefined) settings.notificationsEnabled = patch.notificationsEnabled
  if (patch.soundEffectsEnabled !== undefined) settings.soundEffectsEnabled = patch.soundEffectsEnabled
  if (patch.dailyGoal !== undefined) settings.dailyGoal = patch.dailyGoal
  if (patch.reviewTime !== undefined) settings.reviewTime = `${patch.reviewTime}:00`
  settings.updatedAt = new Date().toISOString()
}

interface BackupTaskFile {
  identityKey: string
  title: string
  link: string | null
  sourceType: string
  sourceProblemId: string | null
  sourceMeta: string | null
  difficulty: string
  topics: string[]
  notes: string | null
  scheduleMode: string | null
  currentState: string | null
  lastReviewDate: string | null
  nextReviewDate: string | null
  createdAt: string | null
  reviews: { state: string; reviewedAt: string; intervalDays: number; nextReviewDate: string | null; reviewText: string | null }[]
}

interface BackupFile {
  format: string
  version: number
  exportedAt: string
  user: { email: string; name: string; createdAt: string }
  settings: {
    reviewPolicyPresetCode: string | null
    notificationsEnabled: boolean
    soundEffectsEnabled: boolean
    dailyGoal: number
    reviewTime: string
  }
  tasks: BackupTaskFile[]
}

function buildBackup(db: DemoDb, now: Date): BackupFile {
  const presetId = db.settings.reviewPolicyPresetId
  const preset = DEMO_REVIEW_POLICY_PRESETS.find((item) => item.id === presetId)
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    user: { email: db.user.email, name: db.user.name, createdAt: db.user.createdAt },
    settings: {
      reviewPolicyPresetCode: preset?.code ?? null,
      notificationsEnabled: db.settings.notificationsEnabled,
      soundEffectsEnabled: db.settings.soundEffectsEnabled,
      dailyGoal: db.settings.dailyGoal,
      reviewTime: db.settings.reviewTime,
    },
    tasks: db.tasks.map((task) => ({
      identityKey: task.identityKey,
      title: task.name,
      link: task.url,
      sourceType: task.sourceType,
      sourceProblemId: task.sourceProblemId,
      sourceMeta: task.sourceMeta,
      difficulty: task.difficulty,
      topics: [...task.topics],
      notes: task.notes,
      scheduleMode: task.scheduleMode,
      currentState: task.currentState.toUpperCase(),
      lastReviewDate: task.lastReviewDate,
      nextReviewDate: task.nextReviewDate,
      createdAt: task.createdAt,
      reviews: task.reviews.map((review) => ({
        state: review.status.toUpperCase(),
        reviewedAt: review.reviewedAt,
        intervalDays: review.intervalDays,
        nextReviewDate: review.nextReview,
        reviewText: null,
      })),
    })),
  }
}

function isValidDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
}

function validateBackupTask(task: unknown, index: number): void {
  if (!isRecord(task)) {
    validation(`Task #${index} is malformed`)
  }
  const key = task.identityKey
  if (typeof key !== "string" || key.trim() === "" || typeof task.title !== "string" || task.title.trim() === "") {
    validation(`Task #${index} is missing identityKey or title`)
  }
  if (typeof task.difficulty !== "string" || !isOneOf(DIFFICULTIES, task.difficulty.toUpperCase())) {
    validation(`Task "${key}" has unknown difficulty`)
  }
  if (task.scheduleMode !== undefined && task.scheduleMode !== null && !isOneOf(SCHEDULE_MODES, task.scheduleMode)) {
    validation(`Task "${key}" has unknown scheduleMode`)
  }
  if (task.currentState !== undefined && task.currentState !== null && !isBackupStatus(task.currentState)) {
    validation(`Task "${key}" has unknown currentState`)
  }
  if (task.reviews === undefined || task.reviews === null) {
    return
  }
  if (!Array.isArray(task.reviews)) {
    validation(`Task "${key}" has malformed reviews`)
  }
  for (const review of task.reviews) {
    if (!isRecord(review) || !isBackupStatus(review.state) || !isValidDate(review.reviewedAt)) {
      validation(`Task "${key}" has a review with unknown state or no date`)
    }
  }
}

function isBackupStatus(value: unknown): boolean {
  return typeof value === "string" && isOneOf(REVIEW_STATUSES, value.trim().toLowerCase())
}

function parseBackup(raw: unknown): BackupFile {
  if (!isRecord(raw) || raw.format !== BACKUP_FORMAT || raw.version !== BACKUP_VERSION) {
    validation("Not a leetcode-tracker backup file (format/version mismatch)")
  }
  const tasks: unknown = raw.tasks
  if (!Array.isArray(tasks)) {
    validation("Backup has no tasks section")
  }
  tasks.forEach((task: unknown, index: number) => validateBackupTask(task, index))
  return raw as unknown as BackupFile
}

function applyBackupTask(db: DemoDb, backup: BackupTaskFile): void {
  const today = localDateString(new Date())
  let task = db.tasks.find((item) => item.identityKey === backup.identityKey)
  if (!task) {
    const sourceType = SOURCE_TYPES.find((item) => item === backup.sourceType) ?? "manual"
    task = {
      id: db.nextTaskId,
      identityKey: backup.identityKey,
      name: backup.title.trim(),
      url: backup.link ?? null,
      difficulty: backup.difficulty.toUpperCase() as DemoDifficulty,
      topics: [...(backup.topics ?? [])],
      notes: null,
      sourceType,
      sourceProblemId: backup.sourceProblemId ?? backup.identityKey,
      sourceMeta: backup.sourceMeta ?? null,
      scheduleMode: "spaced_repetition",
      currentState: "remember",
      createdAt: backup.createdAt ?? new Date().toISOString(),
      lastReviewDate: null,
      nextReviewDate: today,
      reviews: [],
    }
    db.nextTaskId += 1
    db.tasks.push(task)
  }

  const currentState = backup.currentState?.trim().toLowerCase()
  task.currentState = isOneOf(REVIEW_STATUSES, currentState) ? currentState : task.currentState
  task.lastReviewDate = backup.lastReviewDate ?? null
  task.nextReviewDate = backup.nextReviewDate ?? today
  task.notes = backup.notes ?? null
  task.scheduleMode = isOneOf(SCHEDULE_MODES, backup.scheduleMode) ? backup.scheduleMode : "spaced_repetition"

  for (const review of backup.reviews ?? []) {
    const status = review.state.trim().toLowerCase()
    if (!isOneOf(REVIEW_STATUSES, status)) {
      continue
    }
    const reviewedAt = new Date(review.reviewedAt).toISOString()
    const duplicate = task.reviews.some(
      (item) => item.status === status && item.reviewedAt === reviewedAt,
    )
    if (duplicate) {
      continue
    }
    task.reviews.push({
      reviewedAt,
      date: localDateString(new Date(reviewedAt)),
      status,
      intervalDays: Math.max(1, review.intervalDays),
      nextReview: review.nextReviewDate ?? today,
    })
  }
  task.reviews.sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt))
}

function applyBackupSettings(settings: DemoSettingsRecord, backup: BackupFile["settings"] | undefined): void {
  if (!backup) {
    return
  }
  if (backup.reviewPolicyPresetCode !== undefined) {
    const preset = DEMO_REVIEW_POLICY_PRESETS.find((item) => item.code === backup.reviewPolicyPresetCode)
    settings.reviewPolicyPresetId = preset ? preset.id : null
  }
  if (typeof backup.notificationsEnabled === "boolean") settings.notificationsEnabled = backup.notificationsEnabled
  if (typeof backup.soundEffectsEnabled === "boolean") settings.soundEffectsEnabled = backup.soundEffectsEnabled
  if (typeof backup.dailyGoal === "number" && backup.dailyGoal > 0) {
    settings.dailyGoal = Math.min(100, backup.dailyGoal)
  }
  if (typeof backup.reviewTime === "string") settings.reviewTime = backup.reviewTime
  settings.updatedAt = new Date().toISOString()
}

function exportBackup(ctx: RequestContext): Response {
  const backup = buildBackup(loadDb(), new Date())
  return jsonResponse(200, backup, ctx.requestId, {
    "Content-Disposition": 'attachment; filename="leetcode-tracker-backup.json"',
  })
}

function importBackup(ctx: RequestContext): Response {
  const backup = parseBackup(ctx.body)
  const db = loadDb()
  applyBackupSettings(db.settings, backup.settings)
  for (const task of backup.tasks) {
    applyBackupTask(db, task)
  }
  saveDb(db)
  return jsonResponse(200, { success: true, message: "Backup imported" }, ctx.requestId)
}

function changePassword(ctx: RequestContext): Response {
  const body = requireObject(ctx.body)
  requiredText(body.currentPassword, "Current password is required")
  requiredText(body.newPassword, "New password is required")
  return jsonResponse(200, { success: true, message: "Password changed" }, ctx.requestId)
}

function deleteAccount(ctx: RequestContext): Response {
  const body = requireObject(ctx.body)
  requiredText(body.password, "Password confirmation is required")
  saveDb(createSeedDb())
  return noContentResponse(ctx.requestId)
}

function dispatchMe(ctx: RequestContext): Response {
  const { method, path, requestId } = ctx
  const rest = path === "/v1/me" ? "" : path.slice("/v1/me/".length)

  if (rest === "" && method === "DELETE") return deleteAccount(ctx)
  if (rest === "settings") {
    if (method === "GET") return jsonResponse(200, toSettingsDto(loadDb()), requestId)
    if (method === "PATCH") return patchSettings(ctx)
  }
  if (rest === "backup") {
    if (method === "GET") return exportBackup(ctx)
    if (method === "POST") return importBackup(ctx)
  }
  if (rest === "change-password" && method === "POST") return changePassword(ctx)
  if (rest === "tasks" || rest.startsWith("tasks/")) {
    return dispatchTasks(ctx, rest === "tasks" ? "" : rest.slice("tasks/".length))
  }
  if (rest === "stats" || rest.startsWith("stats/")) {
    return dispatchStats(ctx, rest === "stats" ? "" : rest.slice("stats/".length))
  }
  return notFound("Route not found")
}
