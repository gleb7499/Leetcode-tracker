package leetcode.tracker.backend.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;

import leetcode.tracker.backend.entity.OtpCodeEntity;
import leetcode.tracker.backend.entity.UserEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.OtpCodeRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OtpService {

    public static final String INVALID_CODE_MESSAGE = "Invalid or expired code";

    private final OtpCodeRepository otpCodeRepository;
    private final EmailService emailService;
    private final Duration ttl;
    private final int maxAttempts;
    private final SecureRandom random = new SecureRandom();

    public OtpService(OtpCodeRepository otpCodeRepository,
            EmailService emailService,
            @Value("${app.otp.ttl}") Duration ttl,
            @Value("${app.otp.max-attempts}") int maxAttempts) {
        this.otpCodeRepository = otpCodeRepository;
        this.emailService = emailService;
        this.ttl = ttl;
        this.maxAttempts = maxAttempts;
    }

    /** Generates a fresh 6-digit code, persists its hash and delivers it by email. */
    @Transactional
    public void generateAndSend(UserEntity user, OtpPurpose purpose) {
        String code = String.format("%06d", random.nextInt(1_000_000));
        OtpCodeEntity entity = new OtpCodeEntity();
        entity.setUserId(user.getId());
        entity.setPurpose(purpose);
        entity.setCodeHash(TokenService.hash(code));
        entity.setExpiresAt(Instant.now().plus(ttl));
        otpCodeRepository.save(entity);
        emailService.sendOtpCode(user.getEmail(), code, purpose);
    }

    /** Validates the code against the newest unconsumed one; consumes it on success. */
    @Transactional
    public void verify(UserEntity user, OtpPurpose purpose, String code) {
        OtpCodeEntity latest = otpCodeRepository
                .findTopByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(), purpose)
                .orElseThrow(() -> ApiException.badRequest(INVALID_CODE_MESSAGE));
        Instant now = Instant.now();
        if (!latest.isUsable(now) || latest.getAttempts() >= maxAttempts) {
            throw ApiException.badRequest(INVALID_CODE_MESSAGE);
        }
        if (!latest.getCodeHash().equals(TokenService.hash(code))) {
            latest.incrementAttempts();
            otpCodeRepository.save(latest);
            throw ApiException.badRequest(INVALID_CODE_MESSAGE);
        }
        latest.setConsumedAt(now);
        otpCodeRepository.save(latest);
    }
}
