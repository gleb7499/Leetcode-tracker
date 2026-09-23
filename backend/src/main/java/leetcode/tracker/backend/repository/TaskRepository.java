package leetcode.tracker.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.TaskEntity;

public interface TaskRepository extends JpaRepository<TaskEntity, Long> {

    Optional<TaskEntity> findByIdentityKey(String identityKey);
}
