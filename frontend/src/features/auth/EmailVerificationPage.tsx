import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Mail } from "@/src/shared/resources/icons"
import { useAuth } from "@/src/shared/hooks/useAuth"
import { AuthSubmitButton } from "./AuthSubmitButton"
import { cn } from "@/lib/utils"

const CODE_LENGTH = 6

// Animation/timing constants (single source of truth)
const CELL_STAGGER_MS = 55
// Must match the `verify-cell-shake` animation duration in index.css (0.44 s)
const SHAKE_DURATION_MS = 440

type Phase = "idle" | "submitting" | "error" | "success"

export function EmailVerificationPage() {
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(""))
  const [phase, setPhase] = useState<Phase>("idle")
  const [isShaking, setIsShaking] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(60)

  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(CODE_LENGTH).fill(null))
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const navigate = useNavigate()
  const {
    pendingVerification,
    verifyEmailCode,
    resendEmailVerificationCode,
    cancelPendingVerification,
    isProcessing,
  } = useAuth()

  const email = pendingVerification?.email ?? ""
  const isRegisterVerification = pendingVerification?.flow === "register"

  // Focus first cell on mount
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  // Start 60-second resend cooldown on mount (simulates code just being sent)
  useEffect(() => {
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
    }
  }, [])

  const focusCell = useCallback((index: number) => {
    if (index >= 0 && index < CODE_LENGTH) {
      inputRefs.current[index]?.focus()
    }
  }, [])

  const triggerShake = useCallback(() => {
    if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current)
    setIsShaking(true)
    shakeTimerRef.current = setTimeout(() => setIsShaking(false), SHAKE_DURATION_MS)
  }, [])

  const handleChange = useCallback(
    (index: number, value: string) => {
      // Accept only single digit, strip non-numeric
      const digit = value.replace(/\D/g, "").slice(-1)
      setDigits((prev) => {
        const next = [...prev]
        next[index] = digit
        return next
      })
      // Clear error state as soon as user starts retyping
      if (phase === "error") {
        setPhase("idle")
        setErrorMessage(null)
      }
      if (digit) {
        focusCell(index + 1)
      }
    },
    [phase, focusCell],
  )

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Backspace") {
        if (digits[index]) {
          setDigits((prev) => {
            const next = [...prev]
            next[index] = ""
            return next
          })
        } else {
          if (index > 0) {
            focusCell(index - 1)
            setDigits((prev) => {
              const next = [...prev]
              next[index - 1] = ""
              return next
            })
          }
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault()
        focusCell(index - 1)
      } else if (e.key === "ArrowRight") {
        e.preventDefault()
        focusCell(index + 1)
      }
    },
    [digits, focusCell],
  )

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH)
      if (!text) return

      setDigits((prev) => {
        const next = [...prev]
        for (let i = 0; i < CODE_LENGTH; i++) {
          next[i] = text[i] ?? ""
        }
        return next
      })

      // Move focus to the last pasted digit position (or last cell if all filled)
      focusCell(Math.min(text.length, CODE_LENGTH - 1))

      if (phase === "error") {
        setPhase("idle")
        setErrorMessage(null)
      }
    },
    [phase, focusCell],
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const code = digits.join("")
    if (code.length < CODE_LENGTH) return

    setPhase("submitting")
    setErrorMessage(null)

    const result = await verifyEmailCode(code)
    if (!result.success) {
      setPhase("error")
      setErrorMessage(result.message)
      triggerShake()
      const redirectRoute = result.nextRoute
      if (redirectRoute) {
        setTimeout(() => navigate(redirectRoute, { replace: true }), 500)
      }
      return
    }

    setPhase("success")
    setTimeout(() => navigate(result.nextRoute ?? "/", { replace: true }), 700)
  }

  const startCooldown = useCallback(() => {
    if (cooldownRef.current) clearInterval(cooldownRef.current)
    setResendCooldown(60)
    cooldownRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [])

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return

    const result = await resendEmailVerificationCode()
    if (!result.success) {
      setPhase("error")
      setErrorMessage(result.message)
      triggerShake()
      const redirectRoute = result.nextRoute
      if (redirectRoute) {
        setTimeout(() => navigate(redirectRoute, { replace: true }), 500)
      }
      return
    }

    setDigits(Array(CODE_LENGTH).fill(""))
    setPhase("idle")
    setErrorMessage(null)
    focusCell(0)
    startCooldown()
  }, [
    resendCooldown,
    resendEmailVerificationCode,
    focusCell,
    startCooldown,
    navigate,
    triggerShake,
  ])

  const handleUseDifferentEmail = useCallback(() => {
    cancelPendingVerification()
    navigate("/login", { replace: true })
  }, [cancelPendingVerification, navigate])

  const isFilled = digits.every((d) => d !== "")
  const isSubmitting = phase === "submitting" || isProcessing
  const isSuccess = phase === "success"
  const isError = phase === "error"
  const isDisabled = isSubmitting || isSuccess

  return (
    <div
      className="h-[100dvh] min-h-screen flex justify-center p-4 relative overflow-x-hidden overflow-y-scroll app-scrollbar"
      style={{ alignItems: "safe center" }}
    >
      <div className="w-full max-w-md glass rounded-3xl p-8 relative z-10 animate-fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mb-4 flex justify-center">
            <div className="w-16 h-16 rounded-2xl glass-subtle flex items-center justify-center">
              <Mail className="w-7 h-7 text-primary" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Check your email</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            We sent a 6-digit verification code to
          </p>

          <div className="mt-1 flex items-center justify-center gap-2">
            {email ? (
              <p className="text-foreground font-medium text-sm break-all">{email}</p>
            ) : (
              <p className="text-muted-foreground text-sm">your email address</p>
            )}
            <button
              type="button"
              onClick={handleUseDifferentEmail}
              className="text-xs text-primary hover:opacity-75 transition-opacity"
            >
              Use different email
            </button>
          </div>
        </div>

        {isRegisterVerification && (
          <div className="mb-4 py-3 px-4 rounded-xl text-sm bg-primary/10 text-primary border border-primary/20">
            Your account is not active yet. Verify your email to finish registration.
          </div>
        )}

        {import.meta.env.DEV && (
          <div className="mb-4 py-3 px-4 rounded-xl text-sm bg-accent/10 text-accent border border-accent/20">
            Development mode: if SMTP is not configured on the backend, the
            verification code is printed in the backend log console.
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {/* 6 squircle digit cells */}
          <div
            className="flex justify-center gap-3"
            role="group"
            aria-label="Verification code input"
          >
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el
                }}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={2}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={handlePaste}
                onFocus={(e) => e.target.select()}
                disabled={isDisabled}
                aria-label={`Digit ${index + 1} of ${CODE_LENGTH}`}
                autoComplete={index === 0 ? "one-time-code" : undefined}
                className={cn(
                  "verify-cell",
                  digit && "verify-cell--filled",
                  isError && "verify-cell--error",
                  isShaking && "verify-cell--shake",
                  isSuccess && "verify-cell--success",
                )}
                style={{ animationDelay: `${index * CELL_STAGGER_MS}ms` }}
              />
            ))}
          </div>

          {/* Error feedback */}
          {errorMessage && (
            <div
              className="py-3 px-4 rounded-xl text-sm bg-destructive/15 text-destructive border border-destructive/20"
              role="alert"
            >
              {errorMessage}
            </div>
          )}

          <AuthSubmitButton type="submit" disabled={!isFilled || isSubmitting || isSuccess}>
            {isSuccess ? "✓ Verified!" : isSubmitting ? "Verifying…" : "Verify"}
          </AuthSubmitButton>

          {/* Resend section */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Didn't receive the code?{" "}</span>
            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className={cn(
                "font-medium transition-opacity duration-200",
                resendCooldown > 0
                  ? "text-muted-foreground cursor-not-allowed"
                  : "text-primary hover:opacity-75",
              )}
            >
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
