package leetcode.tracker.backend.dto;

public record StatsSummaryResponse(
        long totalTasks,
        long activeTasks,
        long reviewedTasks,
        long totalReviews,
        long streakDays) {
}
