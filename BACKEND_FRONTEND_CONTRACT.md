# Backend/Frontend Contract

This document defines the interaction contract between the React + Vite + TypeScript frontend and the planned Java + Spring backend of LeetCode Tracker.

## Contract levels

- **MVP now**: required for replacing the current browser-storage implementation with a working backend.
- **Phase 2**: useful extensions that do not block the current UI.

## API conventions

| Rule | Value |
|---|---|
| Base prefix | `/api/v1` |
| Payload format | `application/json; charset=utf-8` |
| JSON fields | camelCase |
| Datetime | ISO 8601 UTC |
| Date | `YYYY-MM-DD` |
| Tracing | every response contains `requestId` |

Authentication responses must include `success` and `message`. Successful login, registration, and session checks also return a `user` object with `id`, `email`, and `name`.

## MVP authentication endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/v1/auth/login` | Sign in |
| POST | `/api/v1/auth/register` | Create an account |
| GET | `/api/v1/auth/me` | Resolve the current session |
| POST | `/api/v1/auth/logout` | Sign out |
| POST | `/api/v1/auth/forgot-password` | Request password recovery |
| POST | `/api/v1/auth/verify-email/request` | Request an email verification OTP |
| POST | `/api/v1/auth/verify-email/confirm` | Confirm the OTP; returns a session |
| POST | `/api/v1/auth/refresh` | Rotate the refresh token, get a new token pair |
| POST | `/api/v1/auth/reset-password` | Set a new password with a reset OTP |

The password recovery endpoint must return the same neutral response whether or not the email exists. The same neutrality applies to `verify-email/request`. Login is rejected until the email is verified. `logout` accepts an optional JSON body `{ "refreshToken": "..." }` to revoke a specific refresh token; without a body it revokes all of the user's sessions.

## Task model

The frontend task DTO contains:

- `id`, `name`, `url`, `difficulty`, `topics`, `notes`;
- `createdAt`, `nextReview`;
- `reviews: { date, status }[]`.

Review statuses are `forgot`, `partial`, and `remember`. The frontend sends only the user's self-assessment; the backend is the single source of truth for calculating `nextReview`.

## User task endpoints

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/me/tasks/today` | List tasks due today |
| GET | `/api/v1/me/tasks` | List all tasks in the user's library |
| GET | `/api/v1/me/tasks/{taskId}` | Load a review task |
| POST | `/api/v1/me/tasks` | Add a task to the user's library |
| PUT | `/api/v1/me/tasks/{taskId}` | Update `notes` and `scheduleMode` of the user's task |
| DELETE | `/api/v1/me/tasks/{taskId}` | Remove a task from the user's library |
| POST | `/api/v1/me/tasks/{taskId}/reviews` | Record a review outcome |

Adding a task accepts `name`, `url`, `difficulty`, `topics`, `notes` and an optional `scheduleMode` (`spaced_repetition` by default, `disabled` excludes the task from the review queue). `url` is either a LeetCode problem URL (`https://leetcode.com/problems/<slug>/`, optional `www.` subdomain and trailing path) or any other absolute http(s) link, or absent for a fully manual task; a `leetcode.com` URL that does not point to a problem is rejected with `VALIDATION_ERROR`. The backend derives `source` (`leetcode_url` or `manual`) and `sourceMeta` (the normalized problem URL) from the `url`. Adding a task the user already has is idempotent and returns the existing task. The response task DTO contains `id`, `name`, `url`, `difficulty` (`EASY`/`MEDIUM`/`HARD`), `topics`, `notes`, `source`, `sourceMeta`, `scheduleMode`, `createdAt` (ISO 8601), `nextReview` (`YYYY-MM-DD`) and `reviews: { date, status }[]` (statuses `forgot`, `partial`, `remember`; `date` is `YYYY-MM-DD`).

A newly added task is due on the day it is added (`nextReview` = today). Recording a review accepts `status` (`forgot` | `partial` | `remember`) and returns the updated task with its new schedule and full review history.

Updating a task only touches user-scoped fields (`notes`, `scheduleMode`); the shared problem card is not modified. Deleting a task removes only the user's relationship and is idempotent (repeated deletes return 204; the shared task card is removed only when no user references it).

## Scheduling semantics

- `remember`: increase the interval before the next review (multiply the current interval by the policy growth factor);
- `partial`: keep the current interval;
- `forgot`: reset to the short base interval.

Intervals come from the `review_policies` reference table (per outcome: `base_interval_days`, `growth_factor`, `max_interval_days`; seeded defaults: forgot 1 day, partial base 1 / max 30, remember base 2 / factor 2.0 / max 90) and are clamped to `[1, max_interval_days]`. The first review after adding a task uses the outcome's `base_interval_days`. Every review is recorded in `user_reviews` with the applied interval and the new next review date.

The algorithm remains hidden from the user interface and is calculated entirely by the backend.

## Shared task lifecycle

The backend computes an internal `identityKey` for each problem. Existing tasks are reused instead of duplicated, while `USER_TASKS` stores each user's relationship with the shared task. Removing a task deletes only the user's relationship; the shared task is removed only when no users reference it. Add/remove operations must be transactional, concurrency-safe, and idempotent from the user's perspective.

## Error model

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `BAD_REQUEST` | Invalid request format |
| 401 | `UNAUTHORIZED` | Missing or invalid session |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Duplicate or business conflict |
| 422 | `VALIDATION_ERROR` | Domain validation failed |
| 500 | `INTERNAL_ERROR` | Unexpected backend failure |

