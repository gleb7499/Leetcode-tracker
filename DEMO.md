# Demo branch

The `demo` branch holds a clickable prototype of the interface that runs without a backend. `main` is not affected.

- **URL:** https://gleb7499.github.io/Leetcode-tracker/
- **Data:** an in-browser mock server (`frontend/src/demo/`) answers the same `/api/v1/...` routes as the real backend. State lives in the visitor's `localStorage`; the **Reset** button in the bottom-left corner restores the seed data.
- **Sign-in:** the app opens on the login/register screen, which carries a "Demo mode" note. Any valid values work; the next screen asks for a one-time code, and only `000000` is accepted. The account (name from registration, or derived from the email) is kept in `localStorage`, so it survives reloads until the visitor signs out; signing in again works the same way. The data itself is the same static seed for every account.
- **Publishing:** every push to `demo` runs `.github/workflows/pages.yml` (typecheck, tests, build with `VITE_DEMO=true`, deploy to GitHub Pages).

Run locally:

```bash
cd frontend
npm ci
VITE_DEMO=true npm run dev
```

Bring new work from `main` into the demo: `git checkout demo && git merge main`.
