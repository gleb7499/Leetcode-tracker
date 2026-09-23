package leetcode.tracker.backend.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthResponse(
        boolean success,
        String message,
        UserDto user,
        String accessToken,
        String refreshToken) {

    public static AuthResponse of(String message, UserDto user) {
        return new AuthResponse(true, message, user, null, null);
    }

    public static AuthResponse withTokens(String message, UserDto user, String accessToken, String refreshToken) {
        return new AuthResponse(true, message, user, accessToken, refreshToken);
    }
}
