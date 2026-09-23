package leetcode.tracker.backend.dto;

public record RecallQualityResponse(
        long forgot,
        long partial,
        long remember,
        long total) {
}
