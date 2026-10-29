/** True only in the static GitHub Pages build (`VITE_DEMO=true`): no backend, data lives in the browser. */
export const IS_DEMO = import.meta.env.VITE_DEMO === "true"

export const DEMO_EMAIL = "demo@algorep.app"
export const DEMO_PASSWORD = "Demo12345!"
