package leetcode.tracker.backend.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.UserSettingsEntity;

public interface UserSettingsRepository extends JpaRepository<UserSettingsEntity, Long> {
}
