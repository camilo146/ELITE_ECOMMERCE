package com.elite.ecommerce.controller;

import com.elite.ecommerce.dto.OrderRequestDTO;
import com.elite.ecommerce.model.AuditEventType;
import com.elite.ecommerce.model.Order;
import com.elite.ecommerce.model.User;
import com.elite.ecommerce.service.AuditLogService;
import com.elite.ecommerce.service.OrderService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService service;
    private final AuditLogService auditLogService;

    @PostMapping
    public ResponseEntity<Order> createOrder(
            @Valid @RequestBody OrderRequestDTO dto,
            Authentication authentication,
            HttpServletRequest req) {

        Order order = service.createOrder(dto, authentication.getName());

        User user = (User) authentication.getPrincipal();
        auditLogService.log(
                AuditEventType.ORDER_CREATED,
                user.getId(), user.getUsername(),
                resolveIp(req), req.getHeader("User-Agent"),
                order.getId(), "ORDER",
                "{\"total\":" + order.getTotalAmount() + ",\"method\":\"" + order.getPaymentMethod() + "\"}"
        );

        return ResponseEntity.ok(order);
    }

    @GetMapping("/myorders")
    public ResponseEntity<List<Order>> getMyOrders(Authentication authentication) {
        return ResponseEntity.ok(service.getUserOrders(authentication.getName()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Order> getOrderById(
            @PathVariable Long id,
            Authentication authentication) {
        return ResponseEntity.ok(service.getOrderById(id, authentication.getName()));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<Order>> getAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        size = Math.min(size, 100); // cap page size
        return ResponseEntity.ok(service.getAllOrders(
                PageRequest.of(page, size, Sort.by("createdAt").descending())));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Order> updateOrderStatus(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication authentication,
            HttpServletRequest req) {

        String status = body.get("status");
        if (status == null || status.isBlank()) return ResponseEntity.badRequest().build();

        Order updated = service.updateOrderStatus(id, status);

        User admin = (User) authentication.getPrincipal();
        auditLogService.log(
                AuditEventType.ORDER_STATUS_CHANGED,
                admin.getId(), admin.getUsername(),
                resolveIp(req), req.getHeader("User-Agent"),
                id, "ORDER",
                "{\"newStatus\":\"" + status + "\"}"
        );

        return ResponseEntity.ok(updated);
    }

    private String resolveIp(HttpServletRequest req) {
        String xff = req.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) return xff.split(",")[0].trim();
        return req.getRemoteAddr();
    }
}
