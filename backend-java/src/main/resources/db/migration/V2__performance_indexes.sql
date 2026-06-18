-- ============================================================
-- V2 — Performance indexes for high-traffic query paths
-- ============================================================

-- Composite index for admin order dashboard (filter by status + date)
CREATE INDEX idx_orders_status_created
    ON orders(order_status, created_at DESC);

-- Partial index: pending payment orders (frequently polled)
CREATE INDEX idx_orders_pending_payment
    ON orders(payment_status, created_at DESC)
    WHERE payment_status = 'PENDING';

-- Product search by price range
CREATE INDEX idx_products_price
    ON products(price);

-- Audit log range queries (compliance reports)
CREATE INDEX idx_audit_user_timestamp
    ON audit_logs(user_id, timestamp DESC)
    WHERE user_id IS NOT NULL;

-- Refresh token cleanup query
CREATE INDEX idx_rt_cleanup
    ON refresh_tokens(expires_at, revoked)
    WHERE revoked = TRUE;
