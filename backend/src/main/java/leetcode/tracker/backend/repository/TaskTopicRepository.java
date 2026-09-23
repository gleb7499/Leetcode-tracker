package leetcode.tracker.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.TaskTopicEntity;

public interface TaskTopicRepository extends JpaRepository<TaskTopicEntity, Long> {

    List<TaskTopicEntity> findByTaskId(Long taskId);

    Optional<TaskTopicEntity> findByTaskIdAndTopicId(Long taskId, Long topicId);

    void deleteByTaskId(Long taskId);
}
