package leetcode.tracker.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.StateEntity;

public interface StateRepository extends JpaRepository<StateEntity, Integer> {

    Optional<StateEntity> findByCode(String code);
}
