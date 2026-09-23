package leetcode.tracker.backend.dto;

import java.time.LocalDate;

public record DayWorkload(LocalDate date, long count) {
}
