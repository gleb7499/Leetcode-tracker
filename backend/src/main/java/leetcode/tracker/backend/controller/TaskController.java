package leetcode.tracker.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import leetcode.tracker.backend.dto.ReviewCreateRequest;
import leetcode.tracker.backend.dto.TaskCreateRequest;
import leetcode.tracker.backend.dto.TaskResponse;
import leetcode.tracker.backend.dto.TaskUpdateRequest;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.service.TaskService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    @GetMapping("/today")
    public List<TaskResponse> todayQueue(Authentication authentication) {
        return taskService.todayQueue(currentUserId(authentication));
    }

    @GetMapping
    public List<TaskResponse> list(Authentication authentication) {
        return taskService.listTasks(currentUserId(authentication));
    }

    @PostMapping
    public ResponseEntity<TaskResponse> create(Authentication authentication,
            @Valid @RequestBody TaskCreateRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(taskService.createTask(currentUserId(authentication), request));
    }

    @GetMapping("/{taskId}")
    public TaskResponse get(Authentication authentication, @PathVariable Long taskId) {
        return taskService.getTask(currentUserId(authentication), taskId);
    }

    @PutMapping("/{taskId}")
    public TaskResponse update(Authentication authentication, @PathVariable Long taskId,
            @Valid @RequestBody TaskUpdateRequest request) {
        return taskService.updateTask(currentUserId(authentication), taskId, request);
    }

    @DeleteMapping("/{taskId}")
    public ResponseEntity<Void> delete(Authentication authentication, @PathVariable Long taskId) {
        taskService.deleteTask(currentUserId(authentication), taskId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{taskId}/reviews")
    public TaskResponse recordReview(Authentication authentication, @PathVariable Long taskId,
            @Valid @RequestBody ReviewCreateRequest request) {
        return taskService.recordReview(currentUserId(authentication), taskId, request);
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw ApiException.unauthorized("Missing or invalid session");
        }
        return (Long) authentication.getPrincipal();
    }
}
