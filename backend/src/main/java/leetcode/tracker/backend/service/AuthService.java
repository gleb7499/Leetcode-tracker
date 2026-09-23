package leetcode.tracker.backend.service;

import java.time.Instant;
import java.util.List;
import java.util.Locale;

import leetcode.tracker.backend.dto.AuthResponse;
import leetcode.tracker.backend.dto.LoginRequest;
import leetcode.tracker.backend.dto.LogoutRequest;
import leetcode.tracker.backend.dto.MessageResponse;
import leetcode.tracker.backend.dto.RefreshRequest;
import leetcode.tracker.backend.dto.RegisterRequest;
import leetcode.tracker.backend.dto.ResetPasswordRequest;
import leetcode.tracker.backend.dto.UserDto;
import leetcode.tracker.backend.dto.VerifyEmailConfirmRequest;
import leetcode.tracker.backend.entity.RefreshTokenEntity;
import leetcode.tracker.backend.entity.UserEntity;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.repository.RefreshTokenRepository;
import leetcode.tracker.backend.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final OtpService otpService;

    public AuthService(UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            OtpService otpService) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.otpService = otpService;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmail(email)) {
            throw ApiException.conflict("Email is already registered");
        }
        UserEntity user = new UserEntity();
        user.setEmail(email);
        user.setName(request.name().trim());
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        userRepository.save(user);
        otpService.generateAndSend(user, OtpPurpose.VERIFY_EMAIL);
        return AuthResponse.of("Registration successful. Check your email for the verification code.", toDto(user));
    }

    /** Neutral response regardless of whether the email exists (anti-enumeration). */
    @Transactional
    public MessageResponse requestEmailVerification(String email) {
        userRepository.findByEmail(normalizeEmail(email))
                .filter(u -> !u.isEmailVerified())
                .ifPresent(u -> otpService.generateAndSend(u, OtpPurpose.VERIFY_EMAIL));
        return MessageResponse.of("If the email is registered and unverified, a code has been sent");
    }

    @Transactional
    public AuthResponse confirmEmailVerification(VerifyEmailConfirmRequest request) {
        UserEntity user = findByEmail(request.email());
        otpService.verify(user, OtpPurpose.VERIFY_EMAIL, request.code());
        user.setEmailVerified(true);
        user.touch();
        userRepository.save(user);
        return issueTokens(user, "Email verified successfully");
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        UserEntity user = userRepository.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> ApiException.unauthorized("Invalid email or password"));
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw ApiException.unauthorized("Invalid email or password");
        }
        if (!user.isEmailVerified()) {
            throw ApiException.unauthorized("Email is not verified");
        }
        return issueTokens(user, "Login successful");
    }

    @Transactional
    public AuthResponse refresh(RefreshRequest request) {
        RefreshTokenEntity token = refreshTokenRepository
                .findByTokenHash(TokenService.hash(request.refreshToken()))
                .filter(t -> t.isActive(Instant.now()))
                .orElseThrow(() -> ApiException.unauthorized("Refresh token is invalid or expired"));
        // Rotation: the presented token is revoked and replaced by a fresh pair.
        token.setRevokedAt(Instant.now());
        refreshTokenRepository.save(token);
        UserEntity user = userRepository.findById(token.getUserId())
                .orElseThrow(() -> ApiException.unauthorized("Refresh token is invalid or expired"));
        return issueTokens(user, "Token refreshed");
    }

    @Transactional
    public MessageResponse logout(Long userId, LogoutRequest request) {
        if (request != null && request.refreshToken() != null && !request.refreshToken().isBlank()) {
            refreshTokenRepository.findByTokenHash(TokenService.hash(request.refreshToken()))
                    .filter(t -> t.getUserId().equals(userId))
                    .ifPresent(t -> {
                        t.setRevokedAt(Instant.now());
                        refreshTokenRepository.save(t);
                    });
        } else {
            List<RefreshTokenEntity> tokens = refreshTokenRepository.findAllByUserId(userId);
            Instant now = Instant.now();
            for (RefreshTokenEntity t : tokens) {
                if (t.isActive(now)) {
                    t.setRevokedAt(now);
                }
            }
            refreshTokenRepository.saveAll(tokens);
        }
        return MessageResponse.of("Logout successful");
    }

    /** Neutral response regardless of whether the email exists (contract requirement). */
    @Transactional
    public MessageResponse forgotPassword(String email) {
        userRepository.findByEmail(normalizeEmail(email))
                .ifPresent(u -> otpService.generateAndSend(u, OtpPurpose.RESET_PASSWORD));
        return MessageResponse.of("If the email is registered, a reset code has been sent");
    }

    @Transactional
    public MessageResponse resetPassword(ResetPasswordRequest request) {
        UserEntity user = findByEmail(request.email());
        otpService.verify(user, OtpPurpose.RESET_PASSWORD, request.code());
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.touch();
        userRepository.save(user);
        revokeAll(user.getId());
        return MessageResponse.of("Password has been reset");
    }

    public UserDto me(Long userId) {
        return userRepository.findById(userId)
                .map(this::toDto)
                .orElseThrow(() -> ApiException.unauthorized("Missing or invalid session"));
    }

    private AuthResponse issueTokens(UserEntity user, String message) {
        RefreshTokenEntity refreshToken = new RefreshTokenEntity();
        String rawRefresh = tokenService.createRefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setTokenHash(TokenService.hash(rawRefresh));
        refreshToken.setExpiresAt(Instant.now().plus(tokenService.refreshTtl()));
        refreshTokenRepository.save(refreshToken);
        String accessToken = tokenService.createAccessToken(user.getId(), user.getEmail());
        return AuthResponse.withTokens(message, toDto(user), accessToken, rawRefresh);
    }

    private void revokeAll(Long userId) {
        List<RefreshTokenEntity> tokens = refreshTokenRepository.findAllByUserId(userId);
        Instant now = Instant.now();
        for (RefreshTokenEntity t : tokens) {
            if (t.isActive(now)) {
                t.setRevokedAt(now);
            }
        }
        refreshTokenRepository.saveAll(tokens);
    }

    private UserEntity findByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> ApiException.badRequest(OtpService.INVALID_CODE_MESSAGE));
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private UserDto toDto(UserEntity user) {
        return new UserDto(user.getId(), user.getEmail(), user.getName(), user.isEmailVerified());
    }
}
