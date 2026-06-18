package com.elite.ecommerce.controller;

import com.elite.ecommerce.model.Order;
import com.elite.ecommerce.repository.OrderRepository;
import com.elite.ecommerce.repository.UserRepository;
import com.elite.ecommerce.service.PaymentService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private static final Logger log = LoggerFactory.getLogger(PaymentController.class);

    private final PaymentService paymentService;
    private final OrderRepository orderRepository;
    private final UserRepository userRepository;

    @Value("${mp.webhook.secret}")
    private String webhookSecret;

    /**
     * Creates a MercadoPago payment preference.
     * Ownership check: only the order's owner can initiate payment.
     */
    @PostMapping("/create-preference/{orderId}")
    @Transactional(readOnly = true)
    public ResponseEntity<?> createPreference(
            @PathVariable Long orderId,
            Authentication authentication) {

        Order order = orderRepository.findByIdWithItems(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found: " + orderId));

        // ── IDOR fix: verify the authenticated user owns this order ────────
        String currentUsername = authentication.getName();
        if (!order.getUser().getUsername().equals(currentUsername)) {
            // Return 404 instead of 403 to avoid leaking order existence to other users
            return ResponseEntity.notFound().build();
        }

        try {
            String initPoint = paymentService.createPreference(order);
            if (initPoint == null) {
                return ResponseEntity.internalServerError()
                        .body(Map.of("error", "Could not create payment preference"));
            }
            return ResponseEntity.ok(Map.of("initPoint", initPoint));
        } catch (Exception e) {
            log.error("Error creating MP preference for order={}", orderId, e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Payment service error"));
        }
    }

    /**
     * MercadoPago IPN / webhook endpoint.
     * Verifies the x-signature HMAC before processing any payment event.
     */
    @PostMapping("/notifications")
    public ResponseEntity<Void> handleNotification(
            HttpServletRequest request,
            @RequestParam(required = false) String topic,
            @RequestParam(required = false) String id,
            @RequestBody(required = false) Map<String, Object> body) {

        // ── CRIT-03 fix: verify webhook authenticity ───────────────────────
        if (!verifyWebhookSignature(request, id)) {
            log.warn("Rejected MP webhook with invalid signature from IP={}",
                    request.getRemoteAddr());
            // Return 200 to avoid MP retrying with real signatures
            return ResponseEntity.ok().build();
        }

        String paymentId = null;

        if ("payment".equals(topic) && id != null) {
            paymentId = id;
        } else if (body != null && "payment".equals(body.get("type"))) {
            @SuppressWarnings("unchecked")
            Map<String, Object> data = (Map<String, Object>) body.get("data");
            if (data != null && data.get("id") != null) {
                paymentId = data.get("id").toString();
            }
        }

        if (paymentId != null) {
            log.info("Processing MP webhook for payment={}", paymentId);
            paymentService.processWebhook(paymentId);
        }

        return ResponseEntity.ok().build();
    }

    /**
     * Verifies the MercadoPago x-signature header.
     *
     * MP format: x-signature: ts=<timestamp>,v1=<hmac_sha256_hex>
     * Manifest:  "id:<dataId>;request-id:<x-request-id>;ts:<ts>;"
     * Algorithm: HMAC-SHA256 with the webhook secret from MP dashboard.
     *
     * See: https://www.mercadopago.com.co/developers/en/docs/your-integrations/notifications/webhooks
     */
    private boolean verifyWebhookSignature(HttpServletRequest request, String dataId) {
        String xSignature = request.getHeader("x-signature");
        String xRequestId = request.getHeader("x-request-id");

        if (xSignature == null || xSignature.isBlank()) {
            // During dev/sandbox MP may omit the signature — allow if dev webhook secret is set
            return webhookSecret.startsWith("dev-");
        }

        try {
            String ts = null;
            String v1 = null;

            for (String part : xSignature.split(",")) {
                String[] kv = part.trim().split("=", 2);
                if (kv.length == 2) {
                    if ("ts".equals(kv[0])) ts = kv[1];
                    if ("v1".equals(kv[0])) v1 = kv[1];
                }
            }

            if (ts == null || v1 == null || dataId == null) return false;

            // Validate timestamp freshness (reject replays older than 5 minutes)
            long timestamp = Long.parseLong(ts);
            long nowSeconds = System.currentTimeMillis() / 1000;
            if (Math.abs(nowSeconds - timestamp) > 300) {
                log.warn("MP webhook timestamp too old: ts={}", ts);
                return false;
            }

            // Build manifest string
            StringBuilder manifest = new StringBuilder();
            manifest.append("id:").append(dataId).append(";");
            if (xRequestId != null) manifest.append("request-id:").append(xRequestId).append(";");
            manifest.append("ts:").append(ts).append(";");

            // Compute HMAC-SHA256
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec keySpec = new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(keySpec);
            byte[] hashBytes = mac.doFinal(manifest.toString().getBytes(StandardCharsets.UTF_8));
            String expectedHmac = HexFormat.of().formatHex(hashBytes);

            // Constant-time comparison to prevent timing attacks
            return constantTimeEquals(expectedHmac, v1);

        } catch (Exception e) {
            log.error("Error verifying MP webhook signature", e);
            return false;
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }
}
