package com.elite.ecommerce.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Duration;

/**
 * Rate limiter for auth endpoints. Delegates to either Redis or in-memory
 * implementation based on what's available (auto-selected via @ConditionalOn*).
 *
 * Limits:
 *   POST /api/auth/login             → 5  attempts / 15 min per IP
 *   POST /api/auth/register          → 3  attempts / 1 hour per IP
 *   POST /api/auth/resend-verification → 3 attempts / 1 hour per IP
 */
@Component
@RequiredArgsConstructor
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private final RateLimitService rateLimitService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        if (!"POST".equals(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String ip = resolveClientIp(request);
        String path = request.getServletPath();

        boolean allowed = switch (path) {
            case "/api/auth/login" ->
                    rateLimitService.tryConsume("login:" + ip, 5, Duration.ofMinutes(15));
            case "/api/auth/register" ->
                    rateLimitService.tryConsume("register:" + ip, 3, Duration.ofHours(1));
            case "/api/auth/resend-verification" ->
                    rateLimitService.tryConsume("resend:" + ip, 3, Duration.ofHours(1));
            case "/api/auth/forgot-password" ->
                    rateLimitService.tryConsume("forgot:" + ip, 3, Duration.ofHours(1));
            case "/api/auth/reset-password" ->
                    rateLimitService.tryConsume("reset:" + ip, 5, Duration.ofHours(1));
            default -> true;
        };

        if (!allowed) {
            log.warn("Rate limit exceeded: path={} ip={}", path, ip);
            sendTooManyRequests(response);
            return;
        }

        filterChain.doFilter(request, response);
    }

    private void sendTooManyRequests(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        // Retry-After: 15 minutes in seconds
        response.setHeader("Retry-After", "900");
        response.getWriter().write("{\"error\":\"Too many requests. Please try again later.\"}");
    }

    private String resolveClientIp(HttpServletRequest request) {
        String xff = request.getHeader("X-Forwarded-For");
        if (xff != null && !xff.isBlank()) {
            return xff.split(",")[0].trim();
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return realIp.trim();
        }
        return request.getRemoteAddr();
    }
}
