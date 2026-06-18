package com.elite.ecommerce.service;

import com.elite.ecommerce.model.AuditEventType;
import com.elite.ecommerce.model.User;
import com.elite.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HexFormat;

import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.GONE;

@Service
@RequiredArgsConstructor
public class PasswordResetService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetService.class);
    private static final int TOKEN_VALID_HOURS = 1;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final AuditLogService auditLogService;
    private final SecureRandom secureRandom = new SecureRandom();

    /** Inicia el flujo de restablecimiento. Siempre responde sin revelar si el email existe. */
    @Transactional
    public void requestReset(String email, String ip) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            log.debug("Password reset requested for non-existent email");
            return;
        }

        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = HexFormat.of().formatHex(bytes);

        user.setPasswordResetTokenHash(hash(rawToken));
        user.setPasswordResetTokenExpiry(LocalDateTime.now().plusHours(TOKEN_VALID_HOURS));
        userRepository.save(user);

        emailService.sendPasswordReset(user.getEmail(), user.getUsername(), rawToken);
        auditLogService.log(AuditEventType.PASSWORD_CHANGED, user.getId(),
                user.getUsername(), ip, null, null, null, "{\"event\":\"reset_requested\"}");
    }

    /** Valida el token y actualiza la contraseña. */
    @Transactional
    public void resetPassword(String rawToken, String newPassword, String ip) {
        String tokenHash = hash(rawToken);
        User user = userRepository.findByPasswordResetTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid reset token"));

        if (user.isPasswordResetTokenExpired()) {
            user.clearPasswordResetToken();
            userRepository.save(user);
            throw new ResponseStatusException(GONE, "Reset token has expired");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new ResponseStatusException(BAD_REQUEST,
                    "New password must be different from the current one");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.clearPasswordResetToken();
        user.resetFailedAttempts();
        userRepository.save(user);

        auditLogService.log(AuditEventType.PASSWORD_CHANGED, user.getId(),
                user.getUsername(), ip, null, null, null, "{\"event\":\"reset_completed\"}");
        log.info("Password reset completed for user id={}", user.getId());
    }

    private String hash(String raw) {
        try {
            byte[] hashBytes = MessageDigest.getInstance("SHA-256")
                    .digest(raw.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 unavailable", e);
        }
    }
}
