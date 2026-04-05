import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"
import { useAuth } from "@/src/shared/hooks/useAuth"

type Tab = "login" | "register"

export function LoginPage() {
  const [activeTab, setActiveTab] = useState<Tab>("login")
  const { login, register, isProcessing, currentUser } = useAuth()
  const navigate = useNavigate()

  if (currentUser) {
    navigate("/", { replace: true })
    return null
  }

  const handleLogin = async (email: string, password: string, remember: boolean) => {
    const result = await login(email, password, remember)
    if (result.success) {
      setTimeout(() => navigate("/", { replace: true }), 800)
    }
    return result
  }

  const handleRegister = async (name: string, email: string, password: string) => {
    const result = await register(name, email, password)
    if (result.success) {
      setTimeout(() => navigate("/", { replace: true }), 800)
    }
    return result
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">

      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 animate-fade-up">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🧠</div>
          <h1 className="text-2xl font-bold text-foreground">LeetCode Tracker</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Spaced repetition for algorithms
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex glass-subtle rounded-2xl p-1 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab("login")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === "login"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("register")}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 ${
              activeTab === "register"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Register
          </button>
        </div>

        {activeTab === "login" ? (
          <LoginForm onLogin={handleLogin} isProcessing={isProcessing} />
        ) : (
          <RegisterForm onRegister={handleRegister} isProcessing={isProcessing} />
        )}

        <p className="text-xs text-muted-foreground/60 text-center mt-6">
          🔒 Your data is stored locally in your browser
        </p>
      </div>
    </div>
  )
}
