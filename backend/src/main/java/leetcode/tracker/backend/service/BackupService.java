package leetcode.tracker.backend.service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import leetcode.tracker.backend.dto.BackupData;
import leetcode.tracker.backend.entity.DifficultyEntity;
import leetcode.tracker.backend.entity.ReviewPolicyPresetEntity;
import leetcode.tracker.backend.entity.StateEntity;
import leetcode.tracker.backend.entity.TaskEntity;
import leetcode.tracker.backend.entity.TaskTopicEntity;
import leetcode.tracker.backend.entity.TopicEntity;
import leetcode.tracker.backend.entity.UserEntity;
import leetcode.tracker.backend.entity.UserReviewEntity;
import leetcode.tracker.backend.entity.UserSettingsEntity;
import leetcode.tracker.backend.entity.UserTaskEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.DifficultyRepository;
import leetcode.tracker.backend.repository.ReviewPolicyPresetRepository;
import leetcode.tracker.backend.repository.StateRepository;
import leetcode.tracker.backend.repository.TaskRepository;
import leetcode.tracker.backend.repository.TaskTopicRepository;
import leetcode.tracker.backend.repository.TopicRepository;
import leetcode.tracker.backend.repository.UserRepository;
import leetcode.tracker.backend.repository.UserReviewRepository;
import leetcode.tracker.backend.repository.UserSettingsRepository;
import leetcode.tracker.backend.repository.UserTaskRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Export/import of the user's full dataset (local-first backup).
 * Idempotent: shared tasks are matched by identityKey, user relations by
 * (user, identityKey), reviews by (state, reviewedAt) — repeated imports
 * create no duplicates.
 */
@Service
public class BackupService {

    private static final Set<String> KNOWN_STATES = Set.of("FORGOT", "PARTIAL", "REMEMBER");

