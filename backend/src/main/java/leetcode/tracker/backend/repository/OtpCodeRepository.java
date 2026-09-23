package leetcode.tracker.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.OtpCodeEntity;
import leetcode.tracker.backend.service.OtpPurpose;

public interface OtpCodeRepository extends JpaRepository<OtpCodeEntity, Long> {

    Optional<OtpCodeEntity> findTopByUserIdAndPurposeOrderByCreatedAtDesc(Long userId, OtpPurpose purpose);
}
