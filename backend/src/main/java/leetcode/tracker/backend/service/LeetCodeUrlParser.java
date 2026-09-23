package leetcode.tracker.backend.service;

import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import leetcode.tracker.backend.error.ApiException;
import org.springframework.stereotype.Component;

/**
 * Parses and validates LeetCode problem URLs. Supported shapes:
 * https://leetcode.com/problems/&lt;slug&gt;/ (optional trailing path such as
 * /description, query string allowed), with optional "www." subdomain.
 */
@Component
public class LeetCodeUrlParser {

    public static final String SOURCE_LEETCODE = "leetcode_url";
    public static final String SOURCE_MANUAL = "manual";

    private static final Pattern LEETCODE_HOST = Pattern.compile(
            "^https?://(www\\.)?leetcode\\.com(/.*)?$", Pattern.CASE_INSENSITIVE);
    private static final Pattern LEETCODE_PROBLEM = Pattern.compile(
            "^https?://(www\\.)?leetcode\\.com/problems/([a-z0-9][a-z0-9-]*)(/.*)?$",
            Pattern.CASE_INSENSITIVE);

    public record ParsedUrl(String url, String slug) {
    }

    /**
     * Validates the URL field of a task. A URL pointing at leetcode.com must be a
     * valid problem URL; any other absolute http(s) URL is accepted as a plain
     * external link; an empty URL means a fully manual task.
     *
     * @return the parsed problem URL, or empty for non-LeetCode links
     * @throws ApiException VALIDATION_ERROR for malformed or non-problem leetcode.com URLs
     */
    public Optional<ParsedUrl> parse(String url) {
        if (url == null || url.isBlank()) {
            return Optional.empty();
        }
        String trimmed = url.trim();
        Matcher matcher = LEETCODE_PROBLEM.matcher(trimmed);
        if (matcher.matches()) {
            return Optional.of(new ParsedUrl(trimmed, matcher.group(2).toLowerCase()));
        }
        if (LEETCODE_HOST.matcher(trimmed).matches()) {
            throw ApiException.validation(
                    "URL must point to a LeetCode problem: https://leetcode.com/problems/<slug>/");
        }
        if (!trimmed.matches("^https?://[^\\s/$.?#].[^\\s]*$")) {
            throw ApiException.validation("URL must be a valid absolute http(s) link");
        }
        return Optional.empty();
    }
}
