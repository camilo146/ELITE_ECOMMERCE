package com.elite.ecommerce.security;

import java.time.Instant;

/**
 * Contract for JWT revocation. Two implementations exist:
 *   - RedisTokenBlacklistService  (active when Redis is configured)
 *   - InMemoryTokenBlacklistService (fallback for dev/single-instance)
 */
public interface TokenBlacklistService {

    /**
     * Permanently revoke a token by its JTI.
     * The entry is retained until the token's natural expiry, then discarded.
     *
     * @param jti       JWT ID claim (unique per token)
     * @param expiresAt token expiry instant — used to set TTL so storage doesn't grow unbounded
     */
    void blacklist(String jti, Instant expiresAt);

    /**
     * Returns true if the JTI has been explicitly revoked.
     */
    boolean isBlacklisted(String jti);
}
