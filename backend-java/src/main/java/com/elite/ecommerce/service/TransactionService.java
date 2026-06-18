package com.elite.ecommerce.service;

import com.elite.ecommerce.dto.TransactionSummary;
import com.elite.ecommerce.model.Transaction;
import com.elite.ecommerce.model.TransactionType;
import com.elite.ecommerce.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository repository;

    /**
     * Database-side filtering with pagination.
     * Previous implementation loaded ALL records into JVM heap and filtered in Java
     * — that's a DoS vector and a memory bomb on large datasets.
     */
    @Transactional(readOnly = true)
    public Page<Transaction> getAllTransactions(String type, String category,
                                                String startDate, String endDate,
                                                Pageable pageable) {
        TransactionType parsedType = parseType(type);
        LocalDateTime start = parseDate(startDate, LocalTime.MIN);
        LocalDateTime end = parseDate(endDate, LocalTime.MAX);
        return repository.findFiltered(parsedType, category, start, end, pageable);
    }

    @Transactional
    public Transaction createTransaction(Transaction transaction) {
        return repository.save(transaction);
    }

    @Transactional(readOnly = true)
    public TransactionSummary getSummary(String type, String category,
                                          String startDate, String endDate) {
        LocalDateTime start = parseDate(startDate, LocalTime.MIN);
        LocalDateTime end = parseDate(endDate, LocalTime.MAX);

        // Aggregate queries in the database — not in Java
        double totalIncome = repository.sumIncome(start, end);
        double totalExpenses = repository.sumExpense(start, end);
        double netProfit = totalIncome - totalExpenses;
        double profitMargin = totalIncome > 0 ? (netProfit / totalIncome) * 100 : 0;

        return TransactionSummary.builder()
                .totalIncome(totalIncome)
                .totalExpenses(totalExpenses)
                .netProfit(netProfit)
                .profitMargin(Math.round(profitMargin * 100.0) / 100.0)
                .build();
    }

    private TransactionType parseType(String type) {
        if (type == null || type.isBlank()) return null;
        try { return TransactionType.valueOf(type.toUpperCase()); }
        catch (IllegalArgumentException e) { return null; }
    }

    private LocalDateTime parseDate(String date, LocalTime time) {
        if (date == null || date.isBlank()) return null;
        try { return LocalDate.parse(date).atTime(time); }
        catch (Exception e) { return null; }
    }
}
