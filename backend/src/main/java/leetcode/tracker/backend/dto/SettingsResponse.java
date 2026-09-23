package leetcode.tracker.backend.dto;

import java.time.Instant;
import java.time.LocalTime;

public record SettingsResponse(
        Long userId,
        Integer reviewPolicyPresetId,
        boolean notificationsEnabled,
        boolean soundEffectsEnabled,
        int dailyGoal,
        LocalTime reviewTime,
        Instant updatedAt) {
}
