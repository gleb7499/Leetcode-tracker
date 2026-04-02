"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import { StatsPanel } from "./panels/stats-panel"
import { LibraryPanel } from "./panels/library-panel"
import { SettingsPanel } from "./panels/settings-panel"
import type { PanelType } from "./profile-menu"

interface SidePanelProps {
  activePanel: PanelType
  onClose: () => void
  mode?: "overlay" | "docked"
  className?: string
}

export function SidePanel({ activePanel, mode = "overlay", className }: SidePanelProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (activePanel) {
      setIsVisible(true)
      setIsClosing(false)
    } else {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setIsVisible(false)
        setIsClosing(false)
      }, 400)
      return () => clearTimeout(timer)
    }
  }, [activePanel])

  if (!isVisible && !activePanel) return null

  const panelContent = (
    <div className={cn("h-full overflow-y-scroll app-scrollbar", mode === "overlay" ? "pt-24 pb-6" : "pt-6 pb-6")}>
      {activePanel === "stats" && <StatsPanel />}
      {activePanel === "library" && <LibraryPanel />}
      {activePanel === "settings" && <SettingsPanel />}
    </div>
  )

  if (mode === "docked") {
    return (
      <aside
        className={cn(
          "fixed z-40 top-4 bottom-4 right-24",
          "w-[min(56vw,920px)] min-w-[520px]",
          "overflow-hidden rounded-3xl",
          "border border-white/10",
          "bg-card/45 backdrop-blur-2xl",
          "shadow-[0_18px_50px_-32px_rgba(0,0,0,0.85)]",
          isClosing ? "animate-panel-slide-out" : "animate-panel-slide-in",
          className,
        )}
      >
        {panelContent}
      </aside>
    )
  }

  return (
    <div 
      className={cn(
        "fixed top-0 right-0 h-full w-full sm:w-96 z-40",
        "glass-panel",
        isClosing ? "animate-panel-slide-out" : "animate-panel-slide-in",
        className,
      )}
    >
      {panelContent}
    </div>
  )
}
