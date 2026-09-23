import { useCallback, useEffect, useRef, useState } from "react"
import {
  Bell,
  Clock,
  Download,
  KeyRound,
  Moon,
  Repeat,
  ShieldAlert,
  Target,
  Trash2,
  Upload,
  Volume2,
} from "@/src/shared/resources/icons"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { ApiError } from "@/src/shared/api/client"
import { clearSession } from "@/src/shared/api/session-store"
import {
  settingsApi,
  type ReviewPolicyPreset,
  type UserSettings,
} from "@/src/shared/api/settings"
import { cn } from "@/lib/utils"

interface SettingsPanelProps {
  className?: string
}

export function SettingsPanel({ className }: SettingsPanelProps) {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [presets, setPresets] = useState<ReviewPolicyPreset[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([settingsApi.get(), settingsApi.listReviewPolicies()])
      .then(([s, p]) => {
        if (!cancelled) {
          setSettings(s)
          setPresets(p)
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof ApiError ? error.message : "Could not load settings")
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const patchSettings = useCallback(
    async (patch: Parameters<typeof settingsApi.patch>[0]) => {
      const updated = await settingsApi.patch(patch)
      setSettings(updated)
    },
    [],
  )

  const handlePatchError = useCallback((error: unknown, fallback: string) => {
    setNotice(error instanceof ApiError ? error.message : fallback)
  }, [])

  if (loadError) {
    return (
      <div className={cn("flex flex-col gap-6 p-6", className)}>
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-destructive">{loadError}</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className={cn("flex flex-col gap-6 p-6", className)}>
        <h2 className="text-xl font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-6 p-6", className)}>
      <h2 className="text-xl font-semibold text-foreground">Settings</h2>

      {notice && (
        <div className="glass-subtle rounded-2xl p-3 text-sm text-foreground" role="status">
          {notice}
        </div>
      )}

      <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10">
            <Repeat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">Repetition policy</p>
            <p className="text-xs text-muted-foreground">How review intervals grow per outcome</p>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <PolicyOption
            name="Global default"
            description="Built-in intervals from the server configuration"
            selected={settings.reviewPolicyPresetId === null}
            onSelect={() =>
              patchSettings({ reviewPolicyPresetId: 0 }).catch((error: unknown) =>
                handlePatchError(error, "Could not update policy"),
              )
            }
          />
          {presets.map((preset) => (
            <PolicyOption
              key={preset.id}
              name={preset.name}
              description={presetDescription(preset)}
              selected={settings.reviewPolicyPresetId === preset.id}
              onSelect={() =>
                patchSettings({ reviewPolicyPresetId: preset.id }).catch((error: unknown) =>
                  handlePatchError(error, "Could not update policy"),
                )
              }
            />
          ))}
        </div>
      </div>

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
            min={5}
            max={30}
            step={5}
            value={settings.dailyGoal}
            onChange={(event) =>
              setSettings((prev) =>
                prev ? { ...prev, dailyGoal: Number(event.target.value) } : prev,
              )
            }
            onMouseUp={(event) =>
              patchSettings({ dailyGoal: Number((event.target as HTMLInputElement).value) }).catch(
                (error: unknown) => handlePatchError(error, "Could not save daily goal"),
              )
            }
            className="flex-1 h-2 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
          />
          <span className="ml-4 text-lg font-bold text-foreground w-8 text-right">
            {settings.dailyGoal}
          </span>
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
            value={settings.reviewTime.slice(0, 5)}
            onChange={(event) =>
              patchSettings({ reviewTime: event.target.value }).catch((error: unknown) =>
                handlePatchError(error, "Could not save reminder time"),
              )
            }
            className="bg-secondary text-foreground px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <ToggleSetting
          icon={Bell}
          label="Notifications"
          description="Get reminded to practice"
          enabled={settings.notificationsEnabled}
          onChange={(value) =>
            patchSettings({ notificationsEnabled: value }).catch((error: unknown) =>
              handlePatchError(error, "Could not save notifications"),
            )
          }
          iconColor="text-chart-3"
        />

        <ToggleSetting
          icon={Volume2}
          label="Sound Effects"
          description="Play sounds on actions"
          enabled={settings.soundEffectsEnabled}
          onChange={(value) =>
            patchSettings({ soundEffectsEnabled: value }).catch((error: unknown) =>
              handlePatchError(error, "Could not save sound effects"),
            )
          }
          iconColor="text-chart-4"
        />

        <ToggleSetting
          icon={Moon}
          label="Dark Mode"
          description="Always on for now"
          enabled
          onChange={() => undefined}
          iconColor="text-chart-5"
          disabled
        />
      </div>

      <BackupSection onNotice={setNotice} />
      <ChangePasswordSection onNotice={setNotice} />
      <DeleteAccountSection onNotice={setNotice} />
    </div>
  )
}

function presetDescription(preset: ReviewPolicyPreset): string {
  const remember = preset.values.find((value) => value.state === "REMEMBER")
  if (!remember) {
    return preset.description ?? ""
  }
  const growth = Number.isInteger(remember.growthFactor)
    ? String(remember.growthFactor)
    : remember.growthFactor.toFixed(1)
  return `Remember: +${remember.baseIntervalDays}d base, x${growth} growth, max ${remember.maxIntervalDays}d`
}

interface PolicyOptionProps {
  name: string
  description: string
  selected: boolean
  onSelect: () => void
}

function PolicyOption({ name, description, selected, onSelect }: PolicyOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        selected
          ? "border-primary/50 bg-primary/10"
          : "border-white/8 bg-secondary/40 hover:bg-secondary/70",
      )}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{name}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div
        className={cn(
          "w-4 h-4 rounded-full border-2 shrink-0",
          selected ? "border-primary bg-primary" : "border-muted-foreground/40",
        )}
      />
    </button>
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

function BackupSection({ onNotice }: { onNotice: (message: string) => void }) {
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleExport = async () => {
    setIsBusy(true)
    try {
      const blob = await settingsApi.exportBackup()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "leetcode-tracker-backup.json"
      anchor.click()
      URL.revokeObjectURL(url)
      onNotice("Backup downloaded")
    } catch (error) {
      onNotice(error instanceof ApiError ? error.message : "Export failed")
    } finally {
      setIsBusy(false)
    }
  }

  const handleImportFile = async (file: File) => {
    setIsBusy(true)
    try {
      const content = await file.text()
      const result = await settingsApi.importBackup(content)
      onNotice(result.message)
    } catch (error) {
      onNotice(error instanceof ApiError ? error.message : "Import failed")
    } finally {
      setIsBusy(false)
      setIsImportDialogOpen(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  return (
    <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-chart-3/10">
          <ShieldAlert className="w-5 h-5 text-chart-3" />
        </div>
        <div>
          <p className="font-medium text-foreground">Data backup</p>
          <p className="text-xs text-muted-foreground">
            Your data stays on this machine — save a copy anywhere
          </p>
        </div>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void handleExport()}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-primary/20 text-primary hover:bg-primary/28 transition-all duration-200 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          Export backup
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl glass-subtle text-foreground/90 hover:text-foreground transition-all duration-200 disabled:opacity-50"
        >
          <Upload className="w-4 h-4" />
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          data-testid="backup-file-input"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) {
              setIsImportDialogOpen(true)
            }
          }}
        />
      </div>
      <ConfirmDialog
        isOpen={isImportDialogOpen}
        title="Import backup?"
        description="Tasks, review history, statistics and settings from the file will be merged into your library. Importing the same file twice never creates duplicates."
        confirmLabel="Import"
        cancelLabel="Cancel"
        confirmVariant="primary"
        onConfirm={() => {
          const file = fileInputRef.current?.files?.[0]
          if (file) {
            void handleImportFile(file)
          } else {
            setIsImportDialogOpen(false)
          }
        }}
        onCancel={() => {
          setIsImportDialogOpen(false)
          if (fileInputRef.current) {
            fileInputRef.current.value = ""
          }
        }}
      />
    </div>
  )
}

