package com.elite.ecommerce.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Redis-backed JWT blacklist.
 *
 * Keys: "jwt:bl:<jti>"  →  "1"  (with TTL = remaining token lifetime)
 *
 * Survives application restarts. Scales across multiple instances.
 * Entries auto-expire via Redis TTL — no cleanup job needed.
 *
 * Active only when a StringRedisTemplate bean is available
 * (i.e., when spring.data.redis.host is configured).
 */
@Service
@ConditionalOnProperty(name = "spring.data.redis.host")
public class RedisTokenBlacklistService implements TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(RedisTokenBlacklistService.class);
    private static final String PREFIX = "jwt:bl:";

    private final StringRedisTemplate redis;

    public RedisTokenBlacklistService(StringRedisTemplate redis) {
        this.redis = redis;
        log.info("JWT blacklist: using Redis backend");
    }

    @Override
    public void blacklist(String jti, Instant expiresAt) {
        Duration ttl = Duration.between(Instant.now(), expiresAt);
        if (ttl.isNegative() || ttl.isZero()) return; // Already expired — nothing to store

        try {
            redis.opsForValue().set(PREFIX + jti, "1", ttl);
        } catch (Exception e) {
            // Redis unavailable — log but don't fail the logout request
            log.error("Redis blacklist write failed for jti={}: {}", jti, e.getMessage());
        }
    }

    @Override
    public boolean isBlacklisted(String jti) {
        try {
            return Boolean.TRUE.equals(redis.hasKey(PREFIX + jti));
        } catch (Exception e) {
            // Redis unavailable — fail open (don't block all requests)
            // Log at warn level so ops teams can detect the outage
            log.warn("Redis blacklist read failed for jti={}: {}", jti, e.getMessage());
            return false;
        }
    }
}
