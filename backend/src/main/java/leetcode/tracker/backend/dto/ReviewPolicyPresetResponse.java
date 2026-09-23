package leetcode.tracker.backend.dto;

import java.util.List;

public record ReviewPolicyPresetResponse(
        int id,
        String code,
        String name,
        String description,
        boolean builtIn,
        List<PolicyValue> values) {

    public record PolicyValue(
            String state,
            int baseIntervalDays,
            double growthFactor,
            int maxIntervalDays) {
    }
}
