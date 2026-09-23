package leetcode.tracker.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "review_policies")
public class ReviewPolicyEntity {

    @Id
    @Column(name = "state_id")
    private Integer stateId;

    @Column(name = "base_interval_days", nullable = false)
    private int baseIntervalDays;

    @Column(name = "growth_factor", nullable = false)
    private double growthFactor;

    @Column(name = "max_interval_days", nullable = false)
    private int maxIntervalDays;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    public Integer getStateId() {
        return stateId;
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

    public boolean isActive() {
        return active;
    }
}
