package com.elite.ecommerce.service;

import com.elite.ecommerce.dto.AddressDTO;
import com.elite.ecommerce.dto.OrderRequestDTO;
import com.elite.ecommerce.model.*;
import com.elite.ecommerce.repository.OrderRepository;
import com.elite.ecommerce.repository.ProductRepository;
import com.elite.ecommerce.repository.TransactionRepository;
import com.elite.ecommerce.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.springframework.http.HttpStatus.FORBIDDEN;
import static org.springframework.http.HttpStatus.NOT_FOUND;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final TransactionRepository transactionRepository;
    private final EmailService emailService;

    // ── Admin: cambio de estado ───────────────────────────────────────────────

    @Transactional
    public Order updateOrderStatus(Long id, String status) {
        // Carga completa (con items y user) para poder enviar el email con el detalle
        Order order = orderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        try {
            order.setOrderStatus(OrderStatus.valueOf(status.toUpperCase()));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Invalid order status: " + status);
        }
        Order saved = orderRepository.save(order);

        // Email de notificación al cliente
        emailService.sendOrderStatusChanged(saved);
        return saved;
    }

    // ── Crear pedido ──────────────────────────────────────────────────────────

    @Transactional
    public Order createOrder(OrderRequestDTO dto, String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));

        List<OrderItem> items = new ArrayList<>();
        double serverComputedTotal = 0.0;

        for (var itemDto : dto.getItems()) {
            Product product = productRepository.findByIdForUpdate(itemDto.getProductId())
                    .orElseThrow(() -> new ResponseStatusException(NOT_FOUND,
                            "Product not found: " + itemDto.getProductId()));

            if (product.getStatus() != ProductStatus.ACTIVE) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                        "Product is not available: " + product.getName());
            }
            if (product.getStock() != null && product.getStock() < itemDto.getQuantity()) {
                throw new ResponseStatusException(org.springframework.http.HttpStatus.CONFLICT,
                        "Insufficient stock for: " + product.getName());
            }

            double price = product.getPrice();
            OrderItem item = new OrderItem();
            item.setProduct(product);
            item.setQuantity(itemDto.getQuantity());
            item.setPrice(price);
            item.setSize(itemDto.getSize());
            item.setColor(itemDto.getColor());
            items.add(item);
            serverComputedTotal += price * itemDto.getQuantity();
        }

        boolean isMercadoPago = "mercadopago".equalsIgnoreCase(dto.getPaymentMethod());

        Order order = new Order();
        order.setUser(user);
        order.setTotalAmount(serverComputedTotal);
        order.setPaymentMethod(dto.getPaymentMethod());
        order.setShippingAddress(mapAddress(dto.getShippingAddress()));

        // Asignar la referencia bidireccional ANTES de agregar a la lista
        // Hibernate necesita order_id al momento del INSERT (no puede hacer UPDATE posterior con NOT NULL)
        for (OrderItem item : items) {
            item.setOrder(order);
        }
        order.setItems(items);

        if (isMercadoPago) {
            order.setOrderStatus(OrderStatus.PENDING_PAYMENT);
            order.setPaymentStatus(PaymentStatus.PENDING);
        } else {
            order.setOrderStatus(OrderStatus.PROCESSING);
            order.setPaymentStatus(PaymentStatus.PENDING);
            for (OrderItem item : items) {
                Product p = item.getProduct();
                if (p.getStock() != null) {
                    p.setStock(p.getStock() - item.getQuantity());
                    productRepository.save(p);
                }
            }
        }

        Order saved = orderRepository.save(order);
        log.info("Order #{} created for user id={} total={}", saved.getId(), user.getId(), serverComputedTotal);

        // Email de confirmación de pedido
        emailService.sendOrderCreated(saved);
        return saved;
    }

    // ── Confirmar pago (webhook MP) ───────────────────────────────────────────

    @Transactional
    public void confirmPayment(Long orderId) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found: " + orderId));

        if (order.getPaymentStatus() == PaymentStatus.APPROVED) return;

        order.setPaymentStatus(PaymentStatus.APPROVED);
        order.setOrderStatus(OrderStatus.PROCESSING);

        for (OrderItem item : order.getItems()) {
            Product product = productRepository.findByIdForUpdate(item.getProduct().getId()).orElseThrow();
            if (product.getStock() != null && product.getStock() >= item.getQuantity()) {
                product.setStock(product.getStock() - item.getQuantity());
                productRepository.save(product);
            }
        }

        orderRepository.save(order);
        log.info("Order #{} confirmed — payment approved", orderId);

        // Email de pago confirmado
        emailService.sendPaymentConfirmed(order);
    }

    // ── Rechazar pago ─────────────────────────────────────────────────────────

    @Transactional
    public void rejectPayment(Long orderId) {
        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found: " + orderId));
        order.setPaymentStatus(PaymentStatus.FAILED);
        order.setOrderStatus(OrderStatus.CANCELLED);
        orderRepository.save(order);
        log.info("Order #{} cancelled — payment rejected", orderId);

        // Email de cancelación
        emailService.sendOrderStatusChanged(order);
    }

    // ── Consultas ─────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<Order> getUserOrders(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        return orderRepository.findByUserIdWithItems(user.getId());
    }

    @Transactional(readOnly = true)
    public Page<Order> getAllOrders(Pageable pageable) {
        // Step 1: paginated IDs — avoids HHH90003004 (LIMIT applied to JOIN FETCH)
        Page<Long> idPage = orderRepository.findAllOrderIds(pageable);
        if (idPage.isEmpty()) return Page.empty(pageable);

        // Step 2: fetch full graph (items + products) for this page's IDs only
        List<Order> orders = orderRepository.findAllWithItemsByIds(idPage.getContent());
        orders.sort(Comparator.comparing(Order::getCreatedAt).reversed());

        return new PageImpl<>(orders, pageable, idPage.getTotalElements());
    }

    @Transactional(readOnly = true)
    public Order getOrderById(Long id, String username) {
        Order order = orderRepository.findByIdWithItems(id)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Order not found"));
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found"));
        if (!order.getUser().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(FORBIDDEN, "Access denied");
        }
        return order;
    }

    private Address mapAddress(AddressDTO dto) {
        return new Address(
                dto.getFullName(), dto.getPhone(), dto.getAddress(),
                dto.getCity(), dto.getState(), dto.getZipCode(), dto.getCountry()
        );
    }
}
