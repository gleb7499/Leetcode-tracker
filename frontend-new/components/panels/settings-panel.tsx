"use client"

import { useState } from "react"
import { Bell, Moon, Target, Clock, Volume2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  className?: string
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const [settings, setSettings] = useState({
    dailyGoal: 10,
    notifications: true,
    soundEffects: true,
    darkMode: true,
    reviewTime: "09:00",
  })

  const updateSetting = <K extends keyof typeof settings>(key: K, value: typeof settings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <h2 className="text-xl font-semibold text-foreground">Settings</h2>
      
      <div className="glass-subtle rounded-2xl p-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-xl bg-primary/10">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Daily Goal</p>
            <p className="text-xs text-muted-foreground">Cards to review each day</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <input
            type="range"
            min="5"
            max="30"
            step="5"
            value={settings.dailyGoal}
            onChange={(e) => updateSetting("dailyGoal", parseInt(e.target.value))}
            className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="ml-4 text-lg font-bold text-foreground w-8 text-right">{settings.dailyGoal}</span>
        </div>
      </div>

      <div className="glass-subtle rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-accent/10">
              <Clock className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="font-medium text-foreground">Review Reminder</p>
              <p className="text-xs text-muted-foreground">Daily notification time</p>
            </div>
          </div>
          <input
            type="time"
            value={settings.reviewTime}
            onChange={(e) => updateSetting("reviewTime", e.target.value)}
            className="bg-secondary text-foreground px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <ToggleSetting
          icon={Bell}
          label="Notifications"
          description="Get reminded to practice"
          enabled={settings.notifications}
          onChange={(v) => updateSetting("notifications", v)}
          iconColor="text-chart-3"
        />
        
        <ToggleSetting
          icon={Volume2}
          label="Sound Effects"
          description="Play sounds on actions"
          enabled={settings.soundEffects}
          onChange={(v) => updateSetting("soundEffects", v)}
          iconColor="text-chart-4"
        />
        
        <ToggleSetting
          icon={Moon}
          label="Dark Mode"
          description="Always on for now"
          enabled={settings.darkMode}
          onChange={(v) => updateSetting("darkMode", v)}
          iconColor="text-chart-5"
          disabled
        />
      </div>
    </div>
  )
}

interface ToggleSettingProps {
  icon: React.ElementType
  label: string
  description: string
  enabled: boolean
  onChange: (value: boolean) => void
  iconColor?: string
  disabled?: boolean
}

function ToggleSetting({ icon: Icon, label, description, enabled, onChange, iconColor = "text-primary", disabled = false }: ToggleSettingProps) {
  return (
    <div className={cn("glass-subtle rounded-2xl p-4 flex items-center justify-between", disabled && "opacity-50")}>
      <div className="flex items-center gap-3">
        <div className={cn("p-2 rounded-xl", enabled ? "bg-primary/10" : "bg-secondary")}>
          <Icon className={cn("w-5 h-5", enabled ? iconColor : "text-muted-foreground")} />
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={cn("relative w-12 h-7 rounded-full transition-colors duration-300", enabled ? "bg-primary" : "bg-secondary", disabled && "cursor-not-allowed")}
      >
        <div className={cn("absolute top-1 w-5 h-5 rounded-full bg-foreground transition-all duration-300", enabled ? "left-6" : "left-1")} />
      </button>
    </div>
  )
}
