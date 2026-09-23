package leetcode.tracker.backend.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.UserTaskEntity;

public interface UserTaskRepository extends JpaRepository<UserTaskEntity, Long> {

    @EntityGraph(attributePaths = {"task", "task.difficulty", "currentState"})
    List<UserTaskEntity> findByUserIdOrderByNextReviewDateAsc(Long userId);

    @EntityGraph(attributePaths = {"task", "task.difficulty", "currentState"})
    List<UserTaskEntity> findByUserIdAndScheduleModeAndNextReviewDateLessThanEqualOrderByNextReviewDateAsc(
            Long userId, String scheduleMode, LocalDate date);

    Optional<UserTaskEntity> findByIdAndUserId(Long id, Long userId);

    long countByTaskId(Long taskId);
}
