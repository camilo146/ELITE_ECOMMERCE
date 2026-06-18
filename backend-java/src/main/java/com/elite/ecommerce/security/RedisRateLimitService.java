package com.elite.ecommerce.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.List;

/**
 * Redis-backed rate limiter using an atomic Lua script.
 *
 * Uses a fixed-window counter pattern:
 *   - Key: "rl:<key>"  →  integer counter
 *   - On first request: set counter=1, set TTL=window
 *   - On subsequent requests: increment counter
 *   - Reject if counter > maxRequests
 *
 * The Lua script ensures INCR + EXPIRE are atomic — no race condition.
 *
 * Scales horizontally: all instances share the same Redis counter.
 */
@Service
@ConditionalOnBean(StringRedisTemplate.class)
public class RedisRateLimitService implements RateLimitService {

    private static final Logger log = LoggerFactory.getLogger(RedisRateLimitService.class);
    private static final String PREFIX = "rl:";

    private final StringRedisTemplate redis;

    // Atomic INCR + conditional EXPIRE — avoids race condition between the two commands
    private static final DefaultRedisScript<Long> RATE_LIMIT_SCRIPT;
    static {
        RATE_LIMIT_SCRIPT = new DefaultRedisScript<>();
        RATE_LIMIT_SCRIPT.setResultType(Long.class);
        RATE_LIMIT_SCRIPT.setScriptText(
            "local count = redis.call('INCR', KEYS[1]) " +
            "if count == 1 then " +
            "  redis.call('EXPIRE', KEYS[1], ARGV[1]) " +
            "end " +
            "return count"
        );
    }

    public RedisRateLimitService(StringRedisTemplate redis) {
        this.redis = redis;
        log.info("Rate limiter: using Redis backend (distributed)");
    }

    @Override
    public boolean tryConsume(String key, int maxRequests, Duration window) {
        String redisKey = PREFIX + key;
        try {
            Long count = redis.execute(
                    RATE_LIMIT_SCRIPT,
                    List.of(redisKey),
                    String.valueOf(window.getSeconds())
            );
            return count != null && count <= maxRequests;
        } catch (Exception e) {
            // Redis unavailable — fail open to avoid blocking all users
            log.warn("Redis rate limit check failed for key={}: {}", key, e.getMessage());
            return true;
        }
    }
}
