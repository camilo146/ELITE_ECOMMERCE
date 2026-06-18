-- ============================================================
-- V1 — Initial schema
-- Run once on first deployment. Establishes ALL tables from scratch.
-- Never modify this file after it has been applied to any environment.
-- ============================================================

-- ── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE users (
    id                         BIGSERIAL PRIMARY KEY,
    username                   VARCHAR(50)  NOT NULL UNIQUE,
    email                      VARCHAR(255) NOT NULL UNIQUE,
    password                   VARCHAR(255) NOT NULL,
    phone                      VARCHAR(20),
    role                       VARCHAR(20)  NOT NULL DEFAULT 'USER',
    failed_login_attempts      INT          NOT NULL DEFAULT 0,
    locked_until               TIMESTAMP,
    email_verified             BOOLEAN      NOT NULL DEFAULT TRUE,
    verification_token_hash    VARCHAR(64),
    verification_token_expiry  TIMESTAMP,
    password_reset_token_hash  VARCHAR(64),
    password_reset_token_expiry TIMESTAMP
);

CREATE INDEX idx_users_email    ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_ver_hash ON users(verification_token_hash) WHERE verification_token_hash IS NOT NULL;
CREATE INDEX idx_users_rst_hash ON users(password_reset_token_hash) WHERE password_reset_token_hash IS NOT NULL;

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE products (
    id             BIGSERIAL PRIMARY KEY,
    name           VARCHAR(255) NOT NULL,
    description    TEXT,
    price          DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    original_price DOUBLE PRECISION,
    sale_price     DOUBLE PRECISION,
    on_sale        BOOLEAN DEFAULT FALSE,
    brand          VARCHAR(100),
    gender         VARCHAR(20),
    material       VARCHAR(255),
    featured       BOOLEAN DEFAULT FALSE,
    is_new         BOOLEAN DEFAULT FALSE,
    category       VARCHAR(50)  NOT NULL,
    stock          INT CHECK (stock >= 0),
    status         VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE'
);

CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_status   ON products(status);
CREATE INDEX idx_products_featured ON products(featured) WHERE featured = TRUE;

CREATE TABLE product_images (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url  VARCHAR(1000)
);

CREATE TABLE product_sizes (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    size_name  VARCHAR(20)
);

CREATE TABLE product_colors (
    product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    color_name VARCHAR(50)
);

-- ── Orders ────────────────────────────────────────────────────────────────────
CREATE TABLE orders (
    id             BIGSERIAL PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES users(id),
    total_amount   DOUBLE PRECISION NOT NULL CHECK (total_amount >= 0),
    full_name      VARCHAR(100),
    phone          VARCHAR(20),
    address        VARCHAR(255),
    city           VARCHAR(100),
    state          VARCHAR(100),
    zip_code       VARCHAR(20),
    country        VARCHAR(100),
    payment_method VARCHAR(50),
    payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    order_status   VARCHAR(30) NOT NULL DEFAULT 'PROCESSING',
    created_at     TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status  ON orders(order_status);
CREATE INDEX idx_orders_payment ON orders(payment_status);
CREATE INDEX idx_orders_created ON orders(created_at DESC);

CREATE TABLE order_items (
    id         BIGSERIAL PRIMARY KEY,
    order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id BIGINT NOT NULL REFERENCES products(id),
    quantity   INT    NOT NULL CHECK (quantity > 0),
    price      DOUBLE PRECISION NOT NULL CHECK (price >= 0),
    size       VARCHAR(20),
    color      VARCHAR(50)
);

CREATE INDEX idx_order_items_order   ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id);

-- ── Transactions (financial ledger) ──────────────────────────────────────────
CREATE TABLE transactions (
    id           BIGSERIAL PRIMARY KEY,
    type         VARCHAR(20) NOT NULL,
    amount       DOUBLE PRECISION NOT NULL,
    category     VARCHAR(100) NOT NULL,
    description  VARCHAR(500),
    reference_id VARCHAR(100),
    date         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(date DESC);

-- ── Refresh tokens ────────────────────────────────────────────────────────────
CREATE TABLE refresh_tokens (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash   VARCHAR(64)  NOT NULL UNIQUE,
    expires_at   TIMESTAMP    NOT NULL,
    revoked      BOOLEAN      NOT NULL DEFAULT FALSE,
    device_info  VARCHAR(512),
    ip_address   VARCHAR(45),
    created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP
);

CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_rt_user_id    ON refresh_tokens(user_id);
CREATE INDEX idx_rt_expires    ON refresh_tokens(expires_at) WHERE revoked = FALSE;

-- ── Audit logs (immutable — no UPDATE or DELETE ever) ─────────────────────────
CREATE TABLE audit_logs (
    id          BIGSERIAL PRIMARY KEY,
    event_type  VARCHAR(50)  NOT NULL,
    user_id     BIGINT,
    username    VARCHAR(100),
    ip_address  VARCHAR(45),
    user_agent  VARCHAR(512),
    target_id   BIGINT,
    target_type VARCHAR(30),
    details     TEXT,
    timestamp   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Write-only table: revoke DELETE and UPDATE from app DB user in production
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
-- (Applied by DBA post-deploy, not in migration)

CREATE INDEX idx_audit_user      ON audit_logs(user_id);
CREATE INDEX idx_audit_type      ON audit_logs(event_type);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_target    ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_ip        ON audit_logs(ip_address);
