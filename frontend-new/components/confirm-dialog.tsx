import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"
import { AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
  confirmVariant?: "danger" | "primary"
}

export function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmVariant = "danger",
}: ConfirmDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault()
        onCancel()
      }
    }

    document.addEventListener("keydown", handleKeyDown)

    const timer = setTimeout(() => {
      cancelButtonRef.current?.focus()
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener("keydown", handleKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-background/55 backdrop-blur-md"
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "w-[min(92vw,28rem)] rounded-3xl border border-white/12",
          "bg-card/55 backdrop-blur-2xl",
          "shadow-[0_22px_70px_-36px_rgba(0,0,0,0.9)]",
          "p-6 flex flex-col gap-5 animate-scale-in",
        )}
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 p-2.5 rounded-2xl bg-destructive/15 border border-destructive/25">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-dialog-title" className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            <p id="confirm-dialog-description" className="mt-1 text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-2xl glass-subtle text-foreground/90 hover:text-foreground hover:glass-profile transition-all duration-200"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-4 py-2.5 rounded-2xl font-medium transition-all duration-200",
              confirmVariant === "danger"
                ? "bg-destructive/18 text-destructive hover:bg-destructive/24"
                : "bg-primary/20 text-primary hover:bg-primary/28",
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}