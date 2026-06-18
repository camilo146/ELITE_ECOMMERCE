package com.elite.ecommerce.repository;

import com.elite.ecommerce.model.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    Optional<RefreshToken> findByTokenHash(String tokenHash);

    List<RefreshToken> findByUserIdOrderByCreatedAtDesc(Long userId);

    @Query("SELECT t FROM RefreshToken t WHERE t.user.id = :userId AND t.revoked = false AND t.expiresAt > :now")
    List<RefreshToken> findActiveByUserId(@Param("userId") Long userId, @Param("now") LocalDateTime now);

    @Modifying
    @Query("UPDATE RefreshToken t SET t.revoked = true WHERE t.user.id = :userId AND t.revoked = false")
    void revokeAllByUserId(@Param("userId") Long userId);

    /** Cleanup — delete expired AND revoked tokens older than the given threshold */
    @Modifying
    @Query("DELETE FROM RefreshToken t WHERE t.expiresAt < :threshold OR (t.revoked = true AND t.createdAt < :threshold)")
    void deleteExpiredAndRevoked(@Param("threshold") LocalDateTime threshold);
}
