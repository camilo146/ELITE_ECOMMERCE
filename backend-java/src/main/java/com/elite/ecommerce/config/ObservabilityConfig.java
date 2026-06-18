package com.elite.ecommerce.config;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import jakarta.annotation.PostConstruct;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;

import javax.sql.DataSource;
import java.sql.Connection;

/**
 * Registers custom business metrics and health indicators.
 *
 * Metrics exposed at /actuator/prometheus (scraped by Prometheus / Grafana Cloud).
 * Health available at /actuator/health (private port 8081 in production).
 */
@Configuration
@RequiredArgsConstructor
@Getter
public class ObservabilityConfig {

    private final MeterRegistry registry;

    // ── Business metrics ──────────────────────────────────────────────────────

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

    // ── Health indicators ─────────────────────────────────────────────────────

    @Bean("dbHealthIndicator")
    public HealthIndicator databaseHealthIndicator(DataSource dataSource) {
        return () -> {
            try (Connection conn = dataSource.getConnection()) {
                boolean valid = conn.isValid(3);
                return valid
                        ? Health.up().withDetail("database", "PostgreSQL reachable").build()
                        : Health.down().withDetail("database", "Connection invalid").build();
            } catch (Exception e) {
                return Health.down(e).withDetail("database", "Connection failed").build();
            }
        };
    }

    @Bean("redisHealthIndicator")
    public HealthIndicator redisHealthIndicator(
            org.springframework.beans.factory.ObjectProvider<StringRedisTemplate> redisProvider) {
        return () -> {
            StringRedisTemplate redis = redisProvider.getIfAvailable();
            if (redis == null) {
                return Health.up().withDetail("redis", "Not configured (using in-memory fallback)").build();
            }
            try {
                String pong = redis.getConnectionFactory()
                        .getConnection().ping();
                return "PONG".equals(pong)
                        ? Health.up().withDetail("redis", "PONG").build()
                        : Health.down().withDetail("redis", "Unexpected response: " + pong).build();
            } catch (Exception e) {
                return Health.down(e).withDetail("redis", "Connection failed").build();
            }
        };
    }
}
