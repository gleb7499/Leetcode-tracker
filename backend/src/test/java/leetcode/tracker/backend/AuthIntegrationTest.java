package leetcode.tracker.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Map;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import leetcode.tracker.backend.service.EmailService;
import leetcode.tracker.backend.service.OtpPurpose;

/**
 * Full auth flow against a real PostgreSQL (Testcontainers): register -> verify (OTP)
 * -> login -> access to protected resource -> refresh (rotation) -> logout -> refresh rejected.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class AuthIntegrationTest {

    @Autowired
    MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    /** Email delivery is replaced so OTP codes can be captured by tests. */
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
    @DisplayName("Full flow: register -> verify -> login -> me -> refresh -> logout")
    void fullAuthFlow() throws Exception {
        register("flow@example.com", "Flow User")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.user.email").value("flow@example.com"))
                .andExpect(jsonPath("$.user.emailVerified").value(false));

        // Login before verification is rejected.
        login("flow@example.com", "password123")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        String otp = latestOtp("flow@example.com", OtpPurpose.VERIFY_EMAIL);
        assertThat(otp).matches("\\d{6}");

        // Wrong OTP rejected, correct OTP accepted.
        confirmVerification("flow@example.com", "000000")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
        confirmVerification("flow@example.com", otp)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.emailVerified").value(true));

        // Wrong password rejected.
        login("flow@example.com", "wrong-password")
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        JsonNode login = readJson(login("flow@example.com", "password123")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.accessToken").isString())
                .andExpect(jsonPath("$.refreshToken").isString())
                .andReturn());
        String accessToken = login.get("accessToken").asText();
        String refreshToken = login.get("refreshToken").asText();

        // Protected endpoint works with the access token.
        mockMvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.email").value("flow@example.com"));

        // Refresh rotates the token pair.
        JsonNode refreshed = readJson(mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andReturn());
        String newRefresh = refreshed.get("refreshToken").asText();
        assertThat(newRefresh).isNotEqualTo(refreshToken);

        // Reusing the old refresh token is rejected (rotation).
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        // Logout revokes the current refresh token.
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + refreshed.get("accessToken").asText())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + newRefresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + newRefresh + "\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Duplicate registration returns 409 CONFLICT per contract")
    void duplicateEmail() throws Exception {
        register("dup@example.com", "Dup User").andExpect(status().isCreated());
        register("dup@example.com", "Dup User Again")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("CONFLICT"));
    }

    @Test
    @DisplayName("Validation errors return 422 VALIDATION_ERROR with requestId")
    void validationErrors() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"not-an-email\",\"name\":\"\",\"password\":\"short\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").isString())
                .andExpect(jsonPath("$.requestId").isString());
    }

    @Test
    @DisplayName("Protected endpoint without token returns 401 UNAUTHORIZED")
    void unauthenticatedMe() throws Exception {
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"))
                .andExpect(jsonPath("$.requestId").isString());
    }

    @Test
    @DisplayName("Password reset flow: forgot-password is neutral and resets password")
    void passwordReset() throws Exception {
        registerAndVerify("reset@example.com");

        // Neutral response for both existing and unknown email (contract requirement).
        String existing = forgotPassword("reset@example.com")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        String unknown = forgotPassword("nobody@example.com")
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(objectMapper.readTree(existing).get("message").asText())
                .isEqualTo(objectMapper.readTree(unknown).get("message").asText());

        String resetOtp = latestOtp("reset@example.com", OtpPurpose.RESET_PASSWORD);
        mockMvc.perform(post("/api/v1/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reset@example.com\",\"code\":\"" + resetOtp
                                + "\",\"newPassword\":\"newpassword456\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        login("reset@example.com", "password123").andExpect(status().isUnauthorized());
        login("reset@example.com", "newpassword456").andExpect(status().isOk());
    }

    // --- helpers ---

    @Test
    @DisplayName("Refresh with an unknown (stolen or forged) token is rejected with 401")
    void refreshWithUnknownToken() throws Exception {
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"no-such-token.6b8b07e3\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    @DisplayName("A consumed OTP cannot be re-confirmed; a fresh code is required")
    void consumedOtpCannotBeReused() throws Exception {
        String email = "reuse@example.com";
        register(email, "Reuse User").andExpect(status().isCreated());
        String otp = latestOtp(email, OtpPurpose.VERIFY_EMAIL);
        confirmVerification(email, otp).andExpect(status().isOk());

        // Same code again: rejected (consumed).
        confirmVerification(email, otp)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
    }

    private void registerAndVerify(String email) throws Exception {
        register(email, "Test User").andExpect(status().isCreated());
        confirmVerification(email, latestOtp(email, OtpPurpose.VERIFY_EMAIL))
                .andExpect(status().isOk());
    }

    private org.springframework.test.web.servlet.ResultActions register(String email, String name) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"name\":\"" + name + "\",\"password\":\"password123\"}"));
    }

    private org.springframework.test.web.servlet.ResultActions login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"));
    }

    private org.springframework.test.web.servlet.ResultActions confirmVerification(String email, String code)
            throws Exception {
        return mockMvc.perform(post("/api/v1/auth/verify-email/confirm")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\",\"code\":\"" + code + "\"}"));
    }

    private org.springframework.test.web.servlet.ResultActions forgotPassword(String email) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/forgot-password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}"));
    }

    private String latestOtp(String email, OtpPurpose purpose) {
        return sentCodes.stream()
                .filter(c -> c.email().equals(email) && c.purpose() == purpose)
                .map(OtpCapture::code)
                .reduce((first, second) -> second)
                .orElseThrow(() -> new AssertionError("No OTP sent to " + email + " purpose " + purpose));
    }

    private JsonNode readJson(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private record OtpCapture(String email, String code, OtpPurpose purpose) {
    }
}
