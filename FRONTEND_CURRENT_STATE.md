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

The current UI uses browser storage as an interim persistence layer while the server contract is being implemented.

## Current application behavior

- `RootLayout` provides the application shell and `AmbientBackground` provides the visual background layer.
- Home and review modes switch through view state with a smooth transition.
- Navigation and secondary actions are handled by `ProfileMenu` and `SidePanel`.
- Adding a task uses `AddTaskFab` and the `AddTaskModal` flow.
- Logout is confirmed through `ConfirmDialog`.
- Authentication and task data currently use local browser storage.

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

- sign-in: [audit-login.png](audit-login.png);
- home: [audit-home.png](audit-home.png);
- library panel: [audit-library-panel.png](audit-library-panel.png);
- expanded library: [audit-library-expanded.png](audit-library-expanded.png);
- review session: [audit-review-session.png](audit-review-session.png);
- profile panel: [audit-profile-panel.png](audit-profile-panel.png).

## Current limitations

The frontend still uses local storage instead of the backend API. Production synchronization will require moving authentication, task management, and review operations to the contract defined in `BACKEND_FRONTEND_CONTRACT.md`.
