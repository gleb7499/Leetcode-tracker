package leetcode.tracker.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.UserReviewEntity;

public interface UserReviewRepository extends JpaRepository<UserReviewEntity, Long> {

    List<UserReviewEntity> findByUserTaskIdOrderByReviewedAtAsc(Long userTaskId);
}
