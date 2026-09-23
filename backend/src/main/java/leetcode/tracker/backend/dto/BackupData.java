package leetcode.tracker.backend.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Backup file format (camelCase JSON). Contains no password hashes,
 * tokens, or internal ids: tasks are matched by identityKey on import,
 * reviews are matched by (state, reviewedAt).
 */
@JsonIgnoreProperties(ignoreUnknown = true)
public record BackupData(
        String format,
        Integer version,
        Instant exportedAt,
        UserBackup user,
        SettingsBackup settings,
        List<TaskBackup> tasks) {

    public static final String FORMAT = "leetcode-tracker-backup";
    public static final int VERSION = 1;

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record UserBackup(String email, String name, Instant createdAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record SettingsBackup(
            String reviewPolicyPresetCode,
            boolean notificationsEnabled,
            boolean soundEffectsEnabled,
            int dailyGoal,
            LocalTime reviewTime) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record TaskBackup(
            String identityKey,
            String title,
            String link,
            String sourceType,
            String sourceProblemId,
            String sourceMeta,
            String difficulty,
            List<String> topics,
            String notes,
            String scheduleMode,
            String currentState,
            LocalDate lastReviewDate,
            LocalDate nextReviewDate,
            Instant createdAt,
            List<ReviewBackup> reviews) {

        @JsonIgnoreProperties(ignoreUnknown = true)
        public record ReviewBackup(
                String state,
                Instant reviewedAt,
                int intervalDays,
                LocalDate nextReviewDate,
                String reviewText) {
        }
    }
}
