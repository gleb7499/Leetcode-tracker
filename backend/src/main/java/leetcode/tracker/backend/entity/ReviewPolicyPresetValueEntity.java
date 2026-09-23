package leetcode.tracker.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;

@Entity
@Table(name = "review_policy_preset_values")
public class ReviewPolicyPresetValueEntity {

    @EmbeddedId
    private ReviewPolicyPresetValueId id;

    @MapsId("preset")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "preset_id", nullable = false)
    private ReviewPolicyPresetEntity preset;

    @MapsId("state")
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "state_id", nullable = false)
    private StateEntity state;

    @Column(name = "base_interval_days", nullable = false)
    private int baseIntervalDays;

    @Column(name = "growth_factor", nullable = false)
    private double growthFactor;

    @Column(name = "max_interval_days", nullable = false)
    private int maxIntervalDays;

    public ReviewPolicyPresetValueId getId() {
        return id;
    }

    public ReviewPolicyPresetEntity getPreset() {
        return preset;
    }

    public StateEntity getState() {
        return state;
    }

    public int getBaseIntervalDays() {
        return baseIntervalDays;
    }

    public double getGrowthFactor() {
        return growthFactor;
    }

    public int getMaxIntervalDays() {
        return maxIntervalDays;
    }
}
