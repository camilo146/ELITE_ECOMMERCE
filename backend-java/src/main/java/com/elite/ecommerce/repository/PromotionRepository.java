package com.elite.ecommerce.repository;

import com.elite.ecommerce.model.Promotion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    @Query("""
        SELECT p FROM Promotion p
        WHERE p.active = true
          AND (p.startDate IS NULL OR p.startDate <= :now)
          AND (p.endDate IS NULL OR p.endDate >= :now)
        ORDER BY p.createdAt DESC
    """)
    List<Promotion> findAllActive(LocalDateTime now);

    @Query("""
        SELECT p FROM Promotion p
        WHERE p.active = true
          AND p.showInPopup = true
          AND (p.startDate IS NULL OR p.startDate <= :now)
          AND (p.endDate IS NULL OR p.endDate >= :now)
        ORDER BY p.createdAt DESC
    """)
    List<Promotion> findActivePopup(LocalDateTime now);

    @Query("""
        SELECT p FROM Promotion p
        WHERE p.active = true
          AND p.showInBanner = true
          AND (p.startDate IS NULL OR p.startDate <= :now)
          AND (p.endDate IS NULL OR p.endDate >= :now)
        ORDER BY p.createdAt DESC
    """)
    List<Promotion> findActiveBanner(LocalDateTime now);
}
