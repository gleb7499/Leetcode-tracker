package leetcode.tracker.backend.error;

public record ErrorResponse(String code, String message, String requestId) {
}
