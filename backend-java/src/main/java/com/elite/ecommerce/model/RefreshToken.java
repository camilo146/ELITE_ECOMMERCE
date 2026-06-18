package com.elite.ecommerce.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Persistent refresh token entity.
 *
 * Security design:
 *   - Only the SHA-256 hash of the raw token is stored — raw token is never persisted
 *   - Each token is tied to a specific device (User-Agent) and IP
 *   - Rotation: old token is revoked when a new one is issued
 *   - Revocation: tokens can be invalidated individually (single logout) or in bulk (logout-all)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(
    name = "refresh_tokens",
    indexes = {
        @Index(name = "idx_refresh_token_hash", columnList = "token_hash", unique = true),
        @Index(name = "idx_refresh_token_user", columnList = "user_id")
    }
)
public class RefreshToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * SHA-256 hex of the raw token. Never store the raw token.
     * 64-character hex string (256-bit hash).
     */
    @Column(name = "token_hash", unique = true, nullable = false, length = 64, updatable = false)
    private String tokenHash;

    @Column(nullable = false)
    private LocalDateTime expiresAt;

    @Column(nullable = false)
    @Builder.Default
    private boolean revoked = false;

    /** Truncated User-Agent for device identification (max 512 chars) */
    @Column(length = 512)
    private String deviceInfo;

    /** IPv4 (max 15) or IPv6 (max 45) */
    @Column(length = 45)
    private String ipAddress;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime lastUsedAt;

    public boolean isExpired() {
        return LocalDateTime.now().isAfter(expiresAt);
    }

    public boolean isValid() {
        return !revoked && !isExpired();
    }
}