    private final UserRepository userRepository;
    private final UserSettingsRepository userSettingsRepository;
    private final ReviewPolicyPresetRepository presetRepository;
    private final UserTaskRepository userTaskRepository;
    private final UserReviewRepository userReviewRepository;
    private final TaskRepository taskRepository;
    private final TaskTopicRepository taskTopicRepository;
    private final TopicRepository topicRepository;
    private final DifficultyRepository difficultyRepository;
    private final StateRepository stateRepository;
    private final com.fasterxml.jackson.databind.ObjectMapper objectMapper =
            new com.fasterxml.jackson.databind.ObjectMapper()
                    .registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule())
                    .disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

    public BackupService(UserRepository userRepository,
            UserSettingsRepository userSettingsRepository,
            ReviewPolicyPresetRepository presetRepository,
            UserTaskRepository userTaskRepository,
            UserReviewRepository userReviewRepository,
            TaskRepository taskRepository,
            TaskTopicRepository taskTopicRepository,
            TopicRepository topicRepository,
            DifficultyRepository difficultyRepository,
            StateRepository stateRepository) {
        this.userRepository = userRepository;
        this.userSettingsRepository = userSettingsRepository;
        this.presetRepository = presetRepository;
        this.userTaskRepository = userTaskRepository;
        this.userReviewRepository = userReviewRepository;
        this.taskRepository = taskRepository;
        this.taskTopicRepository = taskTopicRepository;
        this.topicRepository = topicRepository;
        this.difficultyRepository = difficultyRepository;
        this.stateRepository = stateRepository;
    }

    @Transactional(readOnly = true)
    public BackupData exportBackup(Long userId) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> ApiException.unauthorized("Missing or invalid session"));

        BackupData.SettingsBackup settings = userSettingsRepository.findById(userId)
                .map(s -> new BackupData.SettingsBackup(
                        s.getReviewPolicyPreset() != null ? s.getReviewPolicyPreset().getCode() : null,
                        s.isNotificationsEnabled(),
                        s.isSoundEffectsEnabled(),
                        s.getDailyGoal(),
                        s.getReviewTime()))
                .orElse(null);

        List<BackupData.TaskBackup> tasks = new ArrayList<>();
        for (UserTaskEntity userTask : userTaskRepository.findByUserIdOrderByNextReviewDateAsc(userId)) {
            TaskEntity task = userTask.getTask();
            List<String> topics = taskTopicRepository.findByTaskId(task.getId()).stream()
                    .map(tt -> tt.getTopic().getName())
                    .toList();
            List<BackupData.TaskBackup.ReviewBackup> reviews = userReviewRepository
                    .findByUserTaskIdOrderByReviewedAtAsc(userTask.getId()).stream()
                    .map(r -> new BackupData.TaskBackup.ReviewBackup(
                            r.getState().getCode(),
                            r.getReviewedAt(),
                            r.getIntervalDays(),
                            r.getNextReviewDate(),
                            r.getReviewText()))
                    .toList();
            tasks.add(new BackupData.TaskBackup(
                    task.getIdentityKey(),
                    task.getTitle(),
                    task.getLink(),
                    task.getSourceType(),
                    task.getSourceProblemId(),
                    task.getSourceMeta(),
                    task.getDifficulty().getLevel(),
                    topics,
                    userTask.getUserNotes(),
                    userTask.getScheduleMode(),
                    userTask.getCurrentState().getCode(),
                    userTask.getLastReviewDate(),
                    userTask.getNextReviewDate(),
                    userTask.getCreatedAt(),
                    reviews));
        }

        return new BackupData(
                BackupData.FORMAT,
                BackupData.VERSION,
                Instant.now(),
                new BackupData.UserBackup(user.getEmail(), user.getName(), user.getCreatedAt()),
                settings,
                tasks);
    }

    @Transactional
    public void importBackup(Long userId, BackupData backup) {
        validate(backup);

        if (backup.settings() != null) {
            importSettings(userId, backup.settings());
        }

        for (BackupData.TaskBackup taskBackup : backup.tasks()) {
            importTask(userId, taskBackup);
        }
    }

    @Transactional(readOnly = true)
    public byte[] exportJson(Long userId) {
        try {
            return objectMapper.writerWithDefaultPrettyPrinter()
                    .writeValueAsBytes(exportBackup(userId));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw ApiException.internal("Could not serialize backup");
        }
    }

    @Transactional
    public void importJson(Long userId, String json) {
        BackupData backup;
        try {
            backup = objectMapper.readValue(json, BackupData.class);
        } catch (com.fasterxml.jackson.core.JsonProcessingException | IllegalArgumentException e) {
            throw ApiException.badRequest("Malformed backup file: not valid JSON for this format");
        }
        importBackup(userId, backup);
    }

    private void validate(BackupData backup) {
        if (backup == null || !BackupData.FORMAT.equals(backup.format()) || backup.version() == null
                || backup.version() != BackupData.VERSION) {
            throw ApiException.validation("Not a leetcode-tracker backup file (format/version mismatch)");
        }
        if (backup.tasks() == null) {
            throw ApiException.validation("Backup has no tasks section");
        }
        int index = 0;
        for (BackupData.TaskBackup task : backup.tasks()) {
            if (task.identityKey() == null || task.identityKey().isBlank()
                    || task.title() == null || task.title().isBlank()) {
                throw ApiException.validation("Task #" + index + " is missing identityKey or title");
            }
            if (task.difficulty() == null
                    || difficultyRepository.findByLevel(task.difficulty().toUpperCase(Locale.ROOT)).isEmpty()) {
                throw ApiException.validation("Task \"" + task.identityKey() + "\" has unknown difficulty");
            }
            if (task.scheduleMode() != null
                    && !UserTaskEntity.MODE_SPACED_REPETITION.equals(task.scheduleMode())
                    && !UserTaskEntity.MODE_DISABLED.equals(task.scheduleMode())) {
                throw ApiException.validation("Task \"" + task.identityKey() + "\" has unknown scheduleMode");
            }
            if (task.currentState() != null && !KNOWN_STATES.contains(normalizeState(task.currentState()))) {
                throw ApiException.validation("Task \"" + task.identityKey() + "\" has unknown currentState");
            }
            if (task.reviews() != null) {
                for (BackupData.TaskBackup.ReviewBackup review : task.reviews()) {
                    if (review.state() == null || review.reviewedAt() == null
                            || !KNOWN_STATES.contains(normalizeState(review.state()))) {
                        throw ApiException.validation(
                                "Task \"" + task.identityKey() + "\" has a review with unknown state or no date");
                    }
                }
            }
            index++;
        }
    }

    private void importSettings(Long userId, BackupData.SettingsBackup settingsBackup) {
        UserSettingsEntity settings = userSettingsRepository.findById(userId)
                .orElseGet(() -> {
                    UserSettingsEntity fresh = new UserSettingsEntity();
                    fresh.setUserId(userId);
                    return fresh;
                });
        if (settingsBackup.reviewPolicyPresetCode() != null) {
            ReviewPolicyPresetEntity preset = presetRepository.findAll().stream()
                    .filter(p -> p.getCode().equals(settingsBackup.reviewPolicyPresetCode()))
                    .findFirst()
                    .orElse(null);
            settings.setReviewPolicyPreset(preset); // unknown preset codes reset to global policy
        }
        settings.setNotificationsEnabled(settingsBackup.notificationsEnabled());
        settings.setSoundEffectsEnabled(settingsBackup.soundEffectsEnabled());
        if (settingsBackup.dailyGoal() > 0) {
            settings.setDailyGoal(Math.min(100, settingsBackup.dailyGoal()));
        }
        if (settingsBackup.reviewTime() != null) {
            settings.setReviewTime(settingsBackup.reviewTime());
        }
        settings.touch();
        userSettingsRepository.save(settings);
    }

    private void importTask(Long userId, BackupData.TaskBackup backup) {
        TaskEntity task = taskRepository.findByIdentityKey(backup.identityKey()).orElseGet(() -> {
            TaskEntity fresh = new TaskEntity();
            fresh.setIdentityKey(backup.identityKey());
            fresh.setSourceType(backup.sourceType() != null ? backup.sourceType() : "manual");
            fresh.setSourceProblemId(backup.sourceProblemId() != null
                    ? backup.sourceProblemId() : backup.identityKey());
            fresh.setSourceMeta(backup.sourceMeta());
            fresh.setTitle(backup.title().trim());
            fresh.setLink(backup.link());
            fresh.setDifficulty(resolveDifficulty(backup.difficulty()));
            TaskEntity saved = taskRepository.save(fresh);
            attachTopics(saved, backup.topics());
            return saved;
        });

        UserTaskEntity userTask = userTaskRepository
                .findByUserIdAndTaskId(userId, task.getId())
                .orElseGet(() -> {
                    UserTaskEntity fresh = new UserTaskEntity();
                    fresh.setUserId(userId);
                    fresh.setTask(task);
                    return fresh;
                });
        userTask.setCurrentState(resolveState(backup.currentState()));
        userTask.setLastReviewDate(backup.lastReviewDate());
        userTask.setNextReviewDate(backup.nextReviewDate() != null
                ? backup.nextReviewDate() : java.time.LocalDate.now());
        userTask.setUserNotes(backup.notes());
        userTask.setScheduleMode(backup.scheduleMode() != null
                ? backup.scheduleMode() : UserTaskEntity.MODE_SPACED_REPETITION);
        userTask.touch();
        UserTaskEntity savedUserTask = userTaskRepository.save(userTask);

        if (backup.reviews() != null) {
            List<UserReviewEntity> existing = userReviewRepository
                    .findByUserTaskIdOrderByReviewedAtAsc(savedUserTask.getId());
            for (BackupData.TaskBackup.ReviewBackup reviewBackup : backup.reviews()) {
                String code = normalizeState(reviewBackup.state());
                boolean alreadyPresent = existing.stream().anyMatch(r ->
                        r.getState().getCode().equals(code)
                                && r.getReviewedAt().equals(reviewBackup.reviewedAt()));
                if (alreadyPresent) {
                    continue;
                }
                StateEntity state = resolveState(code);
                UserReviewEntity review = new UserReviewEntity(
                        savedUserTask.getId(),
                        state,
                        reviewBackup.reviewedAt(),
                        Math.max(1, reviewBackup.intervalDays()),
                        reviewBackup.nextReviewDate() != null
                                ? reviewBackup.nextReviewDate()
                                : java.time.LocalDate.now(),
                        reviewBackup.reviewText());
                userReviewRepository.save(review);
                existing.add(review);
            }
        }
    }

    private String normalizeState(String state) {
        return state.trim().toUpperCase(Locale.ROOT);
    }

    private StateEntity resolveState(String code) {
        String normalized = code != null && !code.isBlank() ? normalizeState(code) : "REMEMBER";
        return stateRepository.findByCode(normalized)
                .orElseThrow(() -> ApiException.internal("Review states are not seeded"));
    }

    private DifficultyEntity resolveDifficulty(String difficulty) {
        return difficultyRepository.findByLevel(difficulty.trim().toUpperCase(Locale.ROOT))
                .orElseThrow(() -> ApiException.validation("Unknown difficulty: " + difficulty));
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
                String base = name.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]+", "-")
                        .replaceAll("^-|-$", "");
                String slug = base.isEmpty() ? "topic" : base;
                if (topicRepository.findBySlug(slug).isPresent()) {
                    slug = slug + "-" + Integer.toHexString(name.hashCode());
                }
                return topicRepository.save(new TopicEntity(name, slug));
            });
            if (taskTopicRepository.findByTaskIdAndTopicId(task.getId(), topic.getId()).isEmpty()) {
                taskTopicRepository.save(new TaskTopicEntity(task.getId(), topic));
            }
        }
    }
}
