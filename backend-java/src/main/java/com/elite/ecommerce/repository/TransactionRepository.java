package com.elite.ecommerce.repository;

import com.elite.ecommerce.model.Transaction;
import com.elite.ecommerce.model.TransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    // Database-side filtering instead of loading all into heap
    @Query("SELECT t FROM Transaction t WHERE " +
           "(:type IS NULL OR t.type = :type) AND " +
           "(:category IS NULL OR LOWER(t.category) = LOWER(:category)) AND " +
           "(:start IS NULL OR t.date >= :start) AND " +
           "(:end IS NULL OR t.date <= :end) " +
           "ORDER BY t.date DESC")
    Page<Transaction> findFiltered(
            @Param("type") TransactionType type,
            @Param("category") String category,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end,
            Pageable pageable);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = 'INCOME' AND " +
           "(:start IS NULL OR t.date >= :start) AND (:end IS NULL OR t.date <= :end)")
    double sumIncome(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM Transaction t WHERE t.type = 'EXPENSE' AND " +
           "(:start IS NULL OR t.date >= :start) AND (:end IS NULL OR t.date <= :end)")
    double sumExpense(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);
}
