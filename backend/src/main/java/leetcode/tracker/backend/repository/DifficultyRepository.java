package leetcode.tracker.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.DifficultyEntity;

public interface DifficultyRepository extends JpaRepository<DifficultyEntity, Integer> {

    Optional<DifficultyEntity> findByLevel(String level);
}
