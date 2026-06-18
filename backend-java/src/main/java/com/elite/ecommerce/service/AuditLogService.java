package com.elite.ecommerce.service;

import com.elite.ecommerce.event.AuditEvent;
import com.elite.ecommerce.model.AuditEventType;
import com.elite.ecommerce.model.AuditLog;
import com.elite.ecommerce.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Dual-role service:
 *
 *   1. Publisher — exposes a fire-and-forget log(...) method for controllers/services.
 *      Publishing is synchronous (cheap), the event listener runs asynchronously.
 *
 *   2. Listener — @Async @EventListener persists the event in a new transaction,
 *      completely decoupled from the caller's transaction. If the audit write fails,
 *      the business operation is NOT rolled back.
 */
@Service
@RequiredArgsConstructor
public class AuditLogService {

    private static final Logger log = LoggerFactory.getLogger(AuditLogService.class);

    private final AuditLogRepository repository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Publish an audit event. Returns immediately — persistence is async.
     */
    public void log(AuditEventType type, Long userId, String username,
                    String ip, String ua, Long targetId, String targetType, String details) {
        eventPublisher.publishEvent(new AuditEvent(type, userId, username, ip, ua, targetId, targetType, details));
    }

    public void log(AuditEventType type, Long userId, String username, String ip, String ua) {
        log(type, userId, username, ip, ua, null, null, null);
    }

    // ── Async Listener ────────────────────────────────────────────────────────

    /**
     * Persists the event to the database.
     *
     * PROPAGATION.REQUIRES_NEW: runs in its own transaction.
     *   - If the caller's transaction fails and rolls back, the audit entry is STILL saved.
     *   - Audit logs are evidence of attempts, not just successes.
     */
    @Async
    @EventListener
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void handleAuditEvent(AuditEvent event) {
        try {
            AuditLog entry = AuditLog.builder()
                    .eventType(event.eventType())
                    .userId(event.userId())
                    .username(event.username())
                    .ipAddress(event.ipAddress())
                    .userAgent(truncate(event.userAgent(), 512))
                    .targetId(event.targetId())
                    .targetType(event.targetType())
                    .details(event.details())
                    .build();

            repository.save(entry);

        } catch (Exception e) {
            // Audit failure must never propagate to the caller
            log.error("AUDIT WRITE FAILED: type={} user={} ip={}: {}",
                    event.eventType(), event.username(), event.ipAddress(), e.getMessage());
        }
    }

    // ── Query methods (admin dashboard) ──────────────────────────────────────

    public Page<AuditLog> getByUser(Long userId, Pageable pageable) {
        return repository.findByUserIdOrderByTimestampDesc(userId, pageable);
    }

    public Page<AuditLog> getByEventType(AuditEventType type, Pageable pageable) {
        return repository.findByEventTypeOrderByTimestampDesc(type, pageable);
    }

    public Page<AuditLog> getByDateRange(LocalDateTime from, LocalDateTime to, Pageable pageable) {
        return repository.findByTimestampBetweenOrderByTimestampDesc(from, to, pageable);
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
        return s.length() > max ? s.substring(0, max) : s;
    }
}
