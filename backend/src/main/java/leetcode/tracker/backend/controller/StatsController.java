package leetcode.tracker.backend.controller;

import java.util.List;

import leetcode.tracker.backend.dto.DayWorkload;
import leetcode.tracker.backend.dto.DifficultyCount;
import leetcode.tracker.backend.dto.RecallQualityResponse;
import leetcode.tracker.backend.dto.SourceCount;
import leetcode.tracker.backend.dto.StatsSummaryResponse;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.service.StatsService;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me/stats")
public class StatsController {

    private final StatsService statsService;

    public StatsController(StatsService statsService) {
        this.statsService = statsService;
    }

    @GetMapping
    public StatsSummaryResponse summary(Authentication authentication) {
        return statsService.summary(currentUserId(authentication));
    }

    @GetMapping("/difficulty")
    public List<DifficultyCount> difficulty(Authentication authentication) {
        return statsService.difficultyDistribution(currentUserId(authentication));
    }

    @GetMapping("/sources")
    public List<SourceCount> sources(Authentication authentication) {
        return statsService.sourceDistribution(currentUserId(authentication));
    }

    @GetMapping("/recall")
    public RecallQualityResponse recall(Authentication authentication) {
        return statsService.recallQuality(currentUserId(authentication));
    }

    @GetMapping("/workload")
    public List<DayWorkload> workload(Authentication authentication,
            @RequestParam(required = false) Integer days) {
        return statsService.upcomingWorkload(currentUserId(authentication), days);
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw ApiException.unauthorized("Missing or invalid session");
        }
        return (Long) authentication.getPrincipal();
    }
}
