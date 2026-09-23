package leetcode.tracker.backend.dto;

import java.time.LocalTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import com.fasterxml.jackson.annotation.JsonFormat;

/**
 * Partial update of the user's settings. Null fields are left unchanged.
 * Set reviewPolicyPresetId to null explicitly to keep the current value;
 * pass 0 to reset to the global default policy.
 */
public record SettingsUpdateRequest(
        Integer reviewPolicyPresetId,
        Boolean notificationsEnabled,
        Boolean soundEffectsEnabled,
        @Min(value = 1, message = "Daily goal must be between 1 and 100")
        @Max(value = 100, message = "Daily goal must be between 1 and 100")
        Integer dailyGoal,
        @JsonFormat(pattern = "HH:mm")
        LocalTime reviewTime) {

    /** Sentinel meaning "reset to the global default policy" (no preset). */
    public static final int RESET_PRESET = 0;
}
