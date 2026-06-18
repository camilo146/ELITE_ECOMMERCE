package com.elite.ecommerce.security;

import java.time.Duration;

/**
 * Sliding-window rate limiter contract.
 * Two implementations: Redis (distributed) and in-memory (dev fallback).
 */
public interface RateLimitService {

    /**
     * Attempt to consume one token from the bucket identified by {@code key}.
     *
     * @param key        unique identifier (e.g. "login:192.168.1.1")
     * @param maxRequests maximum requests allowed in the window
     * @param window      time window duration
     * @return true if the request is allowed, false if the limit is exceeded
     */
    boolean tryConsume(String key, int maxRequests, Duration window);
}
