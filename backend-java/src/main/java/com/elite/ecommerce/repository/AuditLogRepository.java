package com.elite.ecommerce.repository;

import com.elite.ecommerce.model.AuditEventType;
import com.elite.ecommerce.model.AuditLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {

    Page<AuditLog> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);

    Page<AuditLog> findByEventTypeOrderByTimestampDesc(AuditEventType type, Pageable pageable);

    Page<AuditLog> findByTimestampBetweenOrderByTimestampDesc(
            LocalDateTime from, LocalDateTime to, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.ipAddress = :ip ORDER BY a.timestamp DESC")
    List<AuditLog> findByIpAddress(@Param("ip") String ip, Pageable pageable);

    @Query("SELECT a FROM AuditLog a WHERE a.eventType = 'LOGIN_FAILURE' " +
           "AND a.ipAddress = :ip AND a.timestamp > :since")
    List<AuditLog> findRecentLoginFailures(@Param("ip") String ip,
                                            @Param("since") LocalDateTime since);

    // No DELETE — audit logs are immutable by design
    // Archival is done via database-level partitioning or a separate archive process
}
