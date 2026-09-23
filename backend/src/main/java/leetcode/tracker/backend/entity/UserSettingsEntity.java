package leetcode.tracker.backend.entity;

import java.time.Instant;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_settings")
public class UserSettingsEntity {

    @Id
    @Column(name = "user_id")
    private Long userId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "review_policy_preset_id")
    private ReviewPolicyPresetEntity reviewPolicyPreset;

    @Column(name = "notifications_enabled", nullable = false)
    private boolean notificationsEnabled = true;

    @Column(name = "sound_effects_enabled", nullable = false)
    private boolean soundEffectsEnabled = true;

    @Column(name = "daily_goal", nullable = false)
    private int dailyGoal = 10;

    @Column(name = "review_time", nullable = false)
    private LocalTime reviewTime = LocalTime.of(9, 0);

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public ReviewPolicyPresetEntity getReviewPolicyPreset() {
        return reviewPolicyPreset;
    }

    public void setReviewPolicyPreset(ReviewPolicyPresetEntity reviewPolicyPreset) {
        this.reviewPolicyPreset = reviewPolicyPreset;
    }

    public boolean isNotificationsEnabled() {
        return notificationsEnabled;
    }

    public void setNotificationsEnabled(boolean notificationsEnabled) {
        this.notificationsEnabled = notificationsEnabled;
    }

    public boolean isSoundEffectsEnabled() {
        return soundEffectsEnabled;
    }

    public void setSoundEffectsEnabled(boolean soundEffectsEnabled) {
        this.soundEffectsEnabled = soundEffectsEnabled;
    }

    public int getDailyGoal() {
        return dailyGoal;
    }

    public void setDailyGoal(int dailyGoal) {
        this.dailyGoal = dailyGoal;
    }

    public LocalTime getReviewTime() {
        return reviewTime;
    }

    public void setReviewTime(LocalTime reviewTime) {
        this.reviewTime = reviewTime;
    }

    public void touch() {
        this.updatedAt = Instant.now();
    }
}
