import type { ReactNode } from "react"
import { FlaskConical } from "lucide-react"
import { IS_DEMO } from "./demo-config"

interface DemoNoticeProps {
  title: string
  children: ReactNode
}

/** Quiet explainer shown on auth screens of the static demo build only. */
export function DemoNotice({ title, children }: DemoNoticeProps) {
  if (!IS_DEMO) return null

  return (
    <div
      role="note"
      className="mb-5 flex gap-3 rounded-xl border border-primary/20 bg-primary/10 px-4 py-3 text-left text-sm text-primary"
    >
      <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-primary/80">{children}</p>
      </div>
    </div>
  )
}
