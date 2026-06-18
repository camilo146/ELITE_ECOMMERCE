package com.elite.ecommerce.security;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory JWT blacklist fallback.
 *
 * Used when Redis is not configured (local dev, single-instance deployments).
 *
 * LIMITATIONS (acceptable for dev only):
 *   - Lost on application restart — revoked tokens become valid again
 *   - Not shared across multiple instances
 *
 * Active only when NO StringRedisTemplate bean exists.
 */
@Service
@ConditionalOnMissingBean({StringRedisTemplate.class, RedisTokenBlacklistService.class})
public class InMemoryTokenBlacklistService implements TokenBlacklistService {

    private static final Logger log = LoggerFactory.getLogger(InMemoryTokenBlacklistService.class);

    private final Map<String, Instant> blacklist = new ConcurrentHashMap<>();

    public InMemoryTokenBlacklistService() {
        log.warn("JWT blacklist: using IN-MEMORY backend. " +
                 "Revocations will be lost on restart. " +
                 "Configure Redis for production deployments.");
    }

    @Override
    public void blacklist(String jti, Instant expiresAt) {
        blacklist.put(jti, expiresAt);
    }

    @Override
    public boolean isBlacklisted(String jti) {
        Instant expiresAt = blacklist.get(jti);
        if (expiresAt == null) return false;
        if (Instant.now().isAfter(expiresAt)) {
            blacklist.remove(jti);
            return false;
        }
        return true;
    }

    @Scheduled(fixedDelay = 300_000)
    public void purgeExpired() {
        Instant now = Instant.now();
        int before = blacklist.size();
        blacklist.entrySet().removeIf(e -> now.isAfter(e.getValue()));
        int removed = before - blacklist.size();
        if (removed > 0) log.debug("Purged {} expired blacklist entries", removed);
    }
}
