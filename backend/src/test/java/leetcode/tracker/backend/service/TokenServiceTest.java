package leetcode.tracker.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class TokenServiceTest {

    private final TokenService tokenService = new TokenService(
            "unit-test-secret-with-enough-entropy-0123456789abcdef", Duration.ofMinutes(15), Duration.ofDays(30));

    @Test
    void accessTokenRoundTripsUserId() {
        String token = tokenService.createAccessToken(42L, "user@example.com");
        assertThat(tokenService.parseUserId(token)).isEqualTo(42L);
    }

    @Test
    void tamperedTokenIsRejected() {
        String token = tokenService.createAccessToken(42L, "user@example.com");
        char last = token.charAt(token.length() - 1);
        char replacement = last == 'A' ? 'B' : 'A';
        String tampered = token.substring(0, token.length() - 1) + replacement;
        assertThatThrownBy(() -> tokenService.parseUserId(tampered))
                .isInstanceOf(Exception.class);
    }

    @Test
    void hashIsStableAndHex() {
        assertThat(TokenService.hash("abc")).isEqualTo(TokenService.hash("abc"));
        assertThat(TokenService.hash("abc")).matches("[0-9a-f]{64}");
        assertThat(TokenService.hash("abc")).isNotEqualTo(TokenService.hash("abd"));
    }

    @Test
    void refreshTokensAreUniqueOpaqueStrings() {
        assertThat(tokenService.createRefreshToken()).isNotEqualTo(tokenService.createRefreshToken());
    }
}
