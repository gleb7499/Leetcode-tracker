package leetcode.tracker.backend;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import leetcode.tracker.backend.service.EmailService;
import leetcode.tracker.backend.service.OtpPurpose;

/**
 * Tasks + spaced repetition flow against a real PostgreSQL (Testcontainers):
 * CRUD, user isolation, LeetCode URL parsing, review queue and interval rescheduling.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class TaskIntegrationTest {

    private static final String BASE = "/api/v1/me/tasks";

    @Autowired
    MockMvc mockMvc;

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
    @DisplayName("Full review flow: add -> in today's queue -> REMEMBER reschedules by policy -> out of queue")
    void reviewFlowRemember() throws Exception {
        String token = registerVerifyLogin("remember@example.com");
        LocalDate today = LocalDate.now();

        long taskId = createTask(token, """
                {"name":"Two Sum","url":"https://leetcode.com/problems/two-sum/",
                 "difficulty":"easy","topics":["Array","Hash Table"],"notes":"warmup"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.name").value("Two Sum"))
                .andExpect(jsonPath("$.difficulty").value("EASY"))
                .andExpect(jsonPath("$.source").value("leetcode_url"))
                .andExpect(jsonPath("$.sourceMeta").value("https://leetcode.com/problems/two-sum/"))
                .andExpect(jsonPath("$.topics[0]").value("Array"))
                .andExpect(jsonPath("$.nextReview").value(today.toString()))
                .andExpect(jsonPath("$.reviews").isEmpty())
                .andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));

        // New task is due today.
        mockMvc.perform(get(BASE + "/today").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(taskId));

        // First REMEMBER review: policy base interval is 2 days -> next review today+2.
        review(token, taskId, "remember")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(2).toString()))
                .andExpect(jsonPath("$.reviews[0].status").value("remember"))
                .andExpect(jsonPath("$.reviews[0].date").value(today.toString()));

        // Gone from today's queue.
        mockMvc.perform(get(BASE + "/today").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        // Second REMEMBER the same day: interval grows 2 * growth_factor 2.0 = 4.
        review(token, taskId, "remember")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(4).toString()));

        // PARTIAL keeps the current interval (4).
        review(token, taskId, "partial")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(4).toString()));

        // History accumulates.
        mockMvc.perform(get(BASE + "/" + taskId).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviews.length()").value(3));
    }

    @Test
    @DisplayName("FORGOT resets to the short base interval (1 day per V1 policy)")
    void forgotUsesShortInterval() throws Exception {
        String token = registerVerifyLogin("forgot@example.com");
        LocalDate today = LocalDate.now();
        long taskId = createTask(token, """
                {"name":"Valid Anagram","url":"https://leetcode.com/problems/valid-anagram",
                 "difficulty":"medium"}""")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));

        review(token, taskId, "remember")
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(2).toString()));
        review(token, taskId, "forgot")
                .andExpect(jsonPath("$.nextReview").value(today.plusDays(1).toString()));
    }

    @Test
    @DisplayName("LeetCode URL variants parse; malformed leetcode URLs and bad links are rejected with 422")
    void urlParsing() throws Exception {
        String token = registerVerifyLogin("url@example.com");

        createTask(token, """
                {"name":"Three Sum","url":"https://www.leetcode.com/problems/3sum/description/",
                 "difficulty":"HARD"}""")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("leetcode_url"))
                .andExpect(jsonPath("$.sourceMeta").value("https://www.leetcode.com/problems/3sum/description/"));

        // Same problem again is idempotent: no duplicate in the library.
        createTask(token, """
                {"name":"Three Sum","url":"https://leetcode.com/problems/3sum/",
                 "difficulty":"HARD"}""")
                .andExpect(status().isCreated());
        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // leetcode.com URL that is not a problem URL.
        createTask(token, """
                {"name":"Bad","url":"https://leetcode.com/accounts/login/","difficulty":"EASY"}""")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Not an http(s) link.
        createTask(token, "{\"name\":\"Bad\",\"url\":\"ftp://example.com/x\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Unknown difficulty rejected.
        createTask(token, "{\"name\":\"Bad\",\"difficulty\":\"NIGHTMARE\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));

        // Missing name rejected by bean validation.
        createTask(token, "{\"name\":\"\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("Manual task without URL; update notes and schedule mode")
    void manualTaskAndUpdate() throws Exception {
        String token = registerVerifyLogin("manual@example.com");
        long taskId = createTask(token, "{\"name\":\"Custom drill\",\"difficulty\":\"EASY\",\"notes\":\"v1\"}")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.source").value("manual"))
                .andExpect(jsonPath("$.sourceMeta").isEmpty())
                .andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));

        mockMvc.perform(put(BASE + "/" + taskId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"v2\",\"scheduleMode\":\"disabled\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.notes").value("v2"))
                .andExpect(jsonPath("$.scheduleMode").value("disabled"));

        // Disabled task does not appear in the review queue.
        mockMvc.perform(get(BASE + "/today").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(put(BASE + "/" + taskId)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"scheduleMode\":\"bogus\"}"))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("Tasks are private: another user cannot see, review or delete them")
    void userIsolation() throws Exception {
        String tokenA = registerVerifyLogin("iso-a@example.com");
        String tokenB = registerVerifyLogin("iso-b@example.com");
        long taskId = createTask(tokenA, "{\"name\":\"Private\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));

        mockMvc.perform(get(BASE + "/" + taskId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("NOT_FOUND"));
        mockMvc.perform(get(BASE).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
        review(tokenB, taskId, "remember")
                .andExpect(status().isNotFound());
        mockMvc.perform(delete(BASE + "/" + taskId).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(BASE + "/" + taskId).header("Authorization", "Bearer " + tokenA))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Delete is idempotent, removes the user's relation, then the shared task")
    void deleteFlow() throws Exception {
        String token = registerVerifyLogin("delete@example.com");
        long taskId = createTask(token, "{\"name\":\"Disposable\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));

        mockMvc.perform(delete(BASE + "/" + taskId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        // Second delete is idempotent.
        mockMvc.perform(delete(BASE + "/" + taskId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNoContent());
        mockMvc.perform(get(BASE + "/" + taskId).header("Authorization", "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Unknown review status is rejected with 422")
    void invalidReviewStatus() throws Exception {
        String token = registerVerifyLogin("status@example.com");
        long taskId = createTask(token, "{\"name\":\"Status\",\"difficulty\":\"EASY\"}")
                .andExpect(status().isCreated()).andReturn()
                .getResponse().getContentAsString()
                .transform(s -> parseLong(s, "id"));
        review(token, taskId, "kinda")
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    // --- helpers ---

    private org.springframework.test.web.servlet.ResultActions createTask(String token, String json)
            throws Exception {
        return mockMvc.perform(post(BASE)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private org.springframework.test.web.servlet.ResultActions review(String token, long taskId, String status)
            throws Exception {
        return mockMvc.perform(post(BASE + "/" + taskId + "/reviews")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"status\":\"" + status + "\"}"));
    }

    private String registerVerifyLogin(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"name\":\"Task User\",\"password\":\"password123\"}"))
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
