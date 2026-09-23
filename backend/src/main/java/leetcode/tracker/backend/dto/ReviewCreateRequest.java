package leetcode.tracker.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewCreateRequest(
        @NotBlank(message = "Status is required")
        @Size(max = 32, message = "Status must be at most 32 characters")
        String status) {
}