## Statistics endpoints

All statistics are scoped to the authenticated user and computed on the fly from `user_tasks` and the review history (`user_reviews`); there is no separate reporting table.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/me/stats` | Summary counters |
| GET | `/api/v1/me/stats/difficulty` | Task counts per difficulty |
| GET | `/api/v1/me/stats/sources` | Task counts per source |
| GET | `/api/v1/me/stats/recall` | Review outcome totals |
| GET | `/api/v1/me/stats/workload?days=N` | Per-day upcoming review counts |

`GET /api/v1/me/stats` returns `{"totalTasks","activeTasks","reviewedTasks","totalReviews","streakDays"}`:

- `totalTasks` — all tasks in the user's library (`user_tasks`).
- `activeTasks` — tasks with `scheduleMode = "spaced_repetition"` (included in the review queue).
- `reviewedTasks` — distinct tasks with at least one recorded review.
- `totalReviews` — all reviews of the user.
- `streakDays` — review streak, see below.

Streak algorithm: the number of consecutive UTC calendar days with at least one review, counting backwards from today. If the user has not reviewed anything today yet, the streak is not broken: counting starts from yesterday. An empty history yields `0`.

`GET /api/v1/me/stats/difficulty` returns `[{"difficulty":"EASY","count":n}, ...]` in the fixed order `EASY`, `MEDIUM`, `HARD`; levels with no tasks are included with `count: 0`.

`GET /api/v1/me/stats/sources` returns `[{"source":"leetcode_url","count":n}, ...]` sorted by source name (`leetcode_url`, `manual`).

`GET /api/v1/me/stats/recall` returns `{"forgot","partial","remember","total"}` — counts of review outcomes across the whole history, `total = forgot + partial + remember`.

`GET /api/v1/me/stats/workload?days=N` returns `[{"date":"YYYY-MM-DD","count":n}, ...]` — the number of active (`spaced_repetition`) tasks scheduled per calendar day from today through today + N - 1 (today included). Days without due tasks are included with `count: 0`. `days` defaults to 7 and must be between 1 and 90, otherwise `422 VALIDATION_ERROR`. Disabled tasks are excluded.

Statistics error responses follow the shared error model (e.g. unauthenticated requests get `401 UNAUTHORIZED`).

## Settings endpoints (Stage 6)

All settings endpoints are scoped to the authenticated user. `reviewTime` is serialized as ISO local time (`HH:mm:ss`); the PATCH endpoint accepts `HH:mm`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/review-policies` | List named review-policy presets (id, code, name, description, builtIn, per-outcome `values[]`) |
| GET | `/api/v1/me/settings` | Read the user's settings (row is created lazily on first PATCH) |
| PATCH | `/api/v1/me/settings` | Partial update: `reviewPolicyPresetId` (0 resets to the global default policy), `notificationsEnabled`, `soundEffectsEnabled`, `dailyGoal` (1–100), `reviewTime` |

The chosen preset changes the interval recalculation in the review flow: per-outcome `baseIntervalDays` / `growthFactor` / `maxIntervalDays` replace the global `review_policies` values for that user. Without a preset the global policy applies. Unknown preset id or out-of-range `dailyGoal` → `422 VALIDATION_ERROR`.

## Account management endpoints (Stage 6)

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/v1/me/change-password` | Body `{ "currentPassword", "newPassword" }`. Wrong current password → `401`; on success the password is changed and **all refresh tokens are revoked** |
| DELETE | `/api/v1/me` | Body `{ "password" }`. Wrong password → `401`. On success (HTTP 204) the user and all their data (tasks, review history, settings, tokens) are deleted via DB cascades |

## Backup endpoints (Stage 6)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/v1/me/backup` | Full export of the user's data as a JSON attachment (`Content-Disposition: attachment; filename="leetcode-tracker-backup.json"`) |
| POST | `/api/v1/me/backup` | Idempotent import of the same JSON structure |

Backup JSON (camelCase, no password hashes, no tokens, no internal ids):

```
{ "format": "leetcode-tracker-backup", "version": 1, "exportedAt": ISO,
  "user": { "email", "name", "createdAt" },
  "settings": { "reviewPolicyPresetCode", "notificationsEnabled", "soundEffectsEnabled", "dailyGoal", "reviewTime" },
  "tasks": [ { "identityKey", "title", "link", "sourceType", "sourceProblemId", "sourceMeta",
               "difficulty", "topics[]", "notes", "scheduleMode", "currentState",
               "lastReviewDate", "nextReviewDate", "createdAt",
               "reviews": [ { "state", "reviewedAt", "intervalDays", "nextReviewDate", "reviewText" } ] } ] }
```

Import semantics: shared task cards are matched by `identityKey` (created when missing), the user's relation by (user, identityKey), reviews by (state, `reviewedAt`) — importing the same file twice creates no duplicates. Statistics need no separate restore: they are computed from the restored `user_reviews`/`user_tasks`. Errors: malformed JSON → `400 BAD_REQUEST`; wrong `format`/`version`, unknown difficulty/state/scheduleMode, missing `identityKey`/`title` → `422 VALIDATION_ERROR`.

## Phase 2

Planned extensions include difficulty/state/topic dictionaries, a shared task catalog, statistics endpoints, pagination, sorting, rate limiting, observability, and a versioned `/api/v2` when breaking changes become necessary.

## Evolution rules

Changes to MVP endpoints are recorded here first. Breaking changes must use a new API version, and frontend/backend DTOs and error codes must be reviewed together before implementation.
