package leetcode.tracker.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.ReviewPolicyPresetEntity;

public interface ReviewPolicyPresetRepository extends JpaRepository<ReviewPolicyPresetEntity, Integer> {
}
