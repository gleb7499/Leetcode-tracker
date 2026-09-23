package leetcode.tracker.backend.entity;

import java.time.Instant;
import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "user_reviews")
public class UserReviewEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_task_id", nullable = false)
    private Long userTaskId;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "state_id", nullable = false)
    private StateEntity state;

    @Column(name = "reviewed_at", nullable = false, updatable = false)
    private Instant reviewedAt = Instant.now();

    @Column(name = "interval_days", nullable = false)
    private int intervalDays;

    @Column(name = "next_review_date", nullable = false)
    private LocalDate nextReviewDate;

    @Column(name = "review_text", columnDefinition = "TEXT")
    private String reviewText;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    public UserReviewEntity() {
    }

    public UserReviewEntity(Long userTaskId, StateEntity state, Instant reviewedAt,
            int intervalDays, LocalDate nextReviewDate, String reviewText) {
        this.userTaskId = userTaskId;
        this.state = state;
        this.reviewedAt = reviewedAt;
        this.intervalDays = intervalDays;
        this.nextReviewDate = nextReviewDate;
        this.reviewText = reviewText;
    }

    public Long getId() {
        return id;
    }

    public Long getUserTaskId() {
        return userTaskId;
    }

    public StateEntity getState() {
        return state;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }

    public int getIntervalDays() {
        return intervalDays;
    }

    public LocalDate getNextReviewDate() {
        return nextReviewDate;
    }

    public String getReviewText() {
        return reviewText;
    }
}
