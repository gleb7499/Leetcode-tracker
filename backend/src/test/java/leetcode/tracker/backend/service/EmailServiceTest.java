package leetcode.tracker.backend.service;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

@ExtendWith(OutputCaptureExtension.class)
class EmailServiceTest {

    @Test
    void fallbackModeLogsOtpWhenNoSmtpConfigured(CapturedOutput output) {
        EmailService service = new EmailService(null, "from@localhost");
        service.sendOtpCode("to@example.com", "123456", OtpPurpose.VERIFY_EMAIL);
        assert output.getOut().contains("123456");
        assert output.getOut().contains("to@example.com");
    }

    @Test
    void smtpModeSendsViaMailSender() {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        EmailService service = new EmailService(mailSender, "from@localhost");
        service.sendOtpCode("to@example.com", "654321", OtpPurpose.RESET_PASSWORD);
        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void smtpModeDoesNotLogCode(CapturedOutput output) {
        JavaMailSender mailSender = mock(JavaMailSender.class);
        EmailService service = new EmailService(mailSender, "from@localhost");
        service.sendOtpCode("to@example.com", "654321", OtpPurpose.RESET_PASSWORD);
        assert !output.getOut().contains("654321");
    }
}
