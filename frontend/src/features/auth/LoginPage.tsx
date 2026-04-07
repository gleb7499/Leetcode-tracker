import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"
import { useAuth } from "@/src/shared/hooks/useAuth"
import { cn } from "@/lib/utils"

type Tab = "login" | "register"

const AUTH_SWITCH_DURATION_MS = 650
const AUTH_SWITCH_EASING = "cubic-bezier(0.22, 1, 0.36, 1)"
const AUTH_PANEL_SAFE_GUTTER_CLASS = "px-1.5"
const AUTH_TAB_RADIUS_CLASS = "rounded-2xl"

const AUTH_TABS: Array<{ value: Tab; label: string }> = [
  { value: "login", label: "Sign In" },
  { value: "register", label: "Register" },
]

export function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("login")
  const [panelHeight, setPanelHeight] = useState<number | null>(null)

  const { login, register, isProcessing, currentUser, pendingVerification } = useAuth()
  const navigate = useNavigate()

  const loginPanelRef = useRef<HTMLDivElement | null>(null)
  const registerPanelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (currentUser) {
      navigate("/", { replace: true })
      return
    }

    if (pendingVerification) {
      navigate("/verify-email", { replace: true })
    }
  }, [currentUser, pendingVerification, navigate])

  const updatePanelHeight = useCallback(() => {
    const activePanel = activeTab === "login" ? loginPanelRef.current : registerPanelRef.current
    if (!activePanel) return
    setPanelHeight(activePanel.offsetHeight)
  }, [activeTab])

  useLayoutEffect(() => {
    updatePanelHeight()
  }, [updatePanelHeight])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      updatePanelHeight()
    })

    if (loginPanelRef.current) observer.observe(loginPanelRef.current)
    if (registerPanelRef.current) observer.observe(registerPanelRef.current)

    return () => observer.disconnect()
  }, [updatePanelHeight])

  if (currentUser || pendingVerification) return null

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    const result = await login(email, password, remember)
    const nextRoute = result.nextRoute
    if (result.success && nextRoute) {
      setTimeout(() => navigate(nextRoute, { replace: true }), 800)
    }
    return result
  }

  const handleRegister = async (name: string, email: string, password: string) => {
    const result = await register(name, email, password)
    const nextRoute = result.nextRoute
    if (result.success && nextRoute) {
      setTimeout(() => navigate(nextRoute, { replace: true }), 800)
    }
    return result
  }

  return (
    <div
      className="h-[100dvh] min-h-screen flex justify-center p-4 relative overflow-x-hidden overflow-y-scroll app-scrollbar"
      style={{ alignItems: "safe center" }}
    >
      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-foreground">LeetCode Tracker</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Spaced repetition for algorithms
          </p>
        </div>

        {/* Animated tab switcher */}
        <div className={cn("relative mb-6 glass-subtle p-1", AUTH_TAB_RADIUS_CLASS)} role="tablist" aria-label="Auth mode">
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] bg-primary shadow-sm",
              AUTH_TAB_RADIUS_CLASS,
            )}
            style={{
              transform: activeTab === "login" ? "translateX(0%)" : "translateX(100%)",
              transitionDuration: `${AUTH_SWITCH_DURATION_MS}ms`,
              transitionTimingFunction: AUTH_SWITCH_EASING,
            }}
          />

          <div className="relative z-10 grid grid-cols-2">
            {AUTH_TABS.map((tab) => (
              <button
                key={tab.value}
                id={`auth-tab-${tab.value}`}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.value}
                aria-controls={`auth-panel-${tab.value}`}
                tabIndex={activeTab === tab.value ? 0 : -1}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "py-2.5 text-sm font-medium transition-colors duration-500",
                  AUTH_TAB_RADIUS_CLASS,
                  activeTab === tab.value
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Horizontal content switch with shared easing */}
        <div
          className="relative overflow-hidden transition-[height]"
          style={
            panelHeight === null
              ? undefined
              : {
                  height: `${panelHeight}px`,
                  transitionDuration: `${AUTH_SWITCH_DURATION_MS}ms`,
                  transitionTimingFunction: AUTH_SWITCH_EASING,
                }
          }
        >
          <div
            className="flex w-[200%] items-start will-change-transform"
            style={{
              transform: activeTab === "login" ? "translateX(0%)" : "translateX(-50%)",
              transitionDuration: `${AUTH_SWITCH_DURATION_MS}ms`,
              transitionTimingFunction: AUTH_SWITCH_EASING,
            }}
          >
            <div
              id="auth-panel-login"
              ref={loginPanelRef}
              role="tabpanel"
              aria-labelledby="auth-tab-login"
              aria-hidden={activeTab !== "login"}
              inert={activeTab !== "login"}
              className={cn("w-1/2 shrink-0 self-start", AUTH_PANEL_SAFE_GUTTER_CLASS)}
            >
              <LoginForm onLogin={handleLogin} isProcessing={isProcessing} />
            </div>

            <div
              id="auth-panel-register"
              ref={registerPanelRef}
              role="tabpanel"
              aria-labelledby="auth-tab-register"
              aria-hidden={activeTab !== "register"}
              inert={activeTab !== "register"}
              className={cn("w-1/2 shrink-0 self-start", AUTH_PANEL_SAFE_GUTTER_CLASS)}
            >
              <RegisterForm onRegister={handleRegister} isProcessing={isProcessing} />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
