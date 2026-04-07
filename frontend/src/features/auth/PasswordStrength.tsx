import { cn } from "@/lib/utils"

interface PasswordStrengthProps {
  password: string
}

function calculateStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: "" }
  let score = 0
  if (password.length >= 8) score++
  if (/[A-Za-z]/.test(password) && /\d/.test(password)) score++
  if (/[^A-Za-z\d]/.test(password) || password.length >= 12) score++
  if (score === 1) return { level: 1, label: "Weak" }
  if (score === 2) return { level: 2, label: "Medium" }
  if (score >= 3) return { level: 3, label: "Strong" }
  return { level: 0, label: "" }
}

const levelConfig = {
  0: { color: "bg-secondary", textColor: "" },
  1: { color: "bg-destructive", textColor: "text-destructive" },
  2: { color: "bg-accent", textColor: "text-accent" },
  3: { color: "bg-primary", textColor: "text-primary" },
} as const

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const { level, label } = calculateStrength(password)
  const config = levelConfig[level]

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <div className="flex gap-1">
        {([1, 2, 3] as const).map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-500",
              level >= i ? config.color : "bg-secondary",
            )}
          />
        ))}
      </div>
      {label && (
        <span className={cn("text-xs font-medium", config.textColor)} aria-live="polite">
          {label}
        </span>
      )}
    </div>
  )
}
