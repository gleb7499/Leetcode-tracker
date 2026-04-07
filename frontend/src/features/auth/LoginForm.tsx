import { useState } from "react"
import { Eye, EyeOff, Mail, Lock } from "@/src/shared/resources/icons"
import { LoginSchema, type LoginFormData } from "@/src/shared/validation/schemas"
import { FieldErrorMessage } from "@/src/shared/components/field-error-message"
import { cn } from "@/lib/utils"
import { AuthSubmitButton } from "./AuthSubmitButton"

interface LoginFormProps {
  onLogin: (
    email: string,
    password: string,
    remember: boolean,
  ) => Promise<{ success: boolean; message: string }>
  isProcessing: boolean
}

export function LoginForm({ onLogin, isProcessing }: LoginFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof LoginFormData, string>>>({})
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  const validateField = (field: "email" | "password") => {
    const result = LoginSchema.safeParse({ email, password, remember })
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field)
      setErrors((prev) => ({ ...prev, [field]: issue?.message ?? undefined }))
    } else {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = LoginSchema.safeParse({ email, password, remember })
    if (!result.success) {
      const fieldErrors: Partial<Record<string, string>> = {}
      for (const issue of result.error.issues) {
        const f = issue.path[0] as string
        if (f === "email" || f === "password") {
          fieldErrors[f] = issue.message
        }
      }
      setErrors(fieldErrors)
      setMessage({ text: "Please fix the errors in the form", type: "error" })
      return
    }

    setMessage(null)
    const res = await onLogin(email.trim().toLowerCase(), password, remember)
    setMessage({ text: res.message, type: res.success ? "success" : "error" })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-foreground/90 block mb-1.5">Email</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onBlur={() => validateField("email")}
            placeholder="your@email.com"
            autoComplete="email"
            className={cn(
              "w-full pl-10 pr-4 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
              errors.email ? "ring-2 ring-destructive/60" : "focus:ring-primary/50",
            )}
          />
        </div>
        <FieldErrorMessage message={errors.email} />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground/90 block mb-1.5">Password</label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => validateField("password")}
            placeholder="Minimum 8 characters"
            autoComplete="current-password"
            className={cn(
              "w-full pl-10 pr-12 py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
              errors.password ? "ring-2 ring-destructive/60" : "focus:ring-primary/50",
            )}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <FieldErrorMessage message={errors.password} />
      </div>

      <label className="flex items-center gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
          className="w-4 h-4"
        />
        <span className="text-sm text-muted-foreground">Remember me</span>
      </label>

      {message && (
        <div
          className={cn(
            "py-3 px-4 rounded-xl text-sm",
            message.type === "success"
              ? "bg-primary/15 text-primary border border-primary/20"
              : "bg-destructive/15 text-destructive border border-destructive/20",
          )}
          role="alert"
        >
          {message.text}
        </div>
      )}

      <AuthSubmitButton type="submit" disabled={isProcessing}>
        {isProcessing ? "Signing in…" : "Sign In"}
      </AuthSubmitButton>
    </form>
  )
}
