package com.elite.ecommerce.model;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User implements UserDetails {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.USER;

    // ── Account lockout ───────────────────────────────────────────────────────
    // Sin nullable=false → SQLite puede agregar estas columnas con ALTER TABLE
    @Builder.Default
    private int failedLoginAttempts = 0;

    private LocalDateTime lockedUntil;

    // ── Email verification ────────────────────────────────────────────────────
    // Sin nullable=false → compatible con ALTER TABLE en SQLite
    @Builder.Default
    private boolean emailVerified = true;

    @Column(length = 64)
    private String verificationTokenHash;

    private LocalDateTime verificationTokenExpiry;

    // ── Password reset ────────────────────────────────────────────────────────
    @Column(length = 64)
    private String passwordResetTokenHash;

    private LocalDateTime passwordResetTokenExpiry;

    // ── UserDetails contract ──────────────────────────────────────────────────

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public boolean isAccountNonExpired() { return true; }

    @Override
    public boolean isAccountNonLocked() {
        if (lockedUntil == null) return true;
        return LocalDateTime.now().isAfter(lockedUntil);
    }

    @Override
    public boolean isCredentialsNonExpired() { return true; }

    @Override
    public boolean isEnabled() { return true; }

    // ── Lockout helpers ───────────────────────────────────────────────────────

    public void incrementFailedAttempts() {
        this.failedLoginAttempts++;
        if (this.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
            this.lockedUntil = LocalDateTime.now().plusMinutes(LOCKOUT_MINUTES);
        }
    }

    public void resetFailedAttempts() {
        this.failedLoginAttempts = 0;
        this.lockedUntil = null;
    }

    // ── Email verification helpers ────────────────────────────────────────────

    public void markEmailVerified() {
        this.emailVerified = true;
        this.verificationTokenHash = null;
        this.verificationTokenExpiry = null;
    }

    public boolean isVerificationTokenExpired() {
        return verificationTokenExpiry == null || LocalDateTime.now().isAfter(verificationTokenExpiry);
    }

    // ── Password reset helpers ────────────────────────────────────────────────

    public boolean isPasswordResetTokenExpired() {
        return passwordResetTokenExpiry == null || LocalDateTime.now().isAfter(passwordResetTokenExpiry);
    }

    public void clearPasswordResetToken() {
        this.passwordResetTokenHash = null;
        this.passwordResetTokenExpiry = null;
    }
}
