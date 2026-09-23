package leetcode.tracker.backend.service;

import java.util.List;

import leetcode.tracker.backend.dto.ReviewPolicyPresetResponse;
import leetcode.tracker.backend.dto.SettingsResponse;
import leetcode.tracker.backend.dto.SettingsUpdateRequest;
import leetcode.tracker.backend.entity.ReviewPolicyPresetEntity;
import leetcode.tracker.backend.entity.ReviewPolicyPresetValueEntity;
import leetcode.tracker.backend.entity.UserSettingsEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.ReviewPolicyPresetRepository;
import leetcode.tracker.backend.repository.ReviewPolicyPresetValueRepository;
import leetcode.tracker.backend.repository.UserSettingsRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SettingsService {

    private final UserSettingsRepository userSettingsRepository;
    private final ReviewPolicyPresetRepository presetRepository;
    private final ReviewPolicyPresetValueRepository presetValueRepository;

    public SettingsService(UserSettingsRepository userSettingsRepository,
            ReviewPolicyPresetRepository presetRepository,
            ReviewPolicyPresetValueRepository presetValueRepository) {
        this.userSettingsRepository = userSettingsRepository;
        this.presetRepository = presetRepository;
        this.presetValueRepository = presetValueRepository;
    }

    @Transactional(readOnly = true)
    public SettingsResponse getSettings(Long userId) {
        return toResponse(loadOrDefault(userId));
    }

    @Transactional
    public SettingsResponse updateSettings(Long userId, SettingsUpdateRequest request) {
        UserSettingsEntity settings = userSettingsRepository.findById(userId)
                .orElseGet(() -> {
                    UserSettingsEntity fresh = new UserSettingsEntity();
                    fresh.setUserId(userId);
                    return fresh;
                });
        if (request.reviewPolicyPresetId() != null) {
            if (request.reviewPolicyPresetId() == SettingsUpdateRequest.RESET_PRESET) {
                settings.setReviewPolicyPreset(null);
            } else {
                ReviewPolicyPresetEntity preset = presetRepository
                        .findById(request.reviewPolicyPresetId())
                        .orElseThrow(() -> ApiException.validation("Unknown review policy preset"));
                settings.setReviewPolicyPreset(preset);
            }
        }
        if (request.notificationsEnabled() != null) {
            settings.setNotificationsEnabled(request.notificationsEnabled());
        }
        if (request.soundEffectsEnabled() != null) {
            settings.setSoundEffectsEnabled(request.soundEffectsEnabled());
        }
        if (request.dailyGoal() != null) {
            settings.setDailyGoal(request.dailyGoal());
        }
        if (request.reviewTime() != null) {
            settings.setReviewTime(request.reviewTime());
        }
        settings.touch();
        return toResponse(userSettingsRepository.save(settings));
    }

    @Transactional(readOnly = true)
    public List<ReviewPolicyPresetResponse> listPresets() {
        return presetRepository.findAll().stream()
                .map(preset -> new ReviewPolicyPresetResponse(
                        preset.getId(),
                        preset.getCode(),
                        preset.getName(),
                        preset.getDescription(),
                        preset.isBuiltIn(),
                        presetValueRepository.findByPresetIdOrderByStateId(preset.getId()).stream()
                                .map(SettingsService::toValue)
                                .toList()))
                .toList();
    }

    /** Interval values applied to a user; null when the user follows the global policy. */
    @Transactional(readOnly = true)
    public PresetValues presetValuesForUser(Long userId) {
        return userSettingsRepository.findById(userId)
                .map(UserSettingsEntity::getReviewPolicyPreset)
                .map(preset -> new PresetValues(preset.getId(),
                        presetValueRepository.findByPresetIdOrderByStateId(preset.getId()).stream()
                                .map(v -> new PolicyValue(
                                        v.getState().getCode(),
                                        v.getBaseIntervalDays(),
                                        v.getGrowthFactor(),
                                        v.getMaxIntervalDays()))
                                .toList()))
                .orElse(null);
    }

    private UserSettingsEntity loadOrDefault(Long userId) {
        return userSettingsRepository.findById(userId).orElseGet(() -> {
            UserSettingsEntity defaults = new UserSettingsEntity();
            defaults.setUserId(userId);
            return defaults;
        });
    }

    private static ReviewPolicyPresetResponse.PolicyValue toValue(
            ReviewPolicyPresetValueEntity value) {
        return new ReviewPolicyPresetResponse.PolicyValue(
                value.getState().getCode(),
                value.getBaseIntervalDays(),
                value.getGrowthFactor(),
                value.getMaxIntervalDays());
    }

    private SettingsResponse toResponse(UserSettingsEntity settings) {
        return new SettingsResponse(
                settings.getUserId(),
                settings.getReviewPolicyPreset() != null ? settings.getReviewPolicyPreset().getId() : null,
                settings.isNotificationsEnabled(),
                settings.isSoundEffectsEnabled(),
                settings.getDailyGoal(),
                settings.getReviewTime(),
                settings.getUpdatedAt());
    }

    /** Interval policy values of one preset, keyed by state code at lookup time. */
    public record PresetValues(Integer presetId, List<PolicyValue> values) {

        public PolicyValue forState(String code) {
            return values.stream()
                    .filter(v -> v.state().equals(code))
                    .findFirst()
                    .orElseThrow(() -> ApiException.internal("Preset is missing values for state " + code));
        }
    }

    public record PolicyValue(String state, int baseIntervalDays, double growthFactor, int maxIntervalDays) {
    }
}
