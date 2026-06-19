package com.elite.ecommerce.repository;

import com.elite.ecommerce.model.Order;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    // Eager-fetch items + products in one JOIN — prevents N+1 on order lists
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.user.id = :userId " +
           "ORDER BY o.createdAt DESC")
    List<Order> findByUserIdWithItems(@Param("userId") Long userId);

    // Step 1: paginated IDs only (no collection fetch = no HHH90003004 warning)
    @Query("SELECT o.id FROM Order o ORDER BY o.createdAt DESC")
    Page<Long> findAllOrderIds(Pageable pageable);

    // Step 2: full graph for those IDs (no LIMIT/OFFSET here — safe with JOIN FETCH)
    @Query("SELECT DISTINCT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.id IN :ids " +
           "ORDER BY o.createdAt DESC")
    List<Order> findAllWithItemsByIds(@Param("ids") List<Long> ids);

    // Single order with full item graph — used by payment and order detail
    @Query("SELECT o FROM Order o " +
           "LEFT JOIN FETCH o.items i " +
           "LEFT JOIN FETCH i.product " +
           "WHERE o.id = :id")
    Optional<Order> findByIdWithItems(@Param("id") Long id);

    // Legacy — kept for compat, prefer findByUserIdWithItems
    List<Order> findByUserId(Long userId);
}
