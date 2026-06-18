package com.elite.ecommerce.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Configuration;

/**
 * Registra métricas de negocio en Micrometer.
 * Los health indicators de DB y Redis los maneja Spring Boot automáticamente.
 */
@Configuration
@RequiredArgsConstructor
@Getter
public class ObservabilityConfig {

    private final MeterRegistry registry;

    private Counter loginSuccessCounter;
    private Counter loginFailureCounter;
    private Counter orderCreatedCounter;
    private Counter paymentConfirmedCounter;
    private Counter paymentRejectedCounter;
    private Counter registrationCounter;
    private Timer orderCreationTimer;

    @PostConstruct
    public void registerMetrics() {
        loginSuccessCounter = Counter.builder("elite.auth.login.success")
                .description("Successful login attempts")
                .register(registry);

        loginFailureCounter = Counter.builder("elite.auth.login.failure")
                .description("Failed login attempts")
                .register(registry);

        orderCreatedCounter = Counter.builder("elite.orders.created")
                .description("Orders created")
                .register(registry);

        paymentConfirmedCounter = Counter.builder("elite.payments.confirmed")
                .description("Payments confirmed by Mercado Pago")
                .register(registry);

        paymentRejectedCounter = Counter.builder("elite.payments.rejected")
                .description("Payments rejected by Mercado Pago")
                .register(registry);

        registrationCounter = Counter.builder("elite.auth.register")
                .description("User registrations")
                .register(registry);

        orderCreationTimer = Timer.builder("elite.orders.creation.duration")
                .description("Time to process order creation (ms)")
                .register(registry);
    }
}
