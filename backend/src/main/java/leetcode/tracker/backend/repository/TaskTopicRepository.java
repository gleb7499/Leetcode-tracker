package leetcode.tracker.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import leetcode.tracker.backend.entity.TaskTopicEntity;

public interface TaskTopicRepository extends JpaRepository<TaskTopicEntity, Long> {

    List<TaskTopicEntity> findByTaskId(Long taskId);

    void deleteByTaskId(Long taskId);
}
