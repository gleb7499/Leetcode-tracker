# Frontend Current State

This document records the current working state of the frontend and provides a concise guide for development and review.

## Canonical sources

- [Public project overview](README.md)
- [Developer baseline](README.developers.md)
- [Backend/frontend contract](BACKEND_FRONTEND_CONTRACT.md)
- [Product specification](PRODUCT_SPECIFICATION.md)

## Frontend map

The repository contains one active client implementation:

- `frontend`: React + Vite + TypeScript application with component-driven UX, panels, review flows, and tests.

The UI talks to the backend API (`/api/v1`, see [BACKEND_FRONTEND_CONTRACT.md](BACKEND_FRONTEND_CONTRACT.md)) through the fetch wrapper in `frontend/src/shared/api/`. Browser storage holds only the JWT token pair (localStorage when "Remember me" is checked, sessionStorage otherwise) and the in-progress email verification pointer; it is no longer a data source.

## Current application behavior

- `RootLayout` provides the application shell and `AmbientBackground` provides the visual background layer.
- Home and review modes switch through view state with a smooth transition.
- Navigation and secondary actions are handled by `ProfileMenu` and `SidePanel`.
- Adding a task uses `AddTaskFab` and the `AddTaskModal` flow; results are persisted via `POST /api/v1/me/tasks`.
- Logout is confirmed through `ConfirmDialog` and revokes the refresh token via `POST /api/v1/auth/logout`.
- Authentication is API-backed: register → OTP screen (code arrives by email; without SMTP it is printed in the backend log) → auto-login with rotating JWT access/refresh tokens. Expired access tokens are refreshed transparently on the first 401.
- Tasks, review outcomes, and statistics are loaded from `/api/v1/me/tasks`, `POST /api/v1/me/tasks/{id}/reviews`, and `/api/v1/me/stats*` respectively; the backend is the single source of truth for scheduling (`nextReview`).
- In dev mode (`npm run dev`) Vite proxies `/api` to the backend (default `http://localhost:8080`, override with `VITE_API_PROXY_TARGET`).

## Quality tooling

Available scripts include `dev`, `build`, `preview`, `typecheck`, `lint`, `test`, and `test:watch`. The project uses Tailwind CSS v4, Vitest, and Testing Library. Unit tests cover URL validation, review feedback, progress, scheduling, and reducer flows.

## Run and verify

```bash
cd frontend
npm install
npm run dev
npm run typecheck
npm run lint
npm run test
```

## Interface references

The root of the repository contains captured UI states:

- sign-in: [audit-login.png](docs/screenshots/audit-login.png);
- home: [audit-home.png](docs/screenshots/audit-home.png);
- library panel: [audit-library-panel.png](docs/screenshots/audit-library-panel.png);
- expanded library: [audit-library-expanded.png](docs/screenshots/audit-library-expanded.png);
- review session: [audit-review-session.png](docs/screenshots/audit-review-session.png);
- profile panel: [audit-profile-panel.png](docs/screenshots/audit-profile-panel.png).

## Current limitations

- The "Solved / save for tomorrow" choice in the add-task flow is kept for UX, but the backend contract gives the backend full control of scheduling (every added task is due today), so both options map to the default spaced-repetition schedule server-side.
- The stats panel's "Mastered" card shows the total `remember` review outcomes (backend metric), and the weekly bar chart shows the upcoming 7-day review workload instead of past activity, because the statistics API does not expose per-day historical review counts.
