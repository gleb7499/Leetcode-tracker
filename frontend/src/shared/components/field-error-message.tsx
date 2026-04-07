import { cn } from "@/lib/utils"

interface FieldErrorMessageProps {
  message?: string
  className?: string
  textClassName?: string
}

export function FieldErrorMessage({ message, className, textClassName }: FieldErrorMessageProps) {
  const hasMessage = Boolean(message)

  return (
    <p
      aria-live="polite"
      aria-hidden={hasMessage ? undefined : true}
      className={cn(
        "field-error-message",
        hasMessage ? "field-error-message--visible" : "field-error-message--hidden",
        className,
      )}
    >
      <span className={cn("field-error-message__text", textClassName)}>{message ?? ""}</span>
    </p>
  )
}
