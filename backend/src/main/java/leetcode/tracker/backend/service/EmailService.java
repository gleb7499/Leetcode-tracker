package leetcode.tracker.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends OTP emails. If no SMTP host is configured (local dev), the code is
 * written to the application log as a fallback so flows stay usable offline.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;
    private final String from;

    public EmailService(@org.springframework.lang.Nullable JavaMailSender mailSender,
            @Value("${app.mail.from}") String from) {
        this.mailSender = mailSender;
        this.from = from;
    }

    public boolean smtpEnabled() {
        return mailSender != null;
    }

    public void sendOtpCode(String email, String code, OtpPurpose purpose) {
        String subject = switch (purpose) {
            case VERIFY_EMAIL -> "Verify your LeetCode Tracker email";
            case RESET_PASSWORD -> "LeetCode Tracker password reset code";
        };
        String body = "Your " + (purpose == OtpPurpose.VERIFY_EMAIL ? "email verification" : "password reset")
                + " code is: " + code + "\nIt expires in 10 minutes.";
        if (mailSender == null) {
            log.info("EMAIL FALLBACK (no SMTP configured). To: {}, subject: {}, code: {}", email, subject, code);
            return;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject(subject);
        message.setText(body);
        mailSender.send(message);
    }
}
