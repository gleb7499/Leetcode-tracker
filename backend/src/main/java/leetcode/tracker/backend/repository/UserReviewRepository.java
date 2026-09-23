package leetcode.tracker.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import leetcode.tracker.backend.entity.UserReviewEntity;

public interface UserReviewRepository extends JpaRepository<UserReviewEntity, Long> {

    List<UserReviewEntity> findByUserTaskIdOrderByReviewedAtAsc(Long userTaskId);

    @Query(value = """
            SELECT COUNT(*)
            FROM user_reviews r
            JOIN user_tasks ut ON r.user_task_id = ut.id
            WHERE ut.user_id = ?1
            """, nativeQuery = true)
    long countByUserId(Long userId);

    @Query(value = """
            SELECT COUNT(DISTINCT r.user_task_id)
            FROM user_reviews r
            JOIN user_tasks ut ON r.user_task_id = ut.id
            WHERE ut.user_id = ?1
            """, nativeQuery = true)
    long countReviewedTasksByUserId(Long userId);

    @Query(value = """
            SELECT DISTINCT CAST(r.reviewed_at AT TIME ZONE 'UTC' AS date)
            FROM user_reviews r
            JOIN user_tasks ut ON r.user_task_id = ut.id
            WHERE ut.user_id = ?1
            """, nativeQuery = true)
    List<Object> findDistinctReviewDatesByUserId(Long userId);

    @Query(value = """
            SELECT s.code AS label, COUNT(*) AS cnt
            FROM user_reviews r
            JOIN user_tasks ut ON r.user_task_id = ut.id
            JOIN states s ON r.state_id = s.id
            WHERE ut.user_id = ?1
            GROUP BY s.code
            """, nativeQuery = true)
    List<Object[]> countByOutcomeForUser(Long userId);
}
