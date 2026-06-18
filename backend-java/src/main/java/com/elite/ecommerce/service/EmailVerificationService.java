package com.elite.ecommerce.service;

import com.elite.ecommerce.model.User;
import com.elite.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
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
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);

    private final UserRepository userRepository;
    private final EmailService emailService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.email-verification.token-hours:24}")
    private int tokenValidHours;

    /** Genera token, guarda el hash y envía el email de verificación. */
    @Transactional
    public void sendVerificationEmail(User user) {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = HexFormat.of().formatHex(bytes);

        user.setEmailVerified(false);
        user.setVerificationTokenHash(hash(rawToken));
        user.setVerificationTokenExpiry(LocalDateTime.now().plusHours(tokenValidHours));
        userRepository.save(user);

        // Delegar al EmailService centralizado
        emailService.sendEmailVerification(user.getEmail(), user.getUsername(), rawToken);
    }

    /** Valida el token y marca el email como verificado. */
    @Transactional
    public void verify(String rawToken) {
        String tokenHash = hash(rawToken);
        User user = userRepository.findByVerificationTokenHash(tokenHash)
                .orElseThrow(() -> new ResponseStatusException(BAD_REQUEST, "Invalid verification token"));

        if (user.isVerificationTokenExpired()) {
            throw new ResponseStatusException(GONE, "Verification token has expired");
        }

        user.markEmailVerified();
        userRepository.save(user);
        log.info("Email verified for user id={}", user.getId());
    }

    /** Re-envía el token de verificación. */
    @Transactional
    public void resendVerification(String email) {
        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null || user.isEmailVerified()) return;
        sendVerificationEmail(user);
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
