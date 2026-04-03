import { useState, useRef, useEffect } from "react"
import { User, BarChart3, BookOpen, Settings, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PanelType } from "@/components/panels/panel-types"

interface ProfileMenuProps {
  activePanel: PanelType
  onPanelChange: (panel: PanelType) => void
  mode?: "floating" | "rail"
  userName?: string
  onRequestLogout?: () => void
}

const panelMenuItems = [
  { id: "profile" as const, icon: User, label: "Profile" },
  { id: "stats" as const, icon: BarChart3, label: "Progress" },
  { id: "library" as const, icon: BookOpen, label: "Library" },
  { id: "settings" as const, icon: Settings, label: "Settings" },
] as const

const EXPAND_DELAY_MS = 80
const COLLAPSE_DELAY_MS = 180
const ANIMATION_DURATION_MS = 380
const ITEM_STAGGER_MS = 70

export function ProfileMenu({
  activePanel,
  onPanelChange,
  mode = "floating",
  onRequestLogout,
}: ProfileMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const hasActivePanel = activePanel !== null
  const isMenuVisible = hasActivePanel || isExpanded

  const clearTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const openMenu = () => {
    if (hasActivePanel) return
    clearTimer()
    timeoutRef.current = setTimeout(() => setIsExpanded(true), EXPAND_DELAY_MS)
  }

  const closeMenuWithDelay = () => {
    if (hasActivePanel) return
    clearTimer()
    timeoutRef.current = setTimeout(() => setIsExpanded(false), COLLAPSE_DELAY_MS)
  }

  const handleItemClick = (panelId: (typeof panelMenuItems)[number]["id"]) => {
    if (activePanel !== panelId) {
      onPanelChange(panelId)
    }
    setIsExpanded(true)
  }

  const handleToggleMenu = () => {
    clearTimer()
    if (hasActivePanel) {
      onPanelChange(null)
      setIsExpanded(false)
      return
    }
    setIsExpanded((prev) => !prev)
  }

  const handleLogoutClick = () => {
    onRequestLogout?.()
  }

  useEffect(() => {
    return () => clearTimer()
  }, [])

  useEffect(() => {
    if (!isMenuVisible || hasActivePanel) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsExpanded(false)
      }
    }

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null
      if (target && containerRef.current && !containerRef.current.contains(target)) {
        setIsExpanded(false)
      }
    }

    document.addEventListener("keydown", handleEscape)
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("touchstart", handleClickOutside)

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("touchstart", handleClickOutside)
    }
  }, [isMenuVisible, hasActivePanel])

  if (mode === "rail") {
    return (
      <div className="h-full w-full rounded-3xl border border-white/10 bg-card/45 backdrop-blur-2xl shadow-[0_18px_50px_-32px_rgba(0,0,0,0.85)] flex flex-col items-center py-6">
        <button
          className="relative flex items-center justify-center rounded-full transition-all duration-300 glass-profile w-16 h-16 hover:scale-105"
          onClick={() => onPanelChange(activePanel === "profile" ? null : "profile")}
          aria-label={activePanel === "profile" ? "Close profile panel" : "Open profile panel"}
        >
          {activePanel === "profile" ? (
            <X className="w-6 h-6 text-foreground" />
          ) : (
            <User className="w-6 h-6 text-foreground" />
          )}
        </button>

        <div className="mt-6 flex flex-col items-center gap-3">
          {panelMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
                "glass-subtle hover:glass-profile",
                activePanel === item.id && "ring-2 ring-primary/60 bg-primary/10",
              )}
              aria-label={item.label}
            >
              <item.icon
                className={cn(
                  "w-5 h-5 transition-all duration-300",
                  activePanel === item.id
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground",
                )}
              />
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="fixed top-6 right-6 z-50 flex flex-col items-center"
      onMouseEnter={openMenu}
      onMouseLeave={closeMenuWithDelay}
    >
      <button
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          "glass-profile",
          isMenuVisible ? "w-[4.125rem] h-[4.125rem]" : "w-11 h-11 hover:scale-110",
          activePanel && "ring-2 ring-primary/50",
        )}
        style={{ transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
        onClick={handleToggleMenu}
        aria-expanded={isMenuVisible}
        aria-controls="quick-actions-menu"
        aria-label={hasActivePanel ? "Close split panel" : isMenuVisible ? "Close quick menu" : "Open quick menu"}
      >
        <div className={cn("relative", isMenuVisible ? "w-7 h-7" : "w-6 h-6")}>
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-foreground",
              "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMenuVisible ? "top-1/2 -translate-y-1/2 rotate-45 w-6" : "top-[4px] w-5",
            )}
            style={{ transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
          />
          <span
            className={cn(
              "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-0.5 rounded-full bg-foreground",
              "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMenuVisible ? "w-0 opacity-0" : "w-5 opacity-100",
            )}
            style={{ transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
          />
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-foreground",
              "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMenuVisible ? "top-1/2 -translate-y-1/2 -rotate-45 w-6" : "top-[18px] w-5",
            )}
            style={{ transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
          />
        </div>
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-primary/20 blur-xl transition-opacity duration-500",
            isMenuVisible ? "opacity-100" : "opacity-0",
          )}
        />
      </button>

      <div
        id="quick-actions-menu"
        role="menu"
        className={cn(
          "absolute top-full mt-3 left-1/2 -translate-x-1/2",
          "flex flex-col items-center gap-3",
          "transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)]",
          isMenuVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        style={{ transitionDuration: `${ANIMATION_DURATION_MS}ms` }}
      >
        {panelMenuItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            role="menuitem"
            className={cn(
              "group relative flex items-center justify-center w-12 h-12 rounded-full",
              "glass-subtle hover:glass-profile",
              "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
              activePanel === item.id && "ring-2 ring-primary/60 bg-primary/10",
              isMenuVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-75 pointer-events-none",
            )}
            aria-label={item.label}
            style={{
              transitionDuration: `${ANIMATION_DURATION_MS}ms`,
              transitionDelay: isMenuVisible ? `${index * ITEM_STAGGER_MS}ms` : "0ms",
            }}
          >
            <item.icon
              className={cn(
                "w-5 h-5 transition-all duration-300",
                activePanel === item.id
                  ? "text-primary"
                  : "text-muted-foreground group-hover:text-foreground",
              )}
            />
          </button>
        ))}
        {onRequestLogout && (
          <button
            onClick={handleLogoutClick}
            role="menuitem"
            className={cn(
              "group relative flex items-center justify-center w-12 h-12 rounded-full",
              "glass-subtle hover:glass-profile",
              "transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
              isMenuVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-75 pointer-events-none",
            )}
            aria-label="Sign out"
            style={{
              transitionDuration: `${ANIMATION_DURATION_MS}ms`,
              transitionDelay: isMenuVisible ? `${panelMenuItems.length * ITEM_STAGGER_MS}ms` : "0ms",
            }}
          >
            <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors duration-300" />
          </button>
        )}
      </div>
    </div>
  )
}
