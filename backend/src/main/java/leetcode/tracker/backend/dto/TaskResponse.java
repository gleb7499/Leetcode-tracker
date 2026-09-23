package leetcode.tracker.backend.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record TaskResponse(
        Long id,
        String name,
        String url,
        String difficulty,
        List<String> topics,
        String notes,
        String source,
        String sourceMeta,
        String scheduleMode,
        Instant createdAt,
        LocalDate nextReview,
        List<ReviewEntry> reviews) {

    public record ReviewEntry(LocalDate date, String status) {
    }
}
