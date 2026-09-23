package leetcode.tracker.backend.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.TopicEntity;

public interface TopicRepository extends JpaRepository<TopicEntity, Long> {

    Optional<TopicEntity> findByName(String name);

    Optional<TopicEntity> findBySlug(String slug);
}
