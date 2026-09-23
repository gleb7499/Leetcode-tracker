package leetcode.tracker.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.invocation.InvocationOnMock;
import org.mockito.stubbing.Answer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import leetcode.tracker.backend.service.EmailService;
import leetcode.tracker.backend.service.OtpPurpose;

/**
 * Stage 6: user settings, review-policy presets, account management and the
 * local-first backup round-trip (export -> wipe -> import restores everything).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class SettingsBackupIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    JdbcTemplate jdbcTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    EmailService emailService;

    private final List<OtpCapture> sentCodes = new CopyOnWriteArrayList<>();

    @BeforeEach
    void setUp() {
        sentCodes.clear();
        doAnswer((Answer<Void>) (InvocationOnMock invocation) -> {
            sentCodes.add(new OtpCapture(
                    invocation.getArgument(0, String.class),
                    invocation.getArgument(1, String.class),
                    invocation.getArgument(2, OtpPurpose.class)));
            return null;
        }).when(emailService).sendOtpCode(anyString(), anyString(), any(OtpPurpose.class));
    }

    @Test
    @DisplayName("Backup round-trip: export -> wipe all tasks -> import restores tasks, review history and stats")
    void backupRoundTrip() throws Exception {
        String token = registerVerifyLogin("roundtrip@example.com");
        LocalDate today = LocalDate.now();

        long taskId = createTask(token, """
                {"name":"Two Sum","url":"https://leetcode.com/problems/two-sum/",
                 "difficulty":"easy","topics":["Array"],"notes":"keep"}""")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));
        long taskId2 = createTask(token, "{\"name\":\"Manual drill\",\"difficulty\":\"HARD\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));
        review(token, taskId, "remember");
        review(token, taskId, "partial");
        review(token, taskId, "forgot");
        review(token, taskId, "remember");
        review(token, taskId2, "partial");

        String statsBefore = mockMvc.perform(get("/api/v1/me/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String recallBefore = mockMvc.perform(get("/api/v1/me/stats/recall").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        // Export: attachment with valid JSON, no secrets inside.
        MvcResult export = mockMvc.perform(get("/api/v1/me/backup").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("attachment")))
                .andExpect(header().string("Content-Type", org.hamcrest.Matchers.containsString("application/json")))
                .andReturn();
        String backupJson = export.getResponse().getContentAsString();
        JsonNode backup = objectMapper.readTree(backupJson);
        assertThat(backup.get("format").asText()).isEqualTo("leetcode-tracker-backup");
        assertThat(backup.get("version").asInt()).isEqualTo(1);
        assertThat(backup.get("tasks")).hasSize(2);
        assertThat(backupJson).doesNotContain("passHash", "refreshToken", "pass_hash", "tokenHash");
        int reviewCount = 0;
        for (JsonNode t : backup.get("tasks")) {
            reviewCount += t.get("reviews").size();
        }
        assertThat(reviewCount).isEqualTo(5);

        // Wipe: delete every task from the library (the shared cards stay, relations die).
        JsonNode tasks = objectMapper.readTree(mockMvc.perform(get("/api/v1/me/tasks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        for (JsonNode t : tasks) {
            mockMvc.perform(delete("/api/v1/me/tasks/" + t.get("id").asLong())
                            .header("Authorization", "Bearer " + token))
                    .andExpect(status().isNoContent());
        }
        mockMvc.perform(get("/api/v1/me/tasks").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        mockMvc.perform(get("/api/v1/me/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(0))
                .andExpect(jsonPath("$.totalReviews").value(0));

        // Import restores everything.
        mockMvc.perform(post("/api/v1/me/backup")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(backupJson))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Backup imported"));

        JsonNode restored = objectMapper.readTree(mockMvc.perform(get("/api/v1/me/tasks")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(restored).hasSize(2);
        JsonNode twoSum = null;
        for (JsonNode t : restored) {
            if (t.get("name").asText().equals("Two Sum")) {
                twoSum = t;
            }
        }
        assertThat(twoSum).isNotNull();
        assertThat(twoSum.get("notes").asText()).isEqualTo("keep");
        assertThat(twoSum.get("topics").get(0).asText()).isEqualTo("Array");
        assertThat(twoSum.get("reviews")).hasSize(4);
        assertThat(twoSum.get("reviews").get(0).get("status").asText()).isEqualTo("remember");
        assertThat(twoSum.get("reviews").get(0).get("date").asText()).isEqualTo(today.toString());

        String statsAfter = mockMvc.perform(get("/api/v1/me/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String recallAfter = mockMvc.perform(get("/api/v1/me/stats/recall").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(recallAfter)).isEqualTo(objectMapper.readTree(recallBefore));
        JsonNode before = objectMapper.readTree(statsBefore);
        JsonNode after = objectMapper.readTree(statsAfter);
        assertThat(after.get("totalTasks").asInt()).isEqualTo(before.get("totalTasks").asInt());
        assertThat(after.get("reviewedTasks").asInt()).isEqualTo(before.get("reviewedTasks").asInt());
        assertThat(after.get("totalReviews").asInt()).isEqualTo(before.get("totalReviews").asInt());
        assertThat(objectMapper.readTree(recallAfter)).isEqualTo(objectMapper.readTree(recallBefore));
    }

    @Test
    @DisplayName("Repeated import is idempotent: no duplicated tasks or reviews")
    void importIsIdempotent() throws Exception {
        String token = registerVerifyLogin("idem@example.com");
        long taskId = createTask(token, "{\"name\":\"Dup check\",\"difficulty\":\"MEDIUM\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));
        review(token, taskId, "remember");
        review(token, taskId, "partial");

        String backupJson = mockMvc.perform(get("/api/v1/me/backup").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();

        for (int i = 0; i < 2; i++) {
            mockMvc.perform(post("/api/v1/me/backup")
                            .header("Authorization", "Bearer " + token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(backupJson))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(get("/api/v1/me/tasks").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].reviews.length()").value(2));
        mockMvc.perform(get("/api/v1/me/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(1))
                .andExpect(jsonPath("$.totalReviews").value(2));

        Long reviewRows = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_reviews r JOIN user_tasks ut ON r.user_task_id = ut.id"
                        + " JOIN users u ON ut.user_id = u.id WHERE u.email = 'idem@example.com'", Long.class);
        assertThat(reviewRows).isEqualTo(2);
    }

    @Test
    @DisplayName("Chosen review-policy preset changes interval recalculation")
    void presetChangesIntervals() throws Exception {
        String token = registerVerifyLogin("preset@example.com");
        LocalDate today = LocalDate.now();

        // Presets are listed with their interval values.
        JsonNode presets = objectMapper.readTree(mockMvc.perform(get("/api/v1/review-policies")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString());
        assertThat(presets).hasSize(3);
        int gentleId = idOfPreset(presets, "gentle");
        int intenseId = idOfPreset(presets, "intense");

        long taskId = createTask(token, "{\"name\":\"Policy probe\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));

        // Default (global) policy: first REMEMBER -> base 2 days.
        review(token, taskId, "remember")
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(2).toString()));

        // Gentle preset: FORGOT base 1 day (max 2); second review same day.
        patchSettings(token, "{\"reviewPolicyPresetId\":" + gentleId + "}");
        review(token, taskId, "forgot")
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(1).toString()));

        // Intense preset: REMEMBER base 3 days, growth 2.5.
        patchSettings(token, "{\"reviewPolicyPresetId\":" + intenseId + "}");
        review(token, taskId, "remember")
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(3).toString()));
        review(token, taskId, "remember")
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(8).toString()));

        // Settings round-trip and reset to global policy (presetId 0).
        mockMvc.perform(get("/api/v1/me/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewPolicyPresetId").value(intenseId))
                .andExpect(jsonPath("$.notificationsEnabled").value(true))
                .andExpect(jsonPath("$.dailyGoal").value(10));
        patchSettings(token, "{\"reviewPolicyPresetId\":0,\"notificationsEnabled\":false,\"dailyGoal\":25}");
        mockMvc.perform(get("/api/v1/me/settings").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewPolicyPresetId").isEmpty())
                .andExpect(jsonPath("$.notificationsEnabled").value(false))
                .andExpect(jsonPath("$.dailyGoal").value(25));

        // Unknown preset and out-of-range daily goal are rejected.
        patchSettings(token, "{\"reviewPolicyPresetId\":9999}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        patchSettings(token, "{\"dailyGoal\":500}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("Delete account removes the user and every related row from the database")
    void deleteAccountCascades() throws Exception {
        String token = registerVerifyLogin("gone@example.com");
        long taskId = createTask(token, "{\"name\":\"To be lost\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));
        review(token, taskId, "remember");
        patchSettings(token, "{\"dailyGoal\":15}");

        mockMvc.perform(delete("/api/v1/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"password123\"}"))
                .andExpect(status().isNoContent());

        assertThat(countWhere("users", "email = 'gone@example.com'")).isZero();
        assertThat(countWhere("user_tasks", "user_id NOT IN (SELECT id FROM users)")).isZero();
        assertThat(countWhere("user_reviews", "user_task_id NOT IN (SELECT id FROM user_tasks)")).isZero();
        assertThat(countWhere("user_settings", "user_id NOT IN (SELECT id FROM users)")).isZero();
        assertThat(countWhere("refresh_tokens", "user_id NOT IN (SELECT id FROM users)")).isZero();
        Long userReviewsLeft = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM user_reviews r JOIN user_tasks ut ON r.user_task_id = ut.id"
                        + " JOIN users u ON ut.user_id = u.id WHERE u.email = 'gone@example.com'", Long.class);
        assertThat(userReviewsLeft).isZero();

        // The account no longer authenticates.
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"gone@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Delete account with a wrong password is rejected and keeps everything")
    void deleteAccountWrongPassword() throws Exception {
        String token = registerVerifyLogin("stay@example.com");
        createTask(token, "{\"name\":\"Keeper\",\"difficulty\":\"EASY\"}").andExpect(status().isCreated());

        mockMvc.perform(delete("/api/v1/me")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/v1/me/tasks").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("Changing the password revokes refresh tokens; new password works")
    void changePasswordRevokesSessions() throws Exception {
        String email = "changepw@example.com";
        registerVerifyLogin(email);
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk()).andReturn();
        JsonNode session = objectMapper.readTree(login.getResponse().getContentAsString());
        String accessToken = session.get("accessToken").asText();
        String refreshToken = session.get("refreshToken").asText();

        mockMvc.perform(post("/api/v1/me/change-password")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"newpassword456\"}"))
                .andExpect(status().isOk());

        // Old refresh token is dead.
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());

        // Old password no longer works, the new one does.
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"newpassword456\"}"))
                .andExpect(status().isOk());

        // Wrong current password is rejected.
        String token2 = registerVerifyLogin("changepw2@example.com");
        mockMvc.perform(post("/api/v1/me/change-password")
                        .header("Authorization", "Bearer " + token2)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"nope\",\"newPassword\":\"whatever123\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Import rejects malformed JSON (400) and wrong format/version (422)")
    void importValidation() throws Exception {
        String token = registerVerifyLogin("validate@example.com");

        mockMvc.perform(post("/api/v1/me/backup")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));

        mockMvc.perform(post("/api/v1/me/backup")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"something-else\",\"version\":1,\"tasks\":[]}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        mockMvc.perform(post("/api/v1/me/backup")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"format\":\"leetcode-tracker-backup\",\"version\":1,"
                                + "\"tasks\":[{\"identityKey\":\"k\",\"title\":\"T\",\"difficulty\":\"NIGHTMARE\"}]}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // --- helpers ---

    private org.springframework.test.web.servlet.ResultActions createTask(String token, String json)
            throws Exception {
        return mockMvc.perform(post("/api/v1/me/tasks")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private org.springframework.test.web.servlet.ResultActions review(String token, long taskId, String status)
            throws Exception {
        return mockMvc.perform(post("/api/v1/me/tasks/" + taskId + "/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"" + status + "\"}"));
    }

    private org.springframework.test.web.servlet.ResultActions patchSettings(String token, String json)
            throws Exception {
        return mockMvc.perform(patch("/api/v1/me/settings")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private int idOfPreset(JsonNode presets, String code) {
        for (JsonNode p : presets) {
            if (p.get("code").asText().equals(code)) {
                return p.get("id").asInt();
            }
        }
        throw new AssertionError("Preset not found: " + code);
    }

    private long countWhere(String table, String condition) {
        Long count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + table + " WHERE " + condition, Long.class);
        return count != null ? count : 0;
    }

    private String registerVerifyLogin(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"name\":\"Backup User\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated());
        String otp = sentCodes.stream()
                .filter(c -> c.email().equals(email) && c.purpose() == OtpPurpose.VERIFY_EMAIL)
                .map(OtpCapture::code)
                .reduce((first, second) -> second)
                .orElseThrow(() -> new AssertionError("No OTP for " + email));
        mockMvc.perform(post("/api/v1/auth/verify-email/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"code\":\"" + otp + "\"}"))
                .andExpect(status().isOk());
        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(login.getResponse().getContentAsString()).get("accessToken").asText();
    }

    private long parseLong(String json, String field) {
        try {
            return objectMapper.readTree(json).get(field).asLong();
        } catch (Exception e) {
            throw new AssertionError(e);
        }
    }

    private record OtpCapture(String email, String code, OtpPurpose purpose) {
    }
}
