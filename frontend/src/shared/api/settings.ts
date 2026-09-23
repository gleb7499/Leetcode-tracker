import { apiFetch } from "./client"

export interface ReviewPolicyValue {
  state: string
  baseIntervalDays: number
  growthFactor: number
  maxIntervalDays: number
}

export interface ReviewPolicyPreset {
  id: number
  code: string
  name: string
  description: string | null
  builtIn: boolean
  values: ReviewPolicyValue[]
}

export interface UserSettings {
  userId: number
  reviewPolicyPresetId: number | null
  notificationsEnabled: boolean
  soundEffectsEnabled: boolean
  dailyGoal: number
  reviewTime: string
  updatedAt: string
}

export interface SettingsPatch {
  /** Pass 0 to reset to the global default policy. */
  reviewPolicyPresetId?: number
  notificationsEnabled?: boolean
  soundEffectsEnabled?: boolean
  dailyGoal?: number
  /** "HH:mm" */
  reviewTime?: string
}

export interface MessagePayload {
  success: boolean
  message: string
}

export const settingsApi = {
  listReviewPolicies(): Promise<ReviewPolicyPreset[]> {
    return apiFetch<ReviewPolicyPreset[]>("/v1/review-policies")
  },

  get(): Promise<UserSettings> {
    return apiFetch<UserSettings>("/v1/me/settings")
  },

  patch(patch: SettingsPatch): Promise<UserSettings> {
    return apiFetch<UserSettings>("/v1/me/settings", { method: "PATCH", body: patch })
  },

  /** Downloads the full user dataset as a JSON attachment. */
  async exportBackup(): Promise<Blob> {
    return apiFetch<Blob>("/v1/me/backup", { responseType: "blob" })
  },

  importBackup(fileContent: string): Promise<MessagePayload> {
    return apiFetch<MessagePayload>("/v1/me/backup", {
      method: "POST",
      body: JSON.parse(fileContent) as unknown,
    })
  },

  changePassword(currentPassword: string, newPassword: string): Promise<MessagePayload> {
    return apiFetch<MessagePayload>("/v1/me/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    })
  },

  deleteAccount(password: string): Promise<unknown> {
    return apiFetch<unknown>("/v1/me", {
      method: "DELETE",
      body: { password },
      responseType: "none",
    })
  },
}
