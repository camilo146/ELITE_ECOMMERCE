package com.elite.ecommerce.event;

import com.elite.ecommerce.model.AuditEventType;
import lombok.Builder;

/**
 * Spring Application Event that triggers an immutable audit log write.
 *
 * Decouples business logic from audit persistence:
 *   - Controllers/services publish this event
 *   - AuditLogService @Async @EventListener persists it on a separate thread
 *   - If the DB write fails, it does NOT roll back the business transaction
 */
@Builder
public record AuditEvent(
        AuditEventType eventType,
        Long userId,
        String username,
        String ipAddress,
        String userAgent,
        Long targetId,
        String targetType,
        String details
) {
    /** Convenience builder for auth events (no target resource) */
    public static AuditEvent auth(AuditEventType type, Long userId, String username,
                                   String ip, String ua) {
        return new AuditEvent(type, userId, username, ip, ua, null, null, null);
    }

    /** Convenience builder for resource events */
    public static AuditEvent resource(AuditEventType type, Long userId, String username,
                                       String ip, String ua,
                                       Long targetId, String targetType, String details) {
        return new AuditEvent(type, userId, username, ip, ua, targetId, targetType, details);
    }
}
