package leetcode.tracker.backend.controller;

import jakarta.validation.Valid;

import leetcode.tracker.backend.dto.AuthResponse;
import leetcode.tracker.backend.dto.EmailRequest;
import leetcode.tracker.backend.dto.LoginRequest;
import leetcode.tracker.backend.dto.LogoutRequest;
import leetcode.tracker.backend.dto.MessageResponse;
import leetcode.tracker.backend.dto.RefreshRequest;
import leetcode.tracker.backend.dto.RegisterRequest;
import leetcode.tracker.backend.dto.ResetPasswordRequest;
import leetcode.tracker.backend.dto.UserDto;
import leetcode.tracker.backend.dto.VerifyEmailConfirmRequest;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/verify-email/request")
    public MessageResponse requestVerification(@Valid @RequestBody EmailRequest request) {
        return authService.requestEmailVerification(request.email());
    }

    @PostMapping("/verify-email/confirm")
    public AuthResponse confirmVerification(@Valid @RequestBody VerifyEmailConfirmRequest request) {
        return authService.confirmEmailVerification(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @PostMapping("/refresh")
    public AuthResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return authService.refresh(request);
    }

    @PostMapping("/logout")
    public MessageResponse logout(Authentication authentication,
            @RequestBody(required = false) LogoutRequest request) {
        return authService.logout(currentUserId(authentication), request);
    }

    @GetMapping("/me")
    public AuthResponse me(Authentication authentication) {
        UserDto user = authService.me(currentUserId(authentication));
        return AuthResponse.of("ok", user);
    }

    @PostMapping("/forgot-password")
    public MessageResponse forgotPassword(@Valid @RequestBody EmailRequest request) {
        return authService.forgotPassword(request.email());
    }

    @PostMapping("/reset-password")
    public MessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw ApiException.unauthorized("Missing or invalid session");
        }
        return (Long) authentication.getPrincipal();
    }
}
