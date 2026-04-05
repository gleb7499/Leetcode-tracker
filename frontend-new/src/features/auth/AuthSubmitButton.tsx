import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface AuthSubmitButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
}

export function AuthSubmitButton({ children, className, type = "submit", disabled, ...rest }: AuthSubmitButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        "auth-submit-button relative isolate mt-2 w-full rounded-xl py-3",
        "text-primary-foreground font-semibold",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className,
      )}
      {...rest}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0">
        <span className="auth-submit-surface absolute inset-0 rounded-xl bg-primary" />
      </span>

      <span
        aria-hidden="true"
        className={cn(
          "auth-submit-sheen pointer-events-none absolute inset-0 rounded-xl",
          "bg-gradient-to-r from-primary/0 via-white/10 to-primary/0",
        )}
      />

      <span className="relative z-10 block subpixel-antialiased">{children}</span>
    </button>
  )
}