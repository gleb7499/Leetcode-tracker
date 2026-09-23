import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsPanel } from "@/components/panels/settings-panel"
import { ApiError } from "@/src/shared/api/client"
import {
  settingsApi,
  type ReviewPolicyPreset,
  type UserSettings,
} from "@/src/shared/api/settings"

vi.mock("@/src/shared/api/settings", () => ({
  settingsApi: {
    listReviewPolicies: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    exportBackup: vi.fn(),
    importBackup: vi.fn(),
    changePassword: vi.fn(),
    deleteAccount: vi.fn(),
  },
}))

vi.mock("@/src/shared/api/session-store", () => ({
  clearSession: vi.fn(),
}))

import { clearSession } from "@/src/shared/api/session-store"

const mockedSettingsApi = vi.mocked(settingsApi)
const mockedClearSession = vi.mocked(clearSession)

function makeSettings(overrides: Partial<UserSettings> = {}): UserSettings {
  return {
    userId: 7,
    reviewPolicyPresetId: null,
    notificationsEnabled: true,
    soundEffectsEnabled: true,
    dailyGoal: 10,
    reviewTime: "09:00:00",
    updatedAt: "2026-09-23T00:00:00Z",
    ...overrides,
  }
}

function makePresets(): ReviewPolicyPreset[] {
  return [
    {
      id: 1,
      code: "gentle",
      name: "Gentle",
      description: "Shorter intervals",
      builtIn: true,
      values: [
        { state: "REMEMBER", baseIntervalDays: 1, growthFactor: 1.5, maxIntervalDays: 45 },
      ],
    },
    {
      id: 2,
      code: "intense",
      name: "Intense",
      description: "Longer intervals",
      builtIn: true,
      values: [
        { state: "REMEMBER", baseIntervalDays: 3, growthFactor: 2.5, maxIntervalDays: 180 },
      ],
    },
  ]
}

describe("SettingsPanel", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    })
    mockedSettingsApi.get.mockResolvedValue(makeSettings())
    mockedSettingsApi.listReviewPolicies.mockResolvedValue(makePresets())
    mockedSettingsApi.patch.mockImplementation((patch) =>
      Promise.resolve(makeSettings({ ...patch, reviewTime: patch.reviewTime ?? "09:00:00" })),
    )
  })

  it("loads settings and presets, and switches the repetition policy", async () => {
    const user = userEvent.setup()
    render(<SettingsPanel />)

    expect(await screen.findByText("Gentle")).toBeInTheDocument()
    expect(screen.getByText("Intense")).toBeInTheDocument()
    expect(screen.getByText("Global default")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /gentle/i }))

    await waitFor(() => {
      expect(mockedSettingsApi.patch).toHaveBeenCalledWith({ reviewPolicyPresetId: 1 })
    })
  })

  it("falls back to the global policy when 'Global default' is chosen", async () => {
    mockedSettingsApi.get.mockResolvedValue(makeSettings({ reviewPolicyPresetId: 1 }))
    const user = userEvent.setup()
    render(<SettingsPanel />)

    await user.click(await screen.findByRole("button", { name: /global default/i }))

    await waitFor(() => {
      expect(mockedSettingsApi.patch).toHaveBeenCalledWith({ reviewPolicyPresetId: 0 })
    })
  })

  it("exports the backup through the API", async () => {
    const user = userEvent.setup()
    mockedSettingsApi.exportBackup.mockResolvedValue(new Blob(["{}"], { type: "application/json" }))
    render(<SettingsPanel />)

    await user.click(await screen.findByRole("button", { name: /export backup/i }))

    await waitFor(() => {
      expect(mockedSettingsApi.exportBackup).toHaveBeenCalledTimes(1)
    })
    expect(await screen.findByText("Backup downloaded")).toBeInTheDocument()
  })

  it("imports a backup file after confirmation", async () => {
    const user = userEvent.setup()
    mockedSettingsApi.importBackup.mockResolvedValue({ success: true, message: "Backup imported" })
    render(<SettingsPanel />)

    const file = new File(["{\"format\":\"leetcode-tracker-backup\"}"], "backup.json", {
      type: "application/json",
    })
    await user.upload(await screen.findByTestId("backup-file-input"), file)
    await user.click(screen.getByRole("button", { name: /^import$/i }))

    await waitFor(() => {
      expect(mockedSettingsApi.importBackup).toHaveBeenCalledWith(
        "{\"format\":\"leetcode-tracker-backup\"}",
      )
    })
    expect(await screen.findByText("Backup imported")).toBeInTheDocument()
  })

  it("changes the password and surfaces validation errors", async () => {
    const user = userEvent.setup()
    mockedSettingsApi.changePassword.mockResolvedValue({
      success: true,
      message: "Password has been changed. Please sign in again.",
    })
    render(<SettingsPanel />)

    await user.type(await screen.findByPlaceholderText("Current password"), "old-password")
    await user.type(screen.getByPlaceholderText(/new password/i), "new-password")
    await user.click(screen.getByRole("button", { name: /^change password$/i }))

    await waitFor(() => {
      expect(mockedSettingsApi.changePassword).toHaveBeenCalledWith("old-password", "new-password")
    })
  })

  it("rejects too-short new passwords without calling the API", async () => {
    const user = userEvent.setup()
    render(<SettingsPanel />)

    await user.type(await screen.findByPlaceholderText("Current password"), "old-password")
    await user.type(screen.getByPlaceholderText(/new password/i), "short")
    await user.click(screen.getByRole("button", { name: /^change password$/i }))

    expect(await screen.findByText(/at least 8 characters/i)).toBeInTheDocument()
    expect(mockedSettingsApi.changePassword).not.toHaveBeenCalled()
  })

  it("deletes the account after confirmation and clears the local session", async () => {
    const user = userEvent.setup()
    mockedSettingsApi.deleteAccount.mockResolvedValue(undefined)
    render(<SettingsPanel />)

    await user.type(
      await screen.findByPlaceholderText(/enter your password/i),
      "password123",
    )
    await user.click(screen.getByRole("button", { name: /^delete account$/i }))
    await user.click(screen.getByRole("button", { name: /delete forever/i }))

    await waitFor(() => {
      expect(mockedSettingsApi.deleteAccount).toHaveBeenCalledWith("password123")
    })
    expect(mockedClearSession).toHaveBeenCalledTimes(1)
  })

  it("keeps the session and shows the error when deletion fails", async () => {
    const user = userEvent.setup()
    mockedSettingsApi.deleteAccount.mockRejectedValue(
      new ApiError(401, "UNAUTHORIZED", "Password is incorrect"),
    )
    render(<SettingsPanel />)

    await user.type(
      await screen.findByPlaceholderText(/enter your password/i),
      "wrong-password",
    )
    await user.click(screen.getByRole("button", { name: /^delete account$/i }))
    await user.click(screen.getByRole("button", { name: /delete forever/i }))

    expect(await screen.findByText("Password is incorrect")).toBeInTheDocument()
    expect(mockedClearSession).not.toHaveBeenCalled()
  })
})
