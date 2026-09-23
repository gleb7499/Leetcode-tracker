package leetcode.tracker.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import leetcode.tracker.backend.entity.UserTaskEntity;

public interface UserTaskRepository extends JpaRepository<UserTaskEntity, Long> {

    @EntityGraph(attributePaths = {"task", "task.difficulty", "currentState"})
    List<UserTaskEntity> findByUserIdOrderByNextReviewDateAsc(Long userId);

    @EntityGraph(attributePaths = {"task", "task.difficulty", "currentState"})
    List<UserTaskEntity> findByUserIdAndScheduleModeAndNextReviewDateLessThanEqualOrderByNextReviewDateAsc(
            Long userId, String scheduleMode, LocalDate date);

    Optional<UserTaskEntity> findByIdAndUserId(Long id, Long userId);

    Optional<UserTaskEntity> findByUserIdAndTaskId(Long userId, Long taskId);

    long countByTaskId(Long taskId);

    long countByUserId(Long userId);

    long countByUserIdAndScheduleMode(Long userId, String scheduleMode);

    @Query(value = """
            SELECT d.level AS label, COUNT(*) AS cnt
            FROM user_tasks ut
            JOIN tasks t ON ut.task_id = t.id
            JOIN difficulty d ON t.difficulty_id = d.id
            WHERE ut.user_id = ?1
            GROUP BY d.level
            """, nativeQuery = true)
    List<Object[]> countTasksByDifficulty(Long userId);

    @Query(value = """
            SELECT t.source_type AS label, COUNT(*) AS cnt
            FROM user_tasks ut
            JOIN tasks t ON ut.task_id = t.id
            WHERE ut.user_id = ?1
            GROUP BY t.source_type
            """, nativeQuery = true)
    List<Object[]> countTasksBySource(Long userId);

    @Query(value = """
            SELECT ut.next_review_date AS day, COUNT(*) AS cnt
            FROM user_tasks ut
            WHERE ut.user_id = ?1
              AND ut.schedule_mode = 'spaced_repetition'
              AND ut.next_review_date BETWEEN ?2 AND ?3
            GROUP BY ut.next_review_date
            ORDER BY ut.next_review_date
            """, nativeQuery = true)
    List<Object[]> countWorkloadBetween(Long userId, LocalDate from, LocalDate to);
}
