package leetcode.tracker.backend;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

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
 * Statistics endpoints against a real PostgreSQL (Testcontainers):
 * summary counts, streak, difficulty/source distributions, recall quality and
 * upcoming workload, all verified against a hand-computed fixture.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Import(TestcontainersConfig.class)
class StatsIntegrationTest {

    private static final String TASKS = "/api/v1/me/tasks";
    private static final String STATS = "/api/v1/me/stats";

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
    @DisplayName("Summary metrics match a hand-computed fixture: counts, reviewed tasks, reviews, streak")
    void summaryMetrics() throws Exception {
        String token = registerVerifyLogin("stats-summary@example.com");

        // Empty library: everything zero.
        mockMvc.perform(get(STATS).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(0))
                .andExpect(jsonPath("$.activeTasks").value(0))
                .andExpect(jsonPath("$.reviewedTasks").value(0))
                .andExpect(jsonPath("$.totalReviews").value(0))
                .andExpect(jsonPath("$.streakDays").value(0));

        long easy = createTask(token, "{\"name\":\"A\",\"difficulty\":\"EASY\"}");
        long medium = createTask(token,
                "{\"name\":\"B\",\"url\":\"https://leetcode.com/problems/b/\",\"difficulty\":\"medium\"}");
        long hard = createTask(token,
                "{\"name\":\"C\",\"url\":\"https://leetcode.com/problems/c/\",\"difficulty\":\"hard\"}");
        createTask(token, "{\"name\":\"D\",\"difficulty\":\"EASY\"}");

        // One task disabled -> active = 3 of 4.
        putTask(token, hard, "{\"scheduleMode\":\"disabled\"}")
                .andExpect(status().isOk());

        // Reviews today: easy x2 (remember, forgot), medium x1 (partial). Hand-computed:
        // totalReviews=3, reviewedTasks=2, streak=1 (one day: today).
        review(token, easy, "remember");
        review(token, easy, "forgot");
        review(token, medium, "partial");

        mockMvc.perform(get(STATS).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(4))
                .andExpect(jsonPath("$.activeTasks").value(3))
                .andExpect(jsonPath("$.reviewedTasks").value(2))
                .andExpect(jsonPath("$.totalReviews").value(3))
                .andExpect(jsonPath("$.streakDays").value(1));

        // Streak is not broken by an empty today: adding one more review today keeps it 1.
        // A second REMEMBER on medium gives intervals remember=2 -> next_review +2,
        // forgot=1 on easy -> +1.
        review(token, medium, "remember");
        mockMvc.perform(get(STATS).header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalReviews").value(4))
                .andExpect(jsonPath("$.streakDays").value(1));
    }

    @Test
    @DisplayName("Difficulty distribution counts library tasks per level, zero-filled")
    void difficultyDistribution() throws Exception {
        String token = registerVerifyLogin("stats-diff@example.com");
        createTask(token, "{\"name\":\"DiffA\",\"difficulty\":\"EASY\"}");
        createTask(token, "{\"name\":\"DiffB\",\"difficulty\":\"easy\"}");
        createTask(token, "{\"name\":\"DiffC\",\"difficulty\":\"HARD\"}");

        mockMvc.perform(get(STATS + "/difficulty").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].difficulty").value("EASY"))
                .andExpect(jsonPath("$[0].count").value(2))
                .andExpect(jsonPath("$[1].difficulty").value("MEDIUM"))
                .andExpect(jsonPath("$[1].count").value(0))
                .andExpect(jsonPath("$[2].difficulty").value("HARD"))
                .andExpect(jsonPath("$[2].count").value(1));
    }

    @Test
    @DisplayName("Source distribution splits leetcode_url vs manual")
    void sourceDistribution() throws Exception {
        String token = registerVerifyLogin("stats-src@example.com");
        createTask(token, "{\"name\":\"A\",\"url\":\"https://leetcode.com/problems/a/\",\"difficulty\":\"EASY\"}");
        createTask(token, "{\"name\":\"B\",\"url\":\"https://leetcode.com/problems/b/\",\"difficulty\":\"EASY\"}");
        createTask(token, "{\"name\":\"C\",\"difficulty\":\"MEDIUM\"}");

        // Sorted by source name: leetcode_url (2), manual (1).
        mockMvc.perform(get(STATS + "/sources").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].source").value("leetcode_url"))
                .andExpect(jsonPath("$[0].count").value(2))
                .andExpect(jsonPath("$[1].source").value("manual"))
                .andExpect(jsonPath("$[1].count").value(1));
    }

    @Test
    @DisplayName("Recall quality counts outcomes across all reviews")
    void recallQuality() throws Exception {
        String token = registerVerifyLogin("stats-recall@example.com");
        long t1 = createTask(token, "{\"name\":\"A\",\"difficulty\":\"EASY\"}");
        long t2 = createTask(token, "{\"name\":\"B\",\"difficulty\":\"EASY\"}");

        // 1 forgot + 1 partial + 3 remember = 5 total.
        review(token, t1, "forgot");
        review(token, t1, "partial");
        review(token, t1, "remember");
        review(token, t2, "remember");
        review(token, t2, "remember");

        mockMvc.perform(get(STATS + "/recall").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.forgot").value(1))
                .andExpect(jsonPath("$.partial").value(1))
                .andExpect(jsonPath("$.remember").value(3))
                .andExpect(jsonPath("$.total").value(5));
    }

    @Test
    @DisplayName("Upcoming workload: per-day counts over next N days, zero-filled, disabled excluded")
    void upcomingWorkload() throws Exception {
        String token = registerVerifyLogin("stats-workload@example.com");
        LocalDate today = LocalDate.now();

        // A: remember -> due today+2. B: forgot -> due today+1. C: disabled -> excluded.
        long a = createTask(token, "{\"name\":\"A\",\"difficulty\":\"EASY\"}");
        long b = createTask(token, "{\"name\":\"B\",\"difficulty\":\"EASY\"}");
        long c = createTask(token, "{\"name\":\"C\",\"difficulty\":\"EASY\"}");
        putTask(token, c, "{\"scheduleMode\":\"disabled\"}")
                .andExpect(status().isOk());
        review(token, a, "remember");
        review(token, b, "forgot");

        // days=3: today 0, today+1 1, today+2 1.
        mockMvc.perform(get(STATS + "/workload?days=3").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].date").value(today.toString()))
                .andExpect(jsonPath("$[0].count").value(0))
                .andExpect(jsonPath("$[1].date").value(today.plusDays(1).toString()))
                .andExpect(jsonPath("$[1].count").value(1))
                .andExpect(jsonPath("$[2].date").value(today.plusDays(2).toString()))
                .andExpect(jsonPath("$[2].count").value(1));

        // Default window is 7 days, all zero after the scheduled ones.
        mockMvc.perform(get(STATS + "/workload").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7));

        // Out-of-range window rejected.
        mockMvc.perform(get(STATS + "/workload?days=0").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        mockMvc.perform(get(STATS + "/workload?days=91").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("Statistics are private: another user sees only their own numbers")
    void userIsolation() throws Exception {
        String tokenA = registerVerifyLogin("stats-iso-a@example.com");
        String tokenB = registerVerifyLogin("stats-iso-b@example.com");
        long taskA = createTask(tokenA, "{\"name\":\"A\",\"difficulty\":\"EASY\"}");
        review(tokenA, taskA, "remember");
        review(tokenA, taskA, "remember");

        mockMvc.perform(get(STATS).header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalTasks").value(0))
                .andExpect(jsonPath("$.totalReviews").value(0))
                .andExpect(jsonPath("$.streakDays").value(0));
        mockMvc.perform(get(STATS + "/recall").header("Authorization", "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(0));
    }

    // --- helpers ---

    private long createTask(String token, String json) throws Exception {
        MvcResult result = mockMvc.perform(post(TASKS)
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
    }

    private org.springframework.test.web.servlet.ResultActions putTask(String token, long taskId, String json)
            throws Exception {
        return mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .put(TASKS + "/" + taskId)
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(json));
    }

    private void review(String token, long taskId, String status) throws Exception {
        mockMvc.perform(post(TASKS + "/" + taskId + "/reviews")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"" + status + "\"}"))
                .andExpect(status().isOk());
    }

    private String registerVerifyLogin(String email) throws Exception {
        mockMvc.perform(post("/api/v1/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"name\":\"Stats User\",\"password\":\"password123\"}"))
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

    private record OtpCapture(String email, String code, OtpPurpose purpose) {
    }
}
