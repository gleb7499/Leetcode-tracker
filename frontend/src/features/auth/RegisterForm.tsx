import { useState } from "react"
import { Eye, EyeOff, Mail, Lock, User } from "@/src/shared/resources/icons"
import { RegisterSchema } from "@/src/shared/validation/schemas"
import { PasswordStrength } from "./PasswordStrength"
import { cn } from "@/lib/utils"
import { AuthSubmitButton } from "./AuthSubmitButton"

interface RegisterFormProps {
  onRegister: (
    name: string,
    email: string,
    password: string,
  ) => Promise<{ success: boolean; message: string }>
  isProcessing: boolean
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  passwordConfirm?: string
  terms?: string
}

export function RegisterForm({ onRegister, isProcessing }: RegisterFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [passwordConfirm, setPasswordConfirm] = useState("")
  const [terms, setTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)

  const validateField = (field: keyof FormErrors) => {
    const result = RegisterSchema.safeParse({
      name,
      email,
      password,
      passwordConfirm,
      terms: terms || (undefined as unknown as true),
    })
    const updated = { ...errors }
    if (!result.success) {
      const issue = result.error.issues.find((i) => i.path[0] === field)
      if (issue) {
        updated[field] = issue.message
      } else {
        updated[field] = undefined
      }
    } else {
      updated[field] = undefined
    }
    setErrors(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const result = RegisterSchema.safeParse({
      name,
      email,
      password,
      passwordConfirm,
      terms: terms || (undefined as unknown as true),
    })

    if (!result.success) {
      const fieldErrors: FormErrors = {}
      for (const issue of result.error.issues) {
        const f = issue.path[0] as keyof FormErrors
        fieldErrors[f] = issue.message
      }
      setErrors(fieldErrors)
      setMessage({ text: "Please fix the errors in the form", type: "error" })
      return
    }

    setMessage(null)
    const res = await onRegister(name.trim(), email.trim().toLowerCase(), password)
    setMessage({ text: res.message, type: res.success ? "success" : "error" })
  }

  const inputClass = (hasError?: string) =>
    cn(
      "w-full py-3 rounded-xl glass-subtle text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 transition-all",
      hasError ? "ring-2 ring-destructive/60" : "focus:ring-primary/50",
    )

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div>
        <label className="text-sm font-medium text-foreground/90 block mb-1.5">Name</label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => validateField("name")}
            placeholder="Your name"
            autoComplete="name"
            className={cn(inputClass(errors.name), "pl-10 pr-4")}
          />
        </div>
        {errors.name && <p className="mt-1.5 text-xs text-destructive">{errors.name}</p>}
      </div>

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
            className={cn(inputClass(errors.email), "pl-10 pr-4")}
          />
        </div>
        {errors.email && <p className="mt-1.5 text-xs text-destructive">{errors.email}</p>}
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
            autoComplete="new-password"
            className={cn(inputClass(errors.password), "pl-10 pr-12")}
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
        {errors.password && <p className="mt-1.5 text-xs text-destructive">{errors.password}</p>}
        <PasswordStrength password={password} />
      </div>

      <div>
        <label className="text-sm font-medium text-foreground/90 block mb-1.5">
          Confirm password
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type={showPasswordConfirm ? "text" : "password"}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            onBlur={() => validateField("passwordConfirm")}
            placeholder="Repeat password"
            autoComplete="new-password"
            className={cn(inputClass(errors.passwordConfirm), "pl-10 pr-12")}
          />
          <button
            type="button"
            onClick={() => setShowPasswordConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPasswordConfirm ? "Hide password" : "Show password"}
          >
            {showPasswordConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.passwordConfirm && (
          <p className="mt-1.5 text-xs text-destructive">{errors.passwordConfirm}</p>
        )}
      </div>

      <label className="flex items-start gap-2.5 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => setTerms(e.target.checked)}
          className="mt-0.5 w-4 h-4"
        />
        <span className="text-sm text-muted-foreground">
          I accept the{" "}
          <button
            type="button"
            onClick={(e) => e.preventDefault()}
            className="text-primary underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            terms of use
          </button>
        </span>
      </label>
      {errors.terms && <p className="-mt-2 text-xs text-destructive">{errors.terms}</p>}

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
        {isProcessing ? "Creating account…" : "Create Account"}
      </AuthSubmitButton>
    </form>
  )
}
