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
| GET | `/api/v1/me/tasks/{taskId}` | Load a review task |
| POST | `/api/v1/me/tasks` | Add a task to the user's library |
| DELETE | `/api/v1/me/tasks/{taskId}` | Remove a task from the user's library |
| POST | `/api/v1/me/tasks/{taskId}/reviews` | Record a review outcome |

Adding a task accepts `name`, `url`, `difficulty`, `topics`, and `notes`. Recording a review accepts `status` and returns the updated task with its new schedule and review history.

## Scheduling semantics

- `remember`: increase the interval before the next review;
- `partial`: keep the current interval;
- `forgot`: shorten the interval.

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

## Phase 2

Planned extensions include difficulty/state/topic dictionaries, a shared task catalog, statistics endpoints, pagination, sorting, rate limiting, observability, and a versioned `/api/v2` when breaking changes become necessary.

## Evolution rules

Changes to MVP endpoints are recorded here first. Breaking changes must use a new API version, and frontend/backend DTOs and error codes must be reviewed together before implementation.
