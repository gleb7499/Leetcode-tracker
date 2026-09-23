package leetcode.tracker.backend.service;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

import leetcode.tracker.backend.dto.DayWorkload;
import leetcode.tracker.backend.dto.DifficultyCount;
import leetcode.tracker.backend.dto.RecallQualityResponse;
import leetcode.tracker.backend.dto.SourceCount;
import leetcode.tracker.backend.dto.StatsSummaryResponse;
import leetcode.tracker.backend.entity.UserTaskEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.UserReviewRepository;
import leetcode.tracker.backend.repository.UserTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class StatsService {

    public static final int DEFAULT_WORKLOAD_DAYS = 7;
    public static final int MAX_WORKLOAD_DAYS = 90;
    private static final List<String> DIFFICULTY_ORDER = List.of("EASY", "MEDIUM", "HARD");
    private static final List<String> OUTCOME_ORDER = List.of("FORGOT", "PARTIAL", "REMEMBER");

    private final UserTaskRepository userTaskRepository;
    private final UserReviewRepository userReviewRepository;

    public StatsService(UserTaskRepository userTaskRepository,
            UserReviewRepository userReviewRepository) {
        this.userTaskRepository = userTaskRepository;
        this.userReviewRepository = userReviewRepository;
    }

    @Transactional(readOnly = true)
    public StatsSummaryResponse summary(Long userId) {
        long totalTasks = userTaskRepository.countByUserId(userId);
        long activeTasks = userTaskRepository.countByUserIdAndScheduleMode(
                userId, UserTaskEntity.MODE_SPACED_REPETITION);
        long reviewedTasks = userReviewRepository.countReviewedTasksByUserId(userId);
        long totalReviews = userReviewRepository.countByUserId(userId);
        return new StatsSummaryResponse(totalTasks, activeTasks, reviewedTasks, totalReviews,
                streakDays(userId));
    }

    @Transactional(readOnly = true)
    public List<DifficultyCount> difficultyDistribution(Long userId) {
        Map<String, Long> counts = toCountMap(userTaskRepository.countTasksByDifficulty(userId));
        return DIFFICULTY_ORDER.stream()
                .map(level -> new DifficultyCount(level, counts.getOrDefault(level, 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<SourceCount> sourceDistribution(Long userId) {
        Map<String, Long> counts = toCountMap(userTaskRepository.countTasksBySource(userId));
        List<SourceCount> result = counts.entrySet().stream()
                .map(e -> new SourceCount(e.getKey(), e.getValue()))
                .sorted(java.util.Comparator.comparing(SourceCount::source))
                .toList();
        return result;
    }

    @Transactional(readOnly = true)
    public RecallQualityResponse recallQuality(Long userId) {
        Map<String, Long> counts = toCountMap(userReviewRepository.countByOutcomeForUser(userId));
        long forgot = counts.getOrDefault("FORGOT", 0L);
        long partial = counts.getOrDefault("PARTIAL", 0L);
        long remember = counts.getOrDefault("REMEMBER", 0L);
        return new RecallQualityResponse(forgot, partial, remember, forgot + partial + remember);
    }

    @Transactional(readOnly = true)
    public List<DayWorkload> upcomingWorkload(Long userId, Integer days) {
        int window = days == null ? DEFAULT_WORKLOAD_DAYS : days;
        if (window < 1 || window > MAX_WORKLOAD_DAYS) {
            throw ApiException.validation("days must be between 1 and " + MAX_WORKLOAD_DAYS);
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate end = today.plusDays(window - 1);
        Map<LocalDate, Long> counts = new HashMap<>();
        for (Object[] row : userTaskRepository.countWorkloadBetween(userId, today, end)) {
            counts.put(toLocalDate(row[0]), ((Number) row[1]).longValue());
        }
        List<DayWorkload> result = new ArrayList<>(window);
        for (int i = 0; i < window; i++) {
            LocalDate day = today.plusDays(i);
            result.add(new DayWorkload(day, counts.getOrDefault(day, 0L)));
        }
        return result;
    }

    /**
     * Streak = number of consecutive UTC calendar days with at least one review,
     * counting back from today; if nothing was reviewed today yet, the streak is not
     * broken and counting starts from yesterday.
     */
    private long streakDays(Long userId) {
        Set<LocalDate> reviewDays = new TreeSet<>();
        for (Object d : userReviewRepository.findDistinctReviewDatesByUserId(userId)) {
            reviewDays.add(toLocalDate(d));
        }
        if (reviewDays.isEmpty()) {
            return 0;
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        LocalDate cursor = reviewDays.contains(today) ? today : today.minusDays(1);
        long streak = 0;
        while (reviewDays.contains(cursor)) {
            streak++;
            cursor = cursor.minusDays(1);
        }
        return streak;
    }

    private Map<String, Long> toCountMap(List<Object[]> rows) {
        Map<String, Long> counts = new HashMap<>();
        for (Object[] row : rows) {
            counts.put((String) row[0], ((Number) row[1]).longValue());
        }
        return counts;
    }

    private LocalDate toLocalDate(Object value) {
        return value instanceof java.sql.Date date ? date.toLocalDate() : (LocalDate) value;
    }
}
