package com.elite.ecommerce.service;

import com.elite.ecommerce.model.RefreshToken;
import com.elite.ecommerce.model.User;
import com.elite.ecommerce.repository.RefreshTokenRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.HexFormat;
import java.util.List;

import static org.springframework.http.HttpStatus.UNAUTHORIZED;

@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenService.class);
    public static final String REFRESH_COOKIE_NAME = "refresh_token";

    @Value("${jwt.refresh-expiration}")
    private long refreshExpirationMs;

    private final RefreshTokenRepository repository;
    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Issue a new refresh token for the user.
     * Returns the raw (unhashed) token — stored only once, never persisted.
     */
    @Transactional
    public String create(User user, String deviceInfo, String ipAddress) {
        // 32 bytes = 256 bits of entropy
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        String rawToken = HexFormat.of().formatHex(bytes);

        RefreshToken token = RefreshToken.builder()
                .user(user)
                .tokenHash(hash(rawToken))
                .expiresAt(LocalDateTime.now().plus(refreshExpirationMs, ChronoUnit.MILLIS))
                .deviceInfo(truncate(deviceInfo, 512))
                .ipAddress(truncate(ipAddress, 45))
                .build();

        repository.save(token);
        return rawToken;
    }

    /**
     * Validates the raw refresh token. Throws 401 if invalid/expired/revoked.
     * Updates lastUsedAt for session tracking.
     */
    @Transactional
    public RefreshToken validate(String rawToken) {
        RefreshToken token = repository.findByTokenHash(hash(rawToken))
                .orElseThrow(() -> new ResponseStatusException(UNAUTHORIZED, "Invalid refresh token"));

        if (token.isRevoked()) {
            // Possible token theft — revoke all sessions for this user
            log.warn("Revoked refresh token reuse detected for user id={}. Revoking all sessions.",
                    token.getUser().getId());
            repository.revokeAllByUserId(token.getUser().getId());
            throw new ResponseStatusException(UNAUTHORIZED, "Session has been invalidated");
        }

        if (token.isExpired()) {
            throw new ResponseStatusException(UNAUTHORIZED, "Refresh token has expired");
        }

        token.setLastUsedAt(LocalDateTime.now());
        repository.save(token);
        return token;
    }

    /**
     * Rotates a refresh token: revokes the old one and issues a new one.
     * OWASP requirement: refresh tokens must be single-use.
     */
    @Transactional
    public String rotate(String oldRawToken, String deviceInfo, String ipAddress) {
        RefreshToken oldToken = validate(oldRawToken);
        oldToken.setRevoked(true);
        repository.save(oldToken);

        return create(oldToken.getUser(), deviceInfo, ipAddress);
    }

    /**
     * Revoke a specific token (logout from one device).
     */
    @Transactional
    public void revoke(String rawToken) {
        repository.findByTokenHash(hash(rawToken)).ifPresent(t -> {
            t.setRevoked(true);
            repository.save(t);
        });
    }

    /**
     * Revoke all tokens for a user (logout from all devices).
     */
    @Transactional
    public void revokeAll(Long userId) {
        repository.revokeAllByUserId(userId);
        log.info("Revoked all refresh tokens for user id={}", userId);
    }

    /**
     * Returns active sessions for a user (for security dashboard display).
     */
    public List<RefreshToken> getActiveSessions(Long userId) {
        return repository.findActiveByUserId(userId, LocalDateTime.now());
    }

    /**
     * Nightly cleanup of expired and revoked tokens.
     */
    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void cleanupExpiredTokens() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(1);
        repository.deleteExpiredAndRevoked(threshold);
        log.info("Cleaned up expired/revoked refresh tokens");
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    private String hash(String rawToken) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashBytes = digest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashBytes);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 not available", e);
        }
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
