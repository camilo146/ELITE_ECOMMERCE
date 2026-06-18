package com.elite.ecommerce.security;

import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.Refill;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory rate limiter using Bucket4j.
 *
 * Fallback for dev / single-instance environments without Redis.
 * NOT shared across multiple instances.
 */
@Service
@ConditionalOnMissingBean({StringRedisTemplate.class, RedisRateLimitService.class})
public class InMemoryRateLimitService implements RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(InMemoryRateLimitService.class);

    // key → Bucket (keyed on "prefix:ip")
    private final Map<String, Bucket> buckets = new ConcurrentHashMap<>();

    public InMemoryRateLimitService() {
        log.warn("Rate limiter: using IN-MEMORY backend. " +
                 "Limits are not shared across instances. " +
                 "Configure Redis for production.");
    }

    @Override
    public boolean tryConsume(String key, int maxRequests, Duration window) {
        Bucket bucket = buckets.computeIfAbsent(key, k -> {
            Bandwidth limit = Bandwidth.classic(maxRequests, Refill.intervally(maxRequests, window));
            return Bucket.builder().addLimit(limit).build();
        });
        return bucket.tryConsume(1);
    }
}
