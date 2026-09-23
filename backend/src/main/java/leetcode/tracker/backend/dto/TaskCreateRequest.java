package leetcode.tracker.backend.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record TaskCreateRequest(
        @NotBlank(message = "Name is required")
        @Size(max = 512, message = "Name must be at most 512 characters")
        String name,

        @Size(max = 1024, message = "URL must be at most 1024 characters")
        String url,

        @NotBlank(message = "Difficulty is required")
        @Size(max = 32, message = "Difficulty must be at most 32 characters")
        String difficulty,

        List<@Size(max = 128, message = "Topic must be at most 128 characters") String> topics,

        String notes,

        @Size(max = 32, message = "Schedule mode must be at most 32 characters")
        String scheduleMode) {
}
