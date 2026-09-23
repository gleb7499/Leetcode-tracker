package leetcode.tracker.backend.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.Optional;

import leetcode.tracker.backend.entity.OtpCodeEntity;
import leetcode.tracker.backend.entity.UserEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.OtpCodeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

class OtpServiceTest {

    private final OtpCodeRepository otpCodeRepository = mock(OtpCodeRepository.class);
    private final EmailService emailService = mock(EmailService.class);
    private final OtpService otpService = new OtpService(
            otpCodeRepository, emailService, Duration.ofMinutes(10), 5);

    private final UserEntity user = new UserEntity();

    @BeforeEach
    void setUp() {
        user.setId(7L);
        user.setEmail("otp@example.com");
    }

    @Test
    void generatePersistsHashAndDeliversRawCode() {
        otpService.generateAndSend(user, OtpPurpose.VERIFY_EMAIL);
        ArgumentCaptor<OtpCodeEntity> captor = ArgumentCaptor.forClass(OtpCodeEntity.class);
        verify(otpCodeRepository).save(captor.capture());
        assertThat(captor.getValue().getCodeHash()).matches("[0-9a-f]{64}");
        assertThat(captor.getValue().getCodeHash()).isNotEqualTo("123456");
        verify(emailService).sendOtpCode(anyString(), anyString(), any());
    }

    @Test
    void verifyConsumesCorrectCode() {
        OtpCodeEntity entity = activeEntity(TokenService.hash("123456"));
        when(otpCodeRepository.findTopByUserIdAndPurposeOrderByCreatedAtDesc(7L, OtpPurpose.VERIFY_EMAIL))
                .thenReturn(Optional.of(entity));
        otpService.verify(user, OtpPurpose.VERIFY_EMAIL, "123456");
        assertThat(entity.getConsumedAt()).isNotNull();
    }

    @Test
    void wrongCodeIncrementsAttemptsAndRejects() {
        OtpCodeEntity entity = activeEntity(TokenService.hash("123456"));
        when(otpCodeRepository.findTopByUserIdAndPurposeOrderByCreatedAtDesc(7L, OtpPurpose.VERIFY_EMAIL))
                .thenReturn(Optional.of(entity));
        assertThatThrownBy(() -> otpService.verify(user, OtpPurpose.VERIFY_EMAIL, "999999"))
                .isInstanceOf(ApiException.class)
                .hasMessageContaining("Invalid or expired code");
        assertThat(entity.getAttempts()).isEqualTo(1);
        assertThat(entity.getConsumedAt()).isNull();
    }

    @Test
    void expiredCodeRejected() {
        OtpCodeEntity entity = activeEntity(TokenService.hash("123456"));
        entity.setExpiresAt(Instant.now().minusSeconds(1));
        when(otpCodeRepository.findTopByUserIdAndPurposeOrderByCreatedAtDesc(7L, OtpPurpose.VERIFY_EMAIL))
                .thenReturn(Optional.of(entity));
        assertThatThrownBy(() -> otpService.verify(user, OtpPurpose.VERIFY_EMAIL, "123456"))
                .isInstanceOf(ApiException.class);
    }

    private OtpCodeEntity activeEntity(String codeHash) {
        OtpCodeEntity entity = new OtpCodeEntity();
        entity.setUserId(7L);
        entity.setPurpose(OtpPurpose.VERIFY_EMAIL);
        entity.setCodeHash(codeHash);
        entity.setExpiresAt(Instant.now().plus(Duration.ofMinutes(10)));
        return entity;
    }
}
