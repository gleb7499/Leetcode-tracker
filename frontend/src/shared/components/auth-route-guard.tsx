import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"
import { useAuth } from "@/src/shared/hooks/useAuth"

type GuardedRoute = "login" | "verify-email" | "home"

interface AuthRouteGuardProps {
  route: GuardedRoute
  children: ReactNode
}

export function AuthRouteGuard({ route, children }: AuthRouteGuardProps) {
  const { authStage } = useAuth()

  if (route === "login") {
    if (authStage === "authenticated") {
      return <Navigate to="/" replace />
    }
    if (authStage === "pending-verification") {
      return <Navigate to="/verify-email" replace />
    }
    return <>{children}</>
  }

  if (route === "verify-email") {
    if (authStage === "authenticated") {
      return <Navigate to="/" replace />
    }
    if (authStage === "anonymous") {
      return <Navigate to="/login" replace />
    }
    return <>{children}</>
  }

  if (authStage === "authenticated") {
    return <>{children}</>
  }

  if (authStage === "pending-verification") {
    return <Navigate to="/verify-email" replace />
  }

  return <Navigate to="/login" replace />
}

export function AuthAwareFallbackRoute() {
  const { authStage } = useAuth()

  if (authStage === "authenticated") {
    return <Navigate to="/" replace />
  }

  if (authStage === "pending-verification") {
    return <Navigate to="/verify-email" replace />
  }

  return <Navigate to="/login" replace />
}
