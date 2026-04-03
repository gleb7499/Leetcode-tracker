import { useState, useRef, useEffect } from "react"
import { User, BarChart3, BookOpen, Settings, X, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

export type PanelType = "stats" | "library" | "settings" | null

interface ProfileMenuProps {
  activePanel: PanelType
  onPanelChange: (panel: PanelType) => void
  mode?: "floating" | "rail"
  userName?: string
  onLogout?: () => void
}

const menuItems = [
  { id: "stats" as const, icon: BarChart3, label: "Progress" },
  { id: "library" as const, icon: BookOpen, label: "Library" },
  { id: "settings" as const, icon: Settings, label: "Settings" },
] as const

/** CSS delay class for each menu item index (0–2). */
const menuDelayClass: Record<number, string> = {
  0: "animate-delay-menu-0",
  1: "animate-delay-menu-1",
  2: "animate-delay-menu-2",
}

export function ProfileMenu({
  activePanel,
  onPanelChange,
  mode = "floating",
  onLogout,
}: ProfileMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isHovering, setIsHovering] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
  }

  const handleMouseEnter = () => {
    clearTimer()
    setIsHovering(true)
    timeoutRef.current = setTimeout(() => setIsExpanded(true), 100)
  }

  const handleMouseLeave = () => {
    clearTimer()
    setIsHovering(false)
    timeoutRef.current = setTimeout(() => setIsExpanded(false), 300)
  }

  const handleItemClick = (panelId: PanelType) => {
    onPanelChange(activePanel === panelId ? null : panelId)
  }

  useEffect(() => {
    return () => clearTimer()
  }, [])

  if (mode === "rail") {
    return (
      <div className="h-full w-full rounded-3xl border border-white/10 bg-card/45 backdrop-blur-2xl shadow-[0_18px_50px_-32px_rgba(0,0,0,0.85)] flex flex-col items-center py-6">
        <button
          className="relative flex items-center justify-center rounded-full transition-all duration-300 glass-profile w-16 h-16 hover:scale-105"
          onClick={() => onPanelChange(null)}
          aria-label="Close side panel"
        >
          <X className="w-6 h-6 text-foreground" />
        </button>

        <div className="mt-6 flex flex-col items-center gap-3">
          {menuItems.map((item) => (
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
              <span
                className={cn(
                  "absolute right-full mr-3 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
                  "glass-subtle text-foreground",
                  "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
                )}
              >
                {item.label}
              </span>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed top-6 right-6 z-50 flex flex-col items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        className={cn(
          "relative flex items-center justify-center rounded-full transition-all duration-500 ease-out",
          "glass-profile",
          isExpanded || isHovering ? "w-16 h-16" : "w-11 h-11 hover:scale-110",
          activePanel && "ring-2 ring-primary/50",
        )}
        onClick={() => activePanel && onPanelChange(null)}
        aria-label="Profile menu"
      >
        {activePanel ? (
          <X
            className={cn(
              "text-foreground transition-all duration-300",
              isExpanded ? "w-6 h-6" : "w-5 h-5",
            )}
          />
        ) : (
          <User
            className={cn(
              "text-foreground transition-all duration-300",
              isExpanded ? "w-7 h-7" : "w-5 h-5",
            )}
          />
        )}
        <div
          className={cn(
            "absolute inset-0 rounded-full bg-primary/20 blur-xl transition-opacity duration-500",
            isHovering ? "opacity-100" : "opacity-0",
          )}
        />
      </button>

      <div
        className={cn(
          "flex flex-col items-center gap-3 mt-4 transition-all duration-300",
          isExpanded ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
      >
        {menuItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => handleItemClick(item.id)}
            className={cn(
              "group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
              "glass-subtle hover:glass-profile",
              activePanel === item.id && "ring-2 ring-primary/60 bg-primary/10",
              isExpanded && cn("animate-menu-item-drop", menuDelayClass[index]),
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
            <span
              className={cn(
                "absolute right-full mr-3 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
                "glass-subtle text-foreground",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
        {onLogout && (
          <button
            onClick={onLogout}
            className={cn(
              "group relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-300",
              "glass-subtle hover:glass-profile",
              isExpanded && cn("animate-menu-item-drop", menuDelayClass[3] ?? ""),
            )}
            aria-label="Sign out"
          >
            <LogOut className="w-5 h-5 text-muted-foreground group-hover:text-destructive transition-colors duration-300" />
            <span
              className={cn(
                "absolute right-full mr-3 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap",
                "glass-subtle text-foreground",
                "opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none",
              )}
            >
              Sign out
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
