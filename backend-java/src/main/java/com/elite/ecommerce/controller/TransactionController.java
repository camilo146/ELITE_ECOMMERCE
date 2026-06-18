package com.elite.ecommerce.controller;

import com.elite.ecommerce.dto.TransactionSummary;
import com.elite.ecommerce.model.Transaction;
import com.elite.ecommerce.service.TransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transactions")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class TransactionController {

    private final TransactionService service;

    @GetMapping
    public ResponseEntity<Page<Transaction>> getAllTransactions(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(defaultValue = "0")  int page,
            @RequestParam(defaultValue = "50") int size) {

        size = Math.min(size, 200);
        var pageable = PageRequest.of(page, size, Sort.by("date").descending());
        return ResponseEntity.ok(service.getAllTransactions(type, category, startDate, endDate, pageable));
    }

    @GetMapping("/summary")
    public ResponseEntity<TransactionSummary> getSummary(
            @RequestParam(required = false) String type,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate) {
        return ResponseEntity.ok(service.getSummary(type, category, startDate, endDate));
    }

    @PostMapping
    public ResponseEntity<Transaction> createTransaction(@RequestBody Transaction transaction) {
        return ResponseEntity.ok(service.createTransaction(transaction));
    }
}