function ChangePasswordSection({ onNotice }: { onNotice: (message: string) => void }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isBusy, setIsBusy] = useState(false)

  const handleSubmit = async () => {
    if (newPassword.length < 8) {
      onNotice("New password must be at least 8 characters")
      return
    }
    setIsBusy(true)
    try {
      const result = await settingsApi.changePassword(currentPassword, newPassword)
      onNotice(result.message)
      setCurrentPassword("")
      setNewPassword("")
    } catch (error) {
      onNotice(error instanceof ApiError ? error.message : "Could not change password")
    } finally {
      setIsBusy(false)
    }
  }

  return (
    <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-chart-4/10">
          <KeyRound className="w-5 h-5 text-chart-4" />
        </div>
        <div>
          <p className="font-medium text-foreground">Change password</p>
          <p className="text-xs text-muted-foreground">All sessions are signed out afterwards</p>
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <input
          type="password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          className="bg-secondary text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <input
          type="password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          placeholder="New password (min 8 characters)"
          autoComplete="new-password"
          className="bg-secondary text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={isBusy || !currentPassword || !newPassword}
          className="px-4 py-2.5 rounded-2xl bg-primary/20 text-primary hover:bg-primary/28 transition-all duration-200 disabled:opacity-50"
        >
          Change password
        </button>
      </div>
    </div>
  )
}

function DeleteAccountSection({ onNotice }: { onNotice: (message: string) => void }) {
  const [password, setPassword] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isBusy, setIsBusy] = useState(false)

  const handleDelete = async () => {
    setIsBusy(true)
    try {
      await settingsApi.deleteAccount(password)
      clearSession()
    } catch (error) {
      onNotice(error instanceof ApiError ? error.message : "Could not delete account")
      setIsBusy(false)
      setIsDialogOpen(false)
    }
  }

  return (
    <div className="glass-subtle rounded-2xl p-4 flex flex-col gap-3 border border-destructive/20">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-destructive/15">
          <Trash2 className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <p className="font-medium text-foreground">Delete account</p>
          <p className="text-xs text-muted-foreground">
            Removes your tasks, review history, settings and sessions permanently
          </p>
        </div>
      </div>
      <input
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter your password to confirm"
        autoComplete="current-password"
        className="bg-secondary text-foreground px-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
      />
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        disabled={!password}
        className="px-4 py-2.5 rounded-2xl bg-destructive/18 text-destructive hover:bg-destructive/24 transition-all duration-200 disabled:opacity-50"
      >
        Delete account
      </button>
      <ConfirmDialog
        isOpen={isDialogOpen}
        title="Delete account permanently?"
        description="This erases every task, review and statistic of yours from this server. There is no undo. Consider exporting a backup first."
        confirmLabel={isBusy ? "Deleting…" : "Delete forever"}
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => {
          if (!isBusy) {
            setIsDialogOpen(false)
          }
        }}
      />
    </div>
  )
}
