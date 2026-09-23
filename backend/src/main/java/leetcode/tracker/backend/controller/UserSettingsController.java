package leetcode.tracker.backend.controller;

import java.util.List;

import jakarta.validation.Valid;

import leetcode.tracker.backend.dto.ChangePasswordRequest;
import leetcode.tracker.backend.dto.DeleteAccountRequest;
import leetcode.tracker.backend.dto.MessageResponse;
import leetcode.tracker.backend.dto.ReviewPolicyPresetResponse;
import leetcode.tracker.backend.dto.SettingsResponse;
import leetcode.tracker.backend.dto.SettingsUpdateRequest;
import leetcode.tracker.backend.error.ApiException;
import leetcode.tracker.backend.service.AuthService;
import leetcode.tracker.backend.service.BackupService;
import leetcode.tracker.backend.service.SettingsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class UserSettingsController {

    private final SettingsService settingsService;
    private final BackupService backupService;
    private final AuthService authService;

    public UserSettingsController(SettingsService settingsService,
            BackupService backupService,
            AuthService authService) {
        this.settingsService = settingsService;
        this.backupService = backupService;
        this.authService = authService;
    }

    @GetMapping("/review-policies")
    public List<ReviewPolicyPresetResponse> reviewPolicies() {
        return settingsService.listPresets();
    }

    @GetMapping("/me/settings")
    public SettingsResponse getSettings(Authentication authentication) {
        return settingsService.getSettings(currentUserId(authentication));
    }

    @PatchMapping("/me/settings")
    public SettingsResponse patchSettings(Authentication authentication,
            @Valid @RequestBody SettingsUpdateRequest request) {
        return settingsService.updateSettings(currentUserId(authentication), request);
    }

    @GetMapping("/me/backup")
    public ResponseEntity<byte[]> exportBackup(Authentication authentication) {
        byte[] json = backupService.exportJson(currentUserId(authentication));
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_JSON)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"leetcode-tracker-backup.json\"")
                .body(json);
    }

    @PostMapping("/me/backup")
    public MessageResponse importBackup(Authentication authentication,
            @RequestBody String body) {
        backupService.importJson(currentUserId(authentication), body);
        return MessageResponse.of("Backup imported");
    }

    @PostMapping("/me/change-password")
    public MessageResponse changePassword(Authentication authentication,
            @Valid @RequestBody ChangePasswordRequest request) {
        return authService.changePassword(currentUserId(authentication),
                request.currentPassword(), request.newPassword());
    }

    @DeleteMapping("/me")
    public ResponseEntity<MessageResponse> deleteAccount(Authentication authentication,
            @Valid @RequestBody DeleteAccountRequest request) {
        authService.deleteAccount(currentUserId(authentication), request.password());
        return ResponseEntity.noContent().build();
    }

    private Long currentUserId(Authentication authentication) {
        if (authentication == null || authentication.getPrincipal() == null) {
            throw ApiException.unauthorized("Missing or invalid session");
        }
        return (Long) authentication.getPrincipal();
    }
}
