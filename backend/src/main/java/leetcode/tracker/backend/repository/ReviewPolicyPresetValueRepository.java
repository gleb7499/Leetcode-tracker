package leetcode.tracker.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.ReviewPolicyPresetValueEntity;
import leetcode.tracker.backend.entity.ReviewPolicyPresetValueId;

public interface ReviewPolicyPresetValueRepository
        extends JpaRepository<ReviewPolicyPresetValueEntity, ReviewPolicyPresetValueId> {

    List<ReviewPolicyPresetValueEntity> findByPresetIdOrderByStateId(Integer presetId);
}
