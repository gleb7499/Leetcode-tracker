package leetcode.tracker.backend.config;

import java.util.Properties;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Condition;
import org.springframework.context.annotation.ConditionContext;
import org.springframework.context.annotation.Conditional;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.type.AnnotatedTypeMetadata;
import org.springframework.lang.Nullable;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;

/**
 * Provides a JavaMailSender only when app.mail.host is set. Without it the
 * EmailService falls back to logging OTP codes (local dev mode).
 */
@Configuration
public class MailConfig {

    @Bean
    @Conditional(MailHostConfigured.class)
    public JavaMailSender javaMailSender(
            @Value("${app.mail.host}") String host,
            @Value("${app.mail.port:587}") int port,
            @Value("${app.mail.username:}") String username,
            @Value("${app.mail.password:}") String password) {
        JavaMailSenderImpl sender = new JavaMailSenderImpl();
        sender.setHost(host);
        sender.setPort(port);
        if (!username.isBlank()) {
            sender.setUsername(username);
        }
        if (!password.isBlank()) {
            sender.setPassword(password);
        }
        Properties props = sender.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", !username.isBlank());
        props.put("mail.smtp.starttls.enable", "true");
        props.put("mail.smtp.starttls.required", "true");
        return sender;
    }

    static class MailHostConfigured implements Condition {
        @Override
        public boolean matches(@Nullable ConditionContext context, @Nullable AnnotatedTypeMetadata metadata) {
            if (context == null) {
                return false;
            }
            String host = context.getEnvironment().getProperty("app.mail.host");
            return host != null && !host.isBlank();
        }
    }
}
