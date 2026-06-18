package com.elite.ecommerce.model;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.Immutable;

import java.time.LocalDateTime;

/**
 * Immutable audit log record.
 *
 * Security guarantees:
 *   - @Immutable: Hibernate will never issue UPDATE or DELETE for this entity
 *   - All @Column fields are updatable=false
 *   - @PrePersist sets timestamp on insert — never modifiable
 *   - No Lombok @Setter (fields set only via @Builder)
 *
 * This means once written, an audit entry can only be read, never altered.
 */
@Entity
@Table(
    name = "audit_logs",
    indexes = {
        @Index(name = "idx_audit_user",      columnList = "user_id"),
        @Index(name = "idx_audit_type",      columnList = "event_type"),
        @Index(name = "idx_audit_timestamp", columnList = "timestamp"),
        @Index(name = "idx_audit_target",    columnList = "target_type,target_id")
    }
)
@Immutable
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, updatable = false, length = 50)
    private AuditEventType eventType;

    /** Null for unauthenticated events (login failures from unknown users) */
    @Column(updatable = false)
    private Long userId;

    /** Denormalized for immutability — even if username changes, the log reflects what it was */
    @Column(updatable = false, length = 100)
    private String username;

    @Column(updatable = false, length = 45)
    private String ipAddress;

    @Column(updatable = false, length = 512)
    private String userAgent;

    /** ID of the affected resource (orderId, productId, userId) */
    @Column(updatable = false)
    private Long targetId;

    /** Type of the affected resource: "ORDER", "PRODUCT", "USER", "PAYMENT" */
    @Column(updatable = false, length = 30)
    private String targetType;

    /** JSON-encoded context: status changes, amounts, role changes, etc. */
    @Column(updatable = false, columnDefinition = "TEXT")
    private String details;

    @Column(nullable = false, updatable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}
