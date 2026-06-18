package com.elite.ecommerce.model;

public enum AuditEventType {

    // ── Authentication ────────────────────────────────────────────────────────
    LOGIN_SUCCESS,
    LOGIN_FAILURE,
    LOGIN_LOCKED,
    LOGOUT,
    LOGOUT_ALL_DEVICES,
    TOKEN_REFRESHED,
    REGISTER,
    EMAIL_VERIFIED,
    EMAIL_VERIFICATION_RESENT,
    PASSWORD_CHANGED,

    // ── User management ───────────────────────────────────────────────────────
    USER_PROFILE_UPDATED,
    USER_ROLE_CHANGED,
    USER_DELETED,

    // ── Product (ADMIN) ───────────────────────────────────────────────────────
    PRODUCT_CREATED,
    PRODUCT_UPDATED,
    PRODUCT_DELETED,

    // ── Orders ────────────────────────────────────────────────────────────────
    ORDER_CREATED,
    ORDER_STATUS_CHANGED,
    ORDER_CANCELLED,

    // ── Payments ──────────────────────────────────────────────────────────────
    PAYMENT_PREFERENCE_CREATED,
    PAYMENT_CONFIRMED,
    PAYMENT_REJECTED,
    WEBHOOK_RECEIVED,
    WEBHOOK_REJECTED,

    // ── Admin actions ─────────────────────────────────────────────────────────
    ADMIN_ACTION,
    FILE_UPLOADED,
}
