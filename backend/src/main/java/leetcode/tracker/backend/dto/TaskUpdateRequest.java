package leetcode.tracker.backend.dto;

import jakarta.validation.constraints.Size;

public record TaskUpdateRequest(
        String notes,

        @Size(max = 32, message = "Schedule mode must be at most 32 characters")
        String scheduleMode) {
}
