package leetcode.tracker.backend.service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import leetcode.tracker.backend.dto.ReviewCreateRequest;
import leetcode.tracker.backend.dto.TaskCreateRequest;
import leetcode.tracker.backend.dto.TaskResponse;
import leetcode.tracker.backend.dto.TaskUpdateRequest;
import leetcode.tracker.backend.entity.DifficultyEntity;
import leetcode.tracker.backend.entity.ReviewPolicyEntity;
import leetcode.tracker.backend.entity.StateEntity;
import leetcode.tracker.backend.entity.TaskEntity;
import leetcode.tracker.backend.entity.TaskTopicEntity;
import leetcode.tracker.backend.entity.TopicEntity;
import leetcode.tracker.backend.entity.UserReviewEntity;
import leetcode.tracker.backend.entity.UserTaskEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.DifficultyRepository;
import leetcode.tracker.backend.repository.ReviewPolicyRepository;
import leetcode.tracker.backend.repository.StateRepository;
import leetcode.tracker.backend.repository.TaskRepository;
import leetcode.tracker.backend.repository.TaskTopicRepository;
import leetcode.tracker.backend.repository.TopicRepository;
import leetcode.tracker.backend.repository.UserReviewRepository;
import leetcode.tracker.backend.repository.UserTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {

    private static final Set<String> KNOWN_STATES = Set.of("FORGOT", "PARTIAL", "REMEMBER");

    private final TaskRepository taskRepository;
    private final UserTaskRepository userTaskRepository;
    private final UserReviewRepository userReviewRepository;
    private final TaskTopicRepository taskTopicRepository;
    private final TopicRepository topicRepository;
    private final DifficultyRepository difficultyRepository;
    private final StateRepository stateRepository;
    private final ReviewPolicyRepository reviewPolicyRepository;
    private final LeetCodeUrlParser urlParser;

    public TaskService(TaskRepository taskRepository,
            UserTaskRepository userTaskRepository,
            UserReviewRepository userReviewRepository,
            TaskTopicRepository taskTopicRepository,
            TopicRepository topicRepository,
            DifficultyRepository difficultyRepository,
            StateRepository stateRepository,
            ReviewPolicyRepository reviewPolicyRepository,
            LeetCodeUrlParser urlParser) {
        this.taskRepository = taskRepository;
        this.userTaskRepository = userTaskRepository;
        this.userReviewRepository = userReviewRepository;
        this.taskTopicRepository = taskTopicRepository;
        this.topicRepository = topicRepository;
        this.difficultyRepository = difficultyRepository;
        this.stateRepository = stateRepository;
        this.reviewPolicyRepository = reviewPolicyRepository;
        this.urlParser = urlParser;
    }

    @Transactional
    public TaskResponse createTask(Long userId, TaskCreateRequest request) {
        Optional<LeetCodeUrlParser.ParsedUrl> parsed = urlParser.parse(request.url());
        String source = parsed.isPresent() ? LeetCodeUrlParser.SOURCE_LEETCODE : LeetCodeUrlParser.SOURCE_MANUAL;
        String identityKey = parsed
                .map(p -> "leetcode:" + p.slug())
                .orElseGet(() -> request.url() != null && !request.url().isBlank()
                        ? "link:" + request.url().trim()
                        : "manual:" + request.name().trim().toLowerCase(Locale.ROOT));

        // Adding an existing task is idempotent: reuse the shared card and the user's relation.
        Optional<UserTaskEntity> existing = userTaskRepository.findByUserIdOrderByNextReviewDateAsc(userId).stream()
                .filter(ut -> ut.getTask().getIdentityKey().equals(identityKey))
                .findFirst();
        if (existing.isPresent()) {
            return toResponse(existing.get());
        }

        TaskEntity task = taskRepository.findByIdentityKey(identityKey).orElseGet(() -> {
            TaskEntity fresh = new TaskEntity();
            fresh.setIdentityKey(identityKey);
            fresh.setSourceType(source);
            fresh.setSourceProblemId(parsed.map(LeetCodeUrlParser.ParsedUrl::slug).orElse(identityKey));
            fresh.setSourceMeta(parsed.map(LeetCodeUrlParser.ParsedUrl::url).orElse(request.url()));
            fresh.setTitle(request.name().trim());
            fresh.setLink(request.url() != null && !request.url().isBlank() ? request.url().trim() : null);
            fresh.setDifficulty(resolveDifficulty(request.difficulty()));
            TaskEntity saved = taskRepository.save(fresh);
            attachTopics(saved, request.topics());
            return saved;
        });

        StateEntity initialState = stateRepository.findByCode("REMEMBER")
                .orElseThrow(() -> ApiException.internal("Review states are not seeded"));
        UserTaskEntity userTask = new UserTaskEntity();
        userTask.setUserId(userId);
        userTask.setTask(task);
        userTask.setCurrentState(initialState);
        userTask.setNextReviewDate(LocalDate.now());
        userTask.setUserNotes(request.notes());
        userTask.setScheduleMode(resolveScheduleMode(request.scheduleMode()));
        return toResponse(userTaskRepository.save(userTask));
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> listTasks(Long userId) {
        return userTaskRepository.findByUserIdOrderByNextReviewDateAsc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TaskResponse> todayQueue(Long userId) {
        return userTaskRepository
                .findByUserIdAndScheduleModeAndNextReviewDateLessThanEqualOrderByNextReviewDateAsc(
                        userId, UserTaskEntity.MODE_SPACED_REPETITION, LocalDate.now())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public TaskResponse getTask(Long userId, Long taskId) {
        return toResponse(loadUserTask(userId, taskId));
    }

    @Transactional
    public TaskResponse updateTask(Long userId, Long taskId, TaskUpdateRequest request) {
        UserTaskEntity userTask = loadUserTask(userId, taskId);
        if (request.notes() != null) {
            userTask.setUserNotes(request.notes());
        }
        if (request.scheduleMode() != null) {
            userTask.setScheduleMode(resolveScheduleMode(request.scheduleMode()));
        }
        userTask.touch();
        return toResponse(userTaskRepository.save(userTask));
    }

    @Transactional
    public void deleteTask(Long userId, Long taskId) {
        Optional<UserTaskEntity> userTask = userTaskRepository.findByIdAndUserId(taskId, userId);
        if (userTask.isEmpty()) {
            return; // idempotent removal
        }
        Long sharedTaskId = userTask.get().getTask().getId();
        userTaskRepository.delete(userTask.get());
        if (userTaskRepository.countByTaskId(sharedTaskId) == 0) {
            taskTopicRepository.deleteByTaskId(sharedTaskId);
            taskRepository.deleteById(sharedTaskId);
        }
    }

    @Transactional
    public TaskResponse recordReview(Long userId, Long taskId, ReviewCreateRequest request) {
        UserTaskEntity userTask = loadUserTask(userId, taskId);
        String code = request.status().trim().toUpperCase(Locale.ROOT);
        if (!KNOWN_STATES.contains(code)) {
            throw ApiException.validation("Status must be one of: forgot, partial, remember");
        }
        StateEntity state = stateRepository.findByCode(code)
                .orElseThrow(() -> ApiException.internal("Review states are not seeded"));
        ReviewPolicyEntity policy = reviewPolicyRepository.findByStateIdAndActiveTrue(state.getId())
                .orElseThrow(() -> ApiException.internal("No active review policy for state " + code));

        LocalDate today = LocalDate.now();
        long currentInterval = userTask.getLastReviewDate() != null && userTask.getNextReviewDate() != null
                ? ChronoUnit.DAYS.between(userTask.getLastReviewDate(), userTask.getNextReviewDate())
                : 0;
        int interval = nextInterval(code, policy, currentInterval);
        LocalDate nextReview = today.plusDays(interval);

        userTask.setCurrentState(state);
        userTask.setLastReviewDate(today);
        userTask.setNextReviewDate(nextReview);
        userTask.touch();
        userTaskRepository.save(userTask);

        userReviewRepository.save(new UserReviewEntity(
                userTask.getId(), state, Instant.now(), interval, nextReview, null));
        return toResponse(userTask);
    }

    /**
     * Interval policy per contract scheduling semantics: remember grows the interval,
     * partial keeps it, forgot resets to the short base interval. Values come from the
     * review_policies reference table; always clamped to [1, max_interval_days].
     */
    private int nextInterval(String code, ReviewPolicyEntity policy, long currentInterval) {
        if (currentInterval <= 0) {
            return policy.getBaseIntervalDays();
        }
        long next = switch (code) {
            case "REMEMBER" -> Math.round(currentInterval * policy.getGrowthFactor());
            case "PARTIAL" -> currentInterval;
            default -> policy.getBaseIntervalDays();
        };
        next = Math.max(1, Math.min(next, policy.getMaxIntervalDays()));
        return (int) next;
    }

    private UserTaskEntity loadUserTask(Long userId, Long taskId) {
        return userTaskRepository.findByIdAndUserId(taskId, userId)
                .orElseThrow(() -> ApiException.notFound("Task not found"));
    }

    private DifficultyEntity resolveDifficulty(String difficulty) {
        return difficultyRepository.findByLevel(difficulty.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.validation(
                        "Difficulty must be one of: EASY, MEDIUM, HARD"));
    }

    private String resolveScheduleMode(String scheduleMode) {
        if (scheduleMode == null || scheduleMode.isBlank()) {
            return UserTaskEntity.MODE_SPACED_REPETITION;
        }
        String mode = scheduleMode.trim();
        if (!UserTaskEntity.MODE_SPACED_REPETITION.equals(mode) && !UserTaskEntity.MODE_DISABLED.equals(mode)) {
            throw ApiException.validation(
                    "Schedule mode must be one of: spaced_repetition, disabled");
        }
        return mode;
    }

    private void attachTopics(TaskEntity task, List<String> topics) {
        if (topics == null) {
            return;
        }
        Set<String> seen = new LinkedHashSet<>();
        for (String raw : topics) {
            String name = raw == null ? "" : raw.trim();
            if (name.isEmpty() || !seen.add(name.toLowerCase(Locale.ROOT))) {
                continue;
            }
            TopicEntity topic = topicRepository.findByName(name).orElseGet(() -> {
                String base = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-").replaceAll("^-|-$", "");
                String slug = base.isEmpty() ? "topic" : base;
                if (topicRepository.findBySlug(slug).isPresent()) {
                    slug = slug + "-" + Integer.toHexString(name.hashCode());
                }
                return topicRepository.save(new TopicEntity(name, slug));
            });
            taskTopicRepository.save(new TaskTopicEntity(task.getId(), topic));
        }
    }

    private TaskResponse toResponse(UserTaskEntity userTask) {
        TaskEntity task = userTask.getTask();
        List<String> topics = taskTopicRepository.findByTaskId(task.getId()).stream()
                .map(tt -> tt.getTopic().getName())
                .toList();
        List<TaskResponse.ReviewEntry> reviews = userReviewRepository
                .findByUserTaskIdOrderByReviewedAtAsc(userTask.getId()).stream()
                .map(r -> new TaskResponse.ReviewEntry(
                        r.getReviewedAt().atZone(ZoneOffset.UTC).toLocalDate(),
                        r.getState().getCode().toLowerCase(Locale.ROOT)))
                .toList();
        return new TaskResponse(
                userTask.getId(),
                task.getTitle(),
                task.getLink(),
                task.getDifficulty().getLevel(),
                topics,
                userTask.getUserNotes(),
                task.getSourceType(),
                task.getSourceMeta(),
                userTask.getScheduleMode(),
                userTask.getCreatedAt(),
                userTask.getNextReviewDate(),
                reviews);
    }
}
