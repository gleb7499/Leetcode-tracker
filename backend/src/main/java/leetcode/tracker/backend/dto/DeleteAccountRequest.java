package leetcode.tracker.backend.dto;

import jakarta.validation.constraints.NotBlank;

public record DeleteAccountRequest(
        @NotBlank(message = "Password confirmation is required") String password) {
}
