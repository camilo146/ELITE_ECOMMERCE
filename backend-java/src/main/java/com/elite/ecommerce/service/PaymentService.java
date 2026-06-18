package com.elite.ecommerce.service;

import com.elite.ecommerce.model.Order;
import com.elite.ecommerce.model.OrderItem;
import com.mercadopago.client.payment.PaymentClient;
import com.mercadopago.client.preference.*;
import com.mercadopago.exceptions.MPApiException;
import com.mercadopago.exceptions.MPException;
import com.mercadopago.resources.payment.Payment;
import com.mercadopago.resources.preference.Preference;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PreferenceClient preferenceClient;
    private final PaymentClient paymentClient;
    private final OrderService orderService;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${app.backend.url}")
    private String backendUrl;

    @Autowired
    public PaymentService(PreferenceClient preferenceClient, PaymentClient paymentClient,
                          OrderService orderService) {
        this.preferenceClient = preferenceClient;
        this.paymentClient = paymentClient;
        this.orderService = orderService;
    }

    public String createPreference(Order order) {
        log.info("Creating MP preference for order id={}", order.getId());
        try {
            List<PreferenceItemRequest> items = new ArrayList<>();

            for (OrderItem item : order.getItems()) {
                // Use server-side price — already authoritative from OrderService
                double unitPrice = item.getPrice() != null
                        ? item.getPrice()
                        : item.getProduct().getPrice();
                int qty = item.getQuantity() != null && item.getQuantity() > 0
                        ? item.getQuantity() : 1;

                String description = buildDescription(item);
                long unitPriceInt = Math.round(unitPrice); // COP has no decimals

                PreferenceItemRequest itemRequest = PreferenceItemRequest.builder()
                        .id(String.valueOf(item.getProduct().getId()))
                        .title(item.getProduct().getName())
                        .description(description)
                        .quantity(qty)
                        .currencyId("COP")
                        .unitPrice(BigDecimal.valueOf(unitPriceInt))
                        .build();
                items.add(itemRequest);
            }

            PreferenceBackUrlsRequest backUrls = PreferenceBackUrlsRequest.builder()
                    .success(frontendUrl + "/order-confirmation")
                    .pending(frontendUrl + "/order-confirmation")
                    .failure(frontendUrl + "/order-confirmation")
                    .build();

            String[] nameParts = parseName(order);

            PreferencePayerRequest payer = PreferencePayerRequest.builder()
                    .name(nameParts[0])
                    .surname(nameParts[1])
                    // Email sent to MP — not logged
                    .email(order.getUser().getEmail())
                    .build();

            PreferencePaymentMethodsRequest paymentMethods = PreferencePaymentMethodsRequest.builder()
                    .installments(12)
                    .build();

            PreferenceRequest request = PreferenceRequest.builder()
                    .items(items)
                    .backUrls(backUrls)
                    .payer(payer)
                    .paymentMethods(paymentMethods)
                    .notificationUrl(backendUrl + "/api/payments/notifications")
                    .externalReference(String.valueOf(order.getId()))
                    .build();

            Preference preference = preferenceClient.create(request);
            log.info("MP preference created for order id={}", order.getId());
            return preference.getInitPoint();

        } catch (MPApiException e) {
            log.error("MP API error [{}] for order id={}", e.getStatusCode(), order.getId());
            return null;
        } catch (MPException e) {
            log.error("MP exception for order id={}: {}", order.getId(), e.getMessage());
            return null;
        } catch (Exception e) {
            log.error("Unexpected error creating MP preference for order id={}", order.getId(), e);
            return null;
        }
    }

    public void processWebhook(String paymentId) {
        try {
            log.info("Processing webhook for payment id={}", paymentId);
            Payment payment = paymentClient.get(Long.parseLong(paymentId));
            String externalReference = payment.getExternalReference();
            String mpStatus = payment.getStatus();

            if (externalReference == null || mpStatus == null) {
                log.warn("Webhook missing externalReference or status for payment id={}", paymentId);
                return;
            }

            Long orderId = Long.parseLong(externalReference);
            log.info("Payment id={} status={} for order id={}", paymentId, mpStatus, orderId);

            switch (mpStatus) {
                case "approved"           -> orderService.confirmPayment(orderId);
                case "rejected", "cancelled" -> orderService.rejectPayment(orderId);
                default -> log.info("Payment id={} in intermediate status: {}", paymentId, mpStatus);
            }

        } catch (MPApiException e) {
            log.error("MP API error processing webhook for payment id={}", paymentId);
        } catch (MPException e) {
            log.error("MP exception processing webhook: {}", e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error processing webhook for payment id={}", paymentId, e);
        }
    }

    private String buildDescription(OrderItem item) {
        StringBuilder sb = new StringBuilder();
        if (item.getSize() != null) sb.append("Talla: ").append(item.getSize());
        if (item.getColor() != null) {
            if (!sb.isEmpty()) sb.append(" | ");
            sb.append("Color: ").append(item.getColor());
        }
        return sb.isEmpty() ? item.getProduct().getName() : sb.toString();
    }

    private String[] parseName(Order order) {
        String fullName = order.getShippingAddress() != null
                ? order.getShippingAddress().getFullName() : null;
        if (fullName == null || fullName.isBlank()) return new String[]{"Cliente", "ELITE"};
        String[] parts = fullName.split(" ", 2);
        return new String[]{parts[0], parts.length > 1 ? parts[1] : parts[0]};
    }
}
